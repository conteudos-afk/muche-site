import { expect, test } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { ArticleView } from '../../app/blog/ArticleView'
import type { Post } from './types'

const post: Post = {
  slug: 'teste', lang: 'en', title: 'Um título', excerpt: 'Um excerto',
  category: 'Branding & Visual Identity', date: 'September 2026',
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
