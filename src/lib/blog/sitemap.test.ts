import { expect, test } from 'vitest'
import { buildSitemap } from '../../../scripts/sitemap.mjs'

test('inclui as duas versões de cada artigo com hreflang', () => {
  const xml = buildSitemap([{ slug: 'teste', lang: 'pt' }, { slug: 'teste', lang: 'en' }])
  expect(xml).toContain('<loc>https://www.muche.pt/blog/teste</loc>')
  expect(xml).toContain('<loc>https://www.muche.pt/en/blog/teste</loc>')
  expect(xml).toContain('hreflang="pt"')
  expect(xml).toContain('hreflang="en"')
})

test('inclui as páginas de lista do blog, mesmo sem artigos, cada uma a apontar para a outra', () => {
  const xml = buildSitemap([])
  expect(xml).toContain('<loc>https://www.muche.pt/blog</loc>')
  expect(xml).toContain('<loc>https://www.muche.pt/en/blog</loc>')

  /* As duas entradas de lista têm de trazer os dois `hreflang` — um por
     idioma —, não só a entrada que falta na outra. */
  const ocorrenciasPt = xml.match(/hreflang="pt" href="https:\/\/www\.muche\.pt\/blog"/g) ?? []
  const ocorrenciasEn = xml.match(/hreflang="en" href="https:\/\/www\.muche\.pt\/en\/blog"/g) ?? []
  expect(ocorrenciasPt).toHaveLength(2)
  expect(ocorrenciasEn).toHaveLength(2)
})
