import { expect, test } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { renderLegal, renderArticle, renderList, postsFor, postBySlug } from '../../entry-server'
import { legalOutputs, legalPath } from '../../../scripts/legal.mjs'
import { revealInitialState } from '../../../scripts/head.mjs'

/* ─── O HTML que o prerender escreve ─────────────────────────────────────────
   Estas páginas têm de se ler sem JavaScript: o texto está no HTML, e as
   ligações são `<a href>` a sério. */
const html = (page: 'privacy' | 'cookies', lang: 'pt' | 'en') => revealInitialState(renderLegal(page, lang))

test('cada página legal sai com o título, a data e o texto, e nada escondido', () => {
  for (const { page, lang } of legalOutputs()) {
    const h = html(page, lang)
    expect(h, `${page}/${lang}`).toMatch(/<h1[^>]*>[^<]+<\/h1>/)
    expect(h.length).toBeGreaterThan(5000)
    /* O estado inicial do `motion` esconderia o texto a quem não corre JS. */
    expect(h).not.toMatch(/opacity:0[;"]/)
    expect(h).toContain(lang === 'pt' ? 'Última atualização' : 'Last updated')
    expect(h).toContain(lang === 'pt' ? '14 de outubro de 2026' : '14 October 2026')
    expect(h).not.toContain('<iframe')
    expect(h).not.toContain('teentac.pt/"')
  }
})

test('o idioma da página é o do texto: pt em português, en em inglês', () => {
  expect(html('privacy', 'pt')).toContain('Quem é o responsável')
  expect(html('privacy', 'en')).toContain('Who is responsible')
  expect(html('cookies', 'pt')).toContain('A única ligação a um terceiro')
  expect(html('cookies', 'en')).toContain('The one link to a third party')
  expect(html('privacy', 'pt')).not.toContain('Who is responsible')
  expect(html('privacy', 'en')).not.toContain('Quem é o responsável')
})

test('a identificação do responsável está na política de privacidade, nos dois idiomas', () => {
  for (const lang of ['pt', 'en'] as const) {
    const h = html('privacy', lang)
    for (const linha of ['Muche, LDA.', 'NIPC 516400479', 'Rua do Cruzeiro, Ed. D. Afonso, Bl. 1, 2.º esquerdo', '5400-213 Chaves, Portugal', 'mailto:conteudos@muche.pt']) {
      expect(h, `${lang}: ${linha}`).toContain(linha)
    }
  }
})

/* ─── Rodapé ──────────────────────────────────────────────────────────────── */

const hrefsDoRodape = (h: string) => {
  const rodape = /<footer[\s\S]*<\/footer>/.exec(h)?.[0] ?? ''
  return [...rodape.matchAll(/href="([^"]+)"/g)].map(m => m[1])
}

test('o rodapé de cada página legal liga às duas políticas do seu idioma', () => {
  for (const { page, lang } of legalOutputs()) {
    const hrefs = hrefsDoRodape(html(page, lang))
    expect(hrefs, `${page}/${lang}`).toContain(legalPath('privacy', lang))
    expect(hrefs).toContain(legalPath('cookies', lang))
    /* Nunca à política da outra língua. */
    const outra = lang === 'pt' ? 'en' : 'pt'
    expect(hrefs).not.toContain(legalPath('privacy', outra))
    expect(hrefs).not.toContain(legalPath('cookies', outra))
  }
})

test('o blog, que não tinha rodapé, passa a ter as ligações — nas duas línguas', () => {
  for (const lang of ['pt', 'en'] as const) {
    const lista = renderList(postsFor(lang), lang)
    const { slug } = postsFor(lang)[0]
    const artigo = renderArticle(postBySlug(slug, lang)!, lang)
    for (const h of [lista, artigo]) {
      const hrefs = hrefsDoRodape(h)
      expect(hrefs).toContain(legalPath('privacy', lang))
      expect(hrefs).toContain(legalPath('cookies', lang))
    }
  }
})

test('a página inicial e as de equipa e serviços também chegam às políticas, e já não à iubenda', () => {
  const app = fs.readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf-8')
  /* O rodapé grande da página inicial. */
  expect(app).toMatch(/<LegalLinks lang=\{lang\} onNavigate=\{navigate\} \/>/)
  /* O pequeno, nas páginas que não o traziam. */
  expect(app).toMatch(/\(team\|services\)/)
  expect(app).toMatch(/rodapePequeno && <PageFooter/)
  /* As políticas antigas, na iubenda, já não são as ligadas. */
  expect(app).not.toMatch(/iubenda\.com\/privacy-policy/)
  const rodape = fs.readFileSync(path.resolve(__dirname, 'LegalFooter.tsx'), 'utf-8')
  expect(rodape).not.toMatch(/iubenda\.com\/privacy-policy/)
})
