import { expect, test } from 'vitest'
import { contarPalavras, dentroDoIntervalo, MIN_PALAVRAS, MAX_PALAVRAS } from './palavras.mjs'

test('conta palavras de um parágrafo', () => {
  expect(contarPalavras('Uma frase com cinco palavras.')).toBe(5)
})

test('não conta os marcadores de Markdown', () => {
  expect(contarPalavras('## Um subtítulo\n\n- item um\n- item dois')).toBe(6)
})

test('não conta o frontmatter', () => {
  expect(contarPalavras('---\ntitle: "Isto não conta"\n---\n\nIsto conta.')).toBe(2)
})

test('não conta URLs de ligações, só o texto', () => {
  expect(contarPalavras('Vê [a nossa página](https://www.muche.pt/servicos/) agora.')).toBe(5)
})

test('tira uma imagem por inteiro, sem contar o texto alternativo como palavras', () => {
  expect(contarPalavras('Vê ![texto alternativo da imagem](https://x.pt/a.png) agora.')).toBe(2)
})

test('trata palavras com hífen como uma só', () => {
  expect(contarPalavras('pré-produção é uma palavra')).toBe(4)
})

test('não conta comentários HTML, incluindo em várias linhas', () => {
  const md = 'Uma frase real.\n\n<!--\npalavra palavra palavra palavra\npalavra palavra\n-->\n\nOutra frase real.'
  expect(contarPalavras(md)).toBe(6)
})

test('não conta um comentário HTML sem fecho, até ao fim do texto', () => {
  const md = 'Uma frase real.\n\n<!-- palavra palavra palavra palavra palavra palavra'
  expect(contarPalavras(md)).toBe(3)
})

test('um `<!--` por fechar dentro de um bloco de código não come o resto do artigo', () => {
  const md = 'Prosa real antes do bloco.\n\n```\nexemplo de código <!-- comentário nunca fechado\n```\n\nProsa real depois do bloco, e esta continua a contar.'
  expect(contarPalavras(md)).toBe(15)
})

test('o intervalo é o do spec', () => {
  expect([MIN_PALAVRAS, MAX_PALAVRAS]).toEqual([1200, 1800])
  expect(dentroDoIntervalo(1199)).toBe(false)
  expect(dentroDoIntervalo(1200)).toBe(true)
  expect(dentroDoIntervalo(1800)).toBe(true)
  expect(dentroDoIntervalo(1801)).toBe(false)
})
