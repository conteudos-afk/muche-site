import { expect, test } from 'vitest'
import { fileURLToPath } from 'node:url'
import { escolherReferencias, lerArtigosMarkdown } from './referencias.mjs'

const artigo = (slug, categoria, palavras) => ({
  slug, lang: 'pt', categoria, frontmatter: {}, corpo: 'palavra '.repeat(palavras), palavras,
})

test('prefere os mais longos, que são os já expandidos', () => {
  const escolhidos = escolherReferencias([
    artigo('curto', 'Podcasts', 300),
    artigo('longo', 'Podcasts', 1500),
    artigo('medio', 'Podcasts', 800),
  ], 'Podcasts', 2)
  expect(escolhidos.map(a => a.slug)).toEqual(['longo', 'medio'])
})

test('põe a mesma categoria à frente, com o mesmo comprimento', () => {
  const escolhidos = escolherReferencias([
    artigo('outra', 'Podcasts', 1500),
    artigo('mesma', 'Web Design', 1500),
  ], 'Web Design', 1)
  expect(escolhidos[0].slug).toBe('mesma')
})

test('mas um artigo longo de outra categoria vale mais do que um curto da mesma', () => {
  const escolhidos = escolherReferencias([
    artigo('longo-outra', 'Podcasts', 1500),
    artigo('curto-mesma', 'Web Design', 300),
  ], 'Web Design', 1)
  expect(escolhidos[0].slug).toBe('longo-outra')
})

/* Os dois testes seguintes fixam o que a categoria decide, e não o valor do
   bónus: 150 palavras a menos é «comprimento parecido» e a categoria decide;
   500 palavras a menos já não é, e o comprimento manda. */
test('a mesma categoria vence um artigo de comprimento parecido, ainda que ligeiramente mais curto', () => {
  const escolhidos = escolherReferencias([
    artigo('outra-mais-longa', 'Podcasts', 1500),
    artigo('mesma-mais-curta', 'Web Design', 1350),
  ], 'Web Design', 1)
  expect(escolhidos[0].slug).toBe('mesma-mais-curta')
})

test('a mesma categoria não vence um artigo bastante mais longo', () => {
  const escolhidos = escolherReferencias([
    artigo('outra-mais-longa', 'Podcasts', 1500),
    artigo('mesma-bem-mais-curta', 'Web Design', 1000),
  ], 'Web Design', 1)
  expect(escolhidos[0].slug).toBe('outra-mais-longa')
})

test('nunca devolve o próprio artigo', () => {
  const escolhidos = escolherReferencias([
    artigo('eu-proprio', 'Podcasts', 1500),
    artigo('outro', 'Podcasts', 1400),
  ], 'Podcasts', 2, 'eu-proprio')
  expect(escolhidos.map(a => a.slug)).toEqual(['outro'])
})

test('lê os artigos reais do repositório com corpo em Markdown', () => {
  const artigos = lerArtigosMarkdown(fileURLToPath(new URL('../../content/blog', import.meta.url)), 'pt')
  expect(artigos.length).toBeGreaterThanOrEqual(14)
  expect(artigos[0].corpo).not.toContain('<p>')
  expect(artigos[0].palavras).toBeGreaterThan(100)
})
