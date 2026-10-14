import { expect, test } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { legalPath, legalPageFromPath, legalOutputs, legalMeta, LEGAL_PAGES, LEGAL_UPDATED } from '../../../scripts/legal.mjs'
import { buildLegalHead } from '../../../scripts/head.mjs'
import { buildSitemap } from '../../../scripts/sitemap.mjs'
import { langFromPath, pagePathIn, legalPathIn, blogPathIn, translateFullDate } from '../i18n'
import { pageMeta } from '../pageMeta'

/* ─── Endereços ───────────────────────────────────────────────────────────── */

test('as quatro páginas têm o endereço combinado, com barra final', () => {
  expect(legalPath('privacy', 'pt')).toBe('/privacidade/')
  expect(legalPath('privacy', 'en')).toBe('/en/privacy/')
  expect(legalPath('cookies', 'pt')).toBe('/cookies/')
  expect(legalPath('cookies', 'en')).toBe('/en/cookies/')
  expect(LEGAL_PAGES).toEqual(['privacy', 'cookies'])
})

test('de um endereço sabe-se a página e o idioma, com ou sem barra final', () => {
  expect(legalPageFromPath('/privacidade/')).toEqual({ page: 'privacy', lang: 'pt' })
  expect(legalPageFromPath('/privacidade')).toEqual({ page: 'privacy', lang: 'pt' })
  expect(legalPageFromPath('/en/privacy')).toEqual({ page: 'privacy', lang: 'en' })
  expect(legalPageFromPath('/cookies')).toEqual({ page: 'cookies', lang: 'pt' })
  expect(legalPageFromPath('/en/cookies/')).toEqual({ page: 'cookies', lang: 'en' })
})

/* Os pares trocados não existem: `/privacy/` não é a versão pt, nem
   `/en/privacidade/` a inglesa. */
test('endereços que não são de nenhuma página legal dão null', () => {
  for (const p of ['/', '/blog/', '/team', '/privacy/', '/en/privacidade/', '/en/cookie/', '/privacidade/x/', '/en/']) {
    expect(legalPageFromPath(p), p).toBeNull()
  }
})

test('o idioma do endereço impõe-se também nas páginas legais, como no blog', () => {
  expect(langFromPath('/privacidade/')).toBe('pt')
  expect(langFromPath('/cookies')).toBe('pt')
  expect(langFromPath('/en/privacy/')).toBe('en')
  expect(langFromPath('/en/cookies')).toBe('en')
  /* E o resto continua como estava. */
  expect(langFromPath('/blog/')).toBe('pt')
  expect(langFromPath('/en/blog/x/')).toBe('en')
  expect(langFromPath('/')).toBeNull()
  expect(langFromPath('/team')).toBeNull()
})

test('o seletor PT/EN leva a mesma política para o outro idioma', () => {
  expect(pagePathIn('/privacidade/', 'en')).toBe('/en/privacy/')
  expect(pagePathIn('/en/privacy/', 'pt')).toBe('/privacidade/')
  expect(pagePathIn('/cookies', 'en')).toBe('/en/cookies/')
  expect(pagePathIn('/en/cookies/', 'pt')).toBe('/cookies/')
  expect(legalPathIn('/blog/', 'en')).toBeNull()
  /* O blog não se perdeu. */
  expect(pagePathIn('/blog/um/', 'en')).toBe(blogPathIn('/blog/um/', 'en'))
  expect(pagePathIn('/team', 'en')).toBeNull()
})

/* O router vive no App.tsx, que não corre no Node. O que se pode prender é que
   cada endereço do `legal.mjs` tem a sua rota lá — sem rota, o HTML
   pré-renderizado aparecia e desaparecia assim que o JavaScript montasse. */
test('o router do App tem uma rota para cada endereço', () => {
  const app = fs.readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf-8')
  for (const { page, lang } of legalOutputs()) {
    const rota = legalPath(page, lang).replace(/^\/|\/$/g, '')
    expect(app, `${page}/${lang}`).toMatch(new RegExp(`path: "${rota}",\\s+element: <LegalPageRoute page="${page}" />`))
  }
})

/* ─── O que o prerender escreve ───────────────────────────────────────────── */

