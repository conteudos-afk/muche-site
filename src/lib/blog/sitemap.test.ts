import { expect, test } from 'vitest'
import { buildSitemap } from '../../../scripts/sitemap.mjs'

test('inclui as duas versões de cada artigo com hreflang', () => {
  const xml = buildSitemap([{ slug: 'teste', lang: 'pt' }, { slug: 'teste', lang: 'en' }])
  expect(xml).toContain('<loc>https://www.muche.pt/blog/teste</loc>')
  expect(xml).toContain('<loc>https://www.muche.pt/en/blog/teste</loc>')
  expect(xml).toContain('hreflang="pt"')
  expect(xml).toContain('hreflang="en"')
})
