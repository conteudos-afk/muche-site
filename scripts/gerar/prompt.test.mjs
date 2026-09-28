import { expect, test } from 'vitest'
import { SISTEMA, promptEscrever, promptExpandir, promptIngles } from './prompt.mjs'

const REF = {
  slug: 'referencia', lang: 'pt', categoria: 'Podcasts',
  frontmatter: { title: 'Título de referência', excerpt: 'Excerto.', category: 'Podcasts', date: 'July 2026', readTime: '5 min de leitura' },
  corpo: 'O corpo do artigo de referência.', palavras: 6,
}

const TEMA = {
  slug: 'quanto-custa', tema: 'Quanto custa um vídeo de marca',
  angulo: 'O que faz o preço variar', categoria: 'Video Production',
  prioridade: 1, estado: 'por-escrever',
}

test('o sistema fixa as regras de voz do spec', () => {
  expect(SISTEMA).toContain('vídeo de marca')
  expect(SISTEMA).toContain('português europeu')
  expect(SISTEMA).toContain('tu')
  expect(SISTEMA).toContain('ecrã')
})

test('o sistema proíbe estatísticas sem fonte e imagens', () => {
  expect(SISTEMA.toLowerCase()).toContain('estatística')
  expect(SISTEMA.toLowerCase()).toContain('imagens')
})

test('o prompt de escrita leva o tema, o ângulo e a categoria', () => {
  const p = promptEscrever({ tema: TEMA, referencias: [REF] })
  expect(p).toContain('Quanto custa um vídeo de marca')
  expect(p).toContain('O que faz o preço variar')
  expect(p).toContain('Video Production')
  expect(p).toContain('quanto-custa')
})

test('o prompt de escrita leva as referências com corpo', () => {
  const p = promptEscrever({ tema: TEMA, referencias: [REF] })
  expect(p).toContain('O corpo do artigo de referência.')
})

test('o prompt de escrita pede o intervalo de palavras', () => {
  const p = promptEscrever({ tema: TEMA, referencias: [REF] })
  expect(p).toContain('1200')
  expect(p).toContain('1800')
})

test('o prompt de expansão leva o artigo original inteiro', () => {
  const original = { ...REF, slug: 'original', corpo: 'Texto curto a expandir.' }
  const p = promptExpandir({ artigo: original, referencias: [REF] })
  expect(p).toContain('Texto curto a expandir.')
  expect(p).toContain('Título de referência')
})

test('o prompt de expansão manda manter o slug e a categoria', () => {
  const original = { ...REF, slug: 'original' }
  const p = promptExpandir({ artigo: original, referencias: [REF] })
  expect(p).toContain('original')
  expect(p.toLowerCase()).toContain('mantém')
})

test('o prompt inglês leva o artigo português e uma referência inglesa', () => {
  const refEn = { ...REF, lang: 'en', corpo: 'An approved English article.' }
  const p = promptIngles({ artigoPt: 'Artigo em português.', referenciaEn: refEn })
  expect(p).toContain('Artigo em português.')
  expect(p).toContain('An approved English article.')
})
