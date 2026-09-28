import { expect, test } from 'vitest'
import { loadPosts } from './loadPosts'
import path from 'path'

const DIR = path.resolve(__dirname, '../../../content/blog')

test('lê os 14 artigos em inglês e converte o corpo em HTML', () => {
  const posts = loadPosts(DIR)
  const en = posts.filter(p => p.lang === 'en')
  expect(en).toHaveLength(14)
  const p = en.find(x => x.slug === 'visual-identity-business-asset')
  expect(p).toBeDefined()
  expect(p!.title).toBe('Why visual identity is your most underrated business asset')
  expect(p!.bodyHtml).toContain('<h2>Recognition compounds over time</h2>')
})

test('os artigos em português têm título mas ainda não têm corpo', () => {
  const pt = loadPosts(DIR).filter(p => p.lang === 'pt')
  expect(pt).toHaveLength(14)
  expect(pt.every(p => p.title.length > 0)).toBe(true)
})

test('ignora pastas que comecem por underscore', () => {
  const posts = loadPosts(DIR)
  expect(posts.some(p => p.slug.startsWith('_'))).toBe(false)
})
