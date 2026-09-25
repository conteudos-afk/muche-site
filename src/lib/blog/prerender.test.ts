import { expect, test } from 'vitest'
import { buildHead, buildListHead, isoDate, revealInitialState } from '../../../scripts/head.mjs'

const base = {
  title: 'Um título', excerpt: 'Um excerto', lang: 'pt' as const,
  slug: 'teste', category: 'Branding & Visual Identity', date: 'September 2026',
}

test('gera metadados próprios por artigo', () => {
  const head = buildHead({ ...base })
  expect(head).toContain('<title>Um título — Muche</title>')
  expect(head).toContain('name="description" content="Um excerto"')
  expect(head).toContain('rel="canonical" href="https://www.muche.pt/blog/teste/"')
  expect(head).toContain('hreflang="en" href="https://www.muche.pt/en/blog/teste/"')
  expect(head).toContain('"@type":"Article"')
})

/* ─── Barra final ─────────────────────────────────────────────────────────── */

/* A Cloudflare Pages serve `dist/blog/<slug>/index.html` em `/blog/<slug>/` e
   responde 308 a quem peça a forma sem barra. Um `canonical` sem barra é um
   canónico que aponta para um redirecionamento. */
test('todos os endereços declarados terminam em barra', () => {
  for (const head of [buildHead({ ...base }), buildHead({ ...base, lang: 'en' }),
                      buildListHead({ lang: 'pt' }), buildListHead({ lang: 'en' })]) {
    const enderecos = [...head.matchAll(/(?:href|content)="(https:\/\/www\.muche\.pt[^"]*)"/g)]
      .map(m => m[1])
      /* A imagem é um ficheiro, não uma página: não leva barra. */
      .filter(url => !/\.(png|jpe?g|webp|svg)$/.test(url))
    expect(enderecos.length).toBeGreaterThan(0)
    for (const url of enderecos) expect(url.endsWith('/')).toBe(true)
  }
  /* Inclui o `mainEntityOfPage` do JSON-LD, que não é `href` nem `content`. */
  expect(buildHead({ ...base })).toContain('"mainEntityOfPage":"https://www.muche.pt/blog/teste/"')
})

test('a lista do blog usa a raiz com barra, tal como as páginas', () => {
  expect(buildListHead({ lang: 'pt' })).toContain('rel="canonical" href="https://www.muche.pt/blog/"')
  expect(buildListHead({ lang: 'en' })).toContain('rel="canonical" href="https://www.muche.pt/en/blog/"')
})

/* ─── Canónico das páginas que mostram o corpo de outro idioma ────────────── */

/* Enquanto não houver corpo português, as páginas pt são duplicados da versão
   inglesa e o canónico diz isso. */
test('uma página que mostra o corpo inglês aponta o canónico para o inglês', () => {
  const head = buildHead({ ...base, lang: 'pt', bodyLang: 'en' })
  expect(head).toContain('rel="canonical" href="https://www.muche.pt/en/blog/teste/"')
  expect(head).toContain('property="og:url" content="https://www.muche.pt/en/blog/teste/"')
  expect(head).toContain('"mainEntityOfPage":"https://www.muche.pt/en/blog/teste/"')
  /* O par pt/en continua declarado: são traduções uma da outra. */
  expect(head).toContain('hreflang="pt" href="https://www.muche.pt/blog/teste/"')
  expect(head).toContain('hreflang="en" href="https://www.muche.pt/en/blog/teste/"')
})

/* A condição é o empréstimo do corpo, não o idioma: no dia em que um `pt.md`
   ganhar corpo, o `bodyLang` desaparece e a página recupera o canónico
   próprio sem ninguém lhe tocar. */
test('uma página pt com corpo próprio fica com o canónico dela', () => {
  expect(buildHead({ ...base, lang: 'pt' }))
    .toContain('rel="canonical" href="https://www.muche.pt/blog/teste/"')
})

test('a página inglesa nunca aponta o canónico para outro lado', () => {
  expect(buildHead({ ...base, lang: 'en' }))
    .toContain('rel="canonical" href="https://www.muche.pt/en/blog/teste/"')
})

/* ─── datePublished ───────────────────────────────────────────────────────── */

test('a data do frontmatter sai em ISO 8601, que é o que o schema.org exige', () => {
  expect(isoDate('July 2026')).toBe('2026-07')
  expect(isoDate('December 2025')).toBe('2025-12')
  /* Já em ISO, passa como está. */
  expect(isoDate('2026-07')).toBe('2026-07')
  expect(isoDate('2026-07-15')).toBe('2026-07-15')
  expect(buildHead({ ...base, date: 'July 2026' })).toContain('"datePublished":"2026-07"')
})

/* Um campo recomendado ausente é melhor do que um inválido: com o valor
   original lá dentro, o Google ignorava a propriedade e registava erro de
   dados estruturados na página. */
test('uma data que não parseia deixa a propriedade de fora', () => {
  expect(isoDate('brevemente')).toBeNull()
  expect(isoDate('')).toBeNull()
  expect(isoDate(undefined)).toBeNull()
  expect(buildHead({ ...base, date: 'brevemente' })).not.toContain('datePublished')
})

/* ─── Partilhas ───────────────────────────────────────────────────────────── */

test('as partilhas levam imagem e cartão, nos artigos e na lista', () => {
  for (const head of [buildHead({ ...base }), buildListHead({ lang: 'pt' })]) {
    expect(head).toContain('property="og:image" content="https://www.muche.pt/og-default.png"')
    expect(head).toContain('name="twitter:card" content="summary_large_image"')
  }
})

/* ─── Estado inicial das animações ────────────────────────────────────────── */

test('o HTML estático mostra o texto sem esperar pelo JavaScript', () => {
  const html = revealInitialState(
    '<h1 style="color:#FFAA03;opacity:0;transform:translateY(24px)">Um título</h1>' +
    '<span style="opacity:0.5;text-transform:uppercase">Meta</span>'
  )
  /* O estado inicial da animação desaparece… */
  expect(html).toContain('opacity:1;transform:none')
  /* …mas as opacidades a sério e o `text-transform` ficam como estão. */
  expect(html).toContain('opacity:0.5;text-transform:uppercase')
})

test('um título com "</script>" não parte o HTML nem o JSON-LD', () => {
  const head = buildHead({
    ...base, title: 'Fecha isto </script><img src=x onerror=alert(1)>',
  })
  /* O `</script>` não pode aparecer antes do fecho a sério do elemento. */
  const jsonld = head.slice(head.indexOf('application/ld+json'))
  expect(jsonld.indexOf('</script>')).toBe(jsonld.length - '</script>'.length)
  /* E o que lá está dentro continua a ser JSON válido, com o título intacto. */
  const cru = jsonld.slice(jsonld.indexOf('>') + 1, jsonld.lastIndexOf('</script>'))
  expect(JSON.parse(cru).headline).toBe('Fecha isto </script><img src=x onerror=alert(1)>')
})
