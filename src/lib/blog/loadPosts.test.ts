import { expect, test } from 'vitest'
import { loadPosts } from './loadPosts'
import path from 'path'

const DIR = path.resolve(__dirname, '../../../content/blog')

test('lê os artigos e converte o corpo em HTML', () => {
  const posts = loadPosts(DIR)
  const p = posts.find(x => x.slug === 'exemplo-teste' && x.lang === 'pt')
  expect(p).toBeDefined()
  expect(p!.title).toBe('Artigo de exemplo')
  expect(p!.category).toBe('Branding & Visual Identity')
  expect(p!.bodyHtml).toContain('<h2>Um cabeçalho</h2>')
  expect(p!.bodyHtml).toContain('<p>Um parágrafo.</p>')
})

test('ignora pastas que comecem por underscore', () => {
  const posts = loadPosts(DIR)
  expect(posts.some(p => p.slug.startsWith('_'))).toBe(false)
})
