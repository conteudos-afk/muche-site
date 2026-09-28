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

test('trata palavras com hífen como uma só', () => {
  expect(contarPalavras('pré-produção é uma palavra')).toBe(4)
})

test('o intervalo é o do spec', () => {
  expect([MIN_PALAVRAS, MAX_PALAVRAS]).toEqual([1200, 1800])
  expect(dentroDoIntervalo(1199)).toBe(false)
  expect(dentroDoIntervalo(1200)).toBe(true)
  expect(dentroDoIntervalo(1800)).toBe(true)
  expect(dentroDoIntervalo(1801)).toBe(false)
})
