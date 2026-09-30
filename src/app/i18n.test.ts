import { expect, test } from 'vitest'
import { langFromPath, blogPathIn, translateDate } from './i18n'

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

/* O que o leitor vê não pode mudar por a data passar a ter o dia: estas são as
   frases que a lista e os artigos mostravam quando a data era «July 2026». */
test('translateDate mostra mês e ano, com as mesmas frases de sempre, nas duas línguas', () => {
  const casos: [string, string, string][] = [
    ['2026-01-20', 'janeiro de 2026', 'January 2026'],
    ['2026-02-17', 'fevereiro de 2026', 'February 2026'],
    ['2026-03-10', 'março de 2026', 'March 2026'],
    ['2026-04-07', 'abril de 2026', 'April 2026'],
    ['2026-05-05', 'maio de 2026', 'May 2026'],
    ['2026-06-08', 'junho de 2026', 'June 2026'],
    ['2026-07-20', 'julho de 2026', 'July 2026'],
    ['2026-08-01', 'agosto de 2026', 'August 2026'],
    ['2026-09-30', 'setembro de 2026', 'September 2026'],
    ['2026-10-15', 'outubro de 2026', 'October 2026'],
    ['2026-11-11', 'novembro de 2026', 'November 2026'],
    ['2026-12-31', 'dezembro de 2026', 'December 2026'],
  ]
  for (const [iso, pt, en] of casos) {
    expect(translateDate(iso, 'pt'), iso).toBe(pt)
    expect(translateDate(iso, 'en'), iso).toBe(en)
  }
})

test('translateDate não depende do dia: o primeiro e o último do mês dão o mesmo texto', () => {
  expect(translateDate('2026-07-01', 'pt')).toBe(translateDate('2026-07-31', 'pt'))
  expect(translateDate('2026-07-01', 'en')).toBe('July 2026')
})

test('translateDate devolve tal como está o que não for uma data ISO', () => {
  expect(translateDate('brevemente', 'pt')).toBe('brevemente')
  expect(translateDate('2026-13-05', 'en')).toBe('2026-13-05')
  expect(translateDate('', 'pt')).toBe('')
})
