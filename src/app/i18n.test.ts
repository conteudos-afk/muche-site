import { expect, test } from 'vitest'
import { langFromPath, blogPathIn } from './i18n'

test('o endereço do blog impõe o idioma da página pré-renderizada', () => {
  expect(langFromPath('/blog')).toBe('pt')
  expect(langFromPath('/blog/um-artigo')).toBe('pt')
  expect(langFromPath('/en/blog')).toBe('en')
  expect(langFromPath('/en/blog/um-artigo')).toBe('en')
})

/* Fora do blog não há endereços por idioma: a escolha continua a ser a do
   visitante (localStorage) ou a do browser. */
test('fora do blog o caminho não impõe nada', () => {
  expect(langFromPath('/')).toBeNull()
  expect(langFromPath('/team')).toBeNull()
  expect(langFromPath('/blogue')).toBeNull()
  expect(langFromPath('/en')).toBeNull()
})

test('o seletor PT/EN tem para onde ir a partir de qualquer página do blog', () => {
  expect(blogPathIn('/blog/um-artigo/', 'en')).toBe('/en/blog/um-artigo/')
  expect(blogPathIn('/en/blog/um-artigo/', 'pt')).toBe('/blog/um-artigo/')
  expect(blogPathIn('/blog/', 'en')).toBe('/en/blog/')
  expect(blogPathIn('/en/blog/', 'pt')).toBe('/blog/')
  expect(blogPathIn('/team', 'en')).toBeNull()
})

/* Quem chegue pela forma sem barra — um link antigo, um endereço escrito à
   mão — sai daqui com a forma que a Cloudflare serve, e não com um endereço
   que responde 308. */
test('o seletor PT/EN sai sempre com barra final, venha o caminho como vier', () => {
  expect(blogPathIn('/blog', 'en')).toBe('/en/blog/')
  expect(blogPathIn('/en/blog', 'pt')).toBe('/blog/')
  expect(blogPathIn('/blog/um-artigo', 'en')).toBe('/en/blog/um-artigo/')
})

test('o idioma do caminho não se perde com a barra final', () => {
  expect(langFromPath('/blog/')).toBe('pt')
  expect(langFromPath('/blog/um-artigo/')).toBe('pt')
  expect(langFromPath('/en/blog/')).toBe('en')
  expect(langFromPath('/en/blog/um-artigo/')).toBe('en')
})
