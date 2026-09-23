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
