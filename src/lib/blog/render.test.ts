import { expect, test } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { ArticleView } from '../../app/blog/ArticleView'
import type { Post } from './types'

const post: Post = {
  slug: 'teste', lang: 'en', title: 'Um título', excerpt: 'Um excerto',
  category: 'Branding & Visual Identity', date: '2026-09-29',
  readTime: '3 min read', bodyHtml: '<h2>Cabeçalho</h2><p>Parágrafo.</p>',
}

test('renderiza o artigo no servidor com o texto completo', () => {
  const html = renderToString(createElement(ArticleView, { post, lang: 'en' }))
  expect(html).toContain('Um título')
  expect(html).toContain('<h2>Cabeçalho</h2>')
  expect(html).toContain('Parágrafo.')
})

/* ─── Aviso do corpo emprestado ───────────────────────────────────────────── */

/* Condicionado a `lang === "pt"`, este aviso ficava preso: no dia em que os
   artigos fossem traduzidos, todas as páginas pt continuavam a dizer que o
   texto só existe em inglês, por baixo de texto português. Segue o
   `bodyLang`, a marca que o `withBodyFallback` põe. */
test('a página que mostra o corpo de outro idioma avisa o leitor', () => {
  const pt: Post = { ...post, lang: 'pt', bodyLang: 'en' }
  const html = renderToString(createElement(ArticleView, { post: pt, lang: 'pt' }))
  expect(html).toContain('apenas em inglês')
})

test('uma página pt com corpo próprio não leva aviso nenhum', () => {
  const pt: Post = { ...post, lang: 'pt' }
  const html = renderToString(createElement(ArticleView, { post: pt, lang: 'pt' }))
  expect(html).not.toContain('apenas em inglês')
})

/* A frase é de interface e vive no `COPY`, com os dois idiomas — não
   escrita à mão dentro do componente, e só em português. */
test('o aviso sai no idioma da página', () => {
  const en: Post = { ...post, lang: 'en', bodyLang: 'pt' }
  const html = renderToString(createElement(ArticleView, { post: en, lang: 'en' }))
  expect(html).toContain('available in English only')
})

/* ─── Estilos do corpo ────────────────────────────────────────────────────────
   O `src/styles` tira os marcadores às listas e o peso ao negrito, por isso um
   elemento que o `marked` emita sem regra no `BODY_CSS` renderiza como texto
   sem forma — foi o que aconteceu às listas. Este teste corre o `marked`
   sobre Markdown com cada construção que o gerador usa (e as que um artigo
   escrito à mão pode trazer) e exige uma regra para cada elemento que sai. */
import { parsePost } from './parsePost'

const MARKDOWN = [
  '---', 'title: "T"', 'excerpt: "E"', 'category: "C"', 'date: "2026-01-01"', 'readTime: "1 min"', '---', '',
  '## Dois', '', '### Três', '',
  'Texto com **negrito**, *itálico*, [ligação](https://exemplo.pt) e `código`.', '',
  '- **Duração.** Item de lista.', '- Outro item', '  - Sub-item', '',
  '1. Um', '2. Dois', '',
  '- Solto um', '', '- Solto dois', '',
  '> Citação', '', '---', '',
  '```', 'bloco', '```', '',
  '| A | B |', '|---|---|', '| 1 | 2 |', '',
  '![alt](x.png)',
].join('\n')

/* Estruturais ou sem aparência própria: herdam do que os rodeia. */
const SEM_REGRA_PROPRIA = new Set(['thead', 'tbody', 'tr', 'br'])

test('o BODY_CSS tem regra para todos os elementos que o marked emite', () => {
  const corpo = parsePost(MARKDOWN, 'estilos', 'pt').bodyHtml
  const emitidos = new Set([...corpo.matchAll(/<([a-z][a-z0-9]*)[\s>/]/g)].map(m => m[1]))
  const pagina = renderToString(createElement(ArticleView, { post: { ...post, bodyHtml: corpo }, lang: 'pt' }))
  const css = pagina.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? ''

  /* Garante que o Markdown de teste continua a produzir o que se quer cobrir. */
  for (const tag of ['ul', 'ol', 'li', 'strong', 'em', 'a', 'blockquote', 'h2', 'h3', 'code', 'pre', 'hr', 'table']) {
    expect(emitidos, `o marked deixou de emitir <${tag}>`).toContain(tag)
  }
  const semRegra = [...emitidos].filter(t => !SEM_REGRA_PROPRIA.has(t) && !new RegExp(`\\.blog-article-body[^{}]*\\b${t}\\b`).test(css))
  expect(semRegra).toEqual([])
})

test('a lista leva marcador próprio e o item tem ritmo próprio', () => {
  const pagina = renderToString(createElement(ArticleView, { post, lang: 'en' }))
  const css = pagina.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? ''
  expect(css).toMatch(/ul > li::before\s*{[^}]*content: ""/)
  expect(css).toMatch(/\.blog-article-body li\s*{[^}]*margin: 0 0 14px/)
})

/* O estilo vai dentro do componente: tem de estar no HTML do servidor, antes do
   corpo, para a página pré-renderizada nascer já formatada, sem JavaScript. */
test('o <style> do corpo sai no HTML do servidor, antes do texto', () => {
  const pagina = renderToString(createElement(ArticleView, { post, lang: 'en' }))
  expect(pagina.indexOf('<style>')).toBeGreaterThan(-1)
  expect(pagina.indexOf('<style>')).toBeLessThan(pagina.indexOf('class="blog-article-body"'))
})