test('o prerender tem de escrever quatro ficheiros, nas pastas certas', () => {
  expect(legalOutputs().map(o => o.dir.join('/')).sort()).toEqual(['cookies', 'en/cookies', 'en/privacy', 'privacidade'])
  expect(legalOutputs()).toHaveLength(4)
})

/* O `prerender.mjs` corre no Node depois de um build e não se pode chamar a
   partir daqui. Prende-se o que o liga ao resto: percorre os `legalOutputs`,
   desenha cada página com o `renderLegal`, põe-lhe o `buildLegalHead` e escreve
   o ficheiro — e a verificação de que o texto não saiu vazio. */
test('o prerender.mjs escreve, para cada saída, o head e o corpo da página legal', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../../../scripts/prerender.mjs'), 'utf-8')
  expect(src).toMatch(/for \(const \{ page, lang, dir \} of legalOutputs\(\)\)/)
  expect(src).toMatch(/buildLegalHead\(\{ page, lang \}\)/)
  expect(src).toMatch(/renderLegal\(page, lang\)/)
  expect(src).toMatch(/body: corpo,/)
  expect(src).toMatch(/escrever\(dir, pagina\)/)
  expect(src).toMatch(/corpo\.length < 2000\) falhar/)
})

/* ─── <head> ──────────────────────────────────────────────────────────────── */

test('cada página tem o seu título, descrição e canónico, e o par pt/en', () => {
  const vistos = new Set<string>()
  for (const { page, lang } of legalOutputs()) {
    const head = buildLegalHead({ page, lang })
    const { title, description } = legalMeta(page, lang)
    expect(head).toContain(`<title>${title} — Muche</title>`)
    expect(head).toContain(`<meta name="description" content="${description}" />`)
    expect(head).toContain(`<link rel="canonical" href="https://www.muche.pt${legalPath(page, lang)}" />`)
    expect(head).toContain(`hreflang="pt" href="https://www.muche.pt${legalPath(page, 'pt')}"`)
    expect(head).toContain(`hreflang="en" href="https://www.muche.pt${legalPath(page, 'en')}"`)
    expect(head).toContain(`property="og:url" content="https://www.muche.pt${legalPath(page, lang)}"`)
    expect(vistos.has(title), `título repetido: ${title}`).toBe(false)
    vistos.add(title)
    expect(description.length).toBeGreaterThan(40)
  }
})

test('o título do separador, no cliente, é o do HTML pré-renderizado', () => {
  for (const { page, lang } of legalOutputs()) {
    const meta = pageMeta(legalPath(page, lang), lang)
    const head = buildLegalHead({ page, lang })
    expect(head).toContain(`<title>${meta.title}</title>`)
    expect(meta.description).toBe(legalMeta(page, lang).description)
  }
  /* E não o genérico do site. */
  expect(pageMeta('/privacidade/', 'pt').title).toBe('Política de Privacidade — Muche')
  expect(pageMeta('/en/cookies/', 'en').title).toBe('Cookie Policy — Muche')
})

/* ─── sitemap ─────────────────────────────────────────────────────────────── */

test('o sitemap lista as quatro páginas, cada uma com os dois hreflang', () => {
  const xml = buildSitemap([])
  for (const { page, lang } of legalOutputs()) {
    expect(xml).toContain(`<loc>https://www.muche.pt${legalPath(page, lang)}</loc>`)
  }
  for (const page of LEGAL_PAGES) {
    for (const l of ['pt', 'en']) {
      /* Uma vez em cada uma das duas entradas do par. */
      const n = xml.split(`hreflang="${l}" href="https://www.muche.pt${legalPath(page, l)}"`).length - 1
      expect(n, `${page}/${l}`).toBe(2)
    }
  }
})

/* ─── Data ────────────────────────────────────────────────────────────────── */

test('a data da última atualização sai por extenso, em cada idioma', () => {
  expect(LEGAL_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  expect(translateFullDate('2026-10-14', 'pt')).toBe('14 de outubro de 2026')
  expect(translateFullDate('2026-10-14', 'en')).toBe('14 October 2026')
  expect(translateFullDate('2026-03-01', 'pt')).toBe('1 de março de 2026')
  expect(translateFullDate('não é data', 'pt')).toBe('não é data')
})
