import { expect, test } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { limparResposta, verificarArtigo, escreverArtigo } from './escrever.mjs'

const CORPO_LONGO = 'palavra '.repeat(1400).trim()
const BOM = `---
title: "Um título"
excerpt: "Um excerto."
category: "Podcasts"
date: "September 2026"
readTime: "7 min de leitura"
---

${CORPO_LONGO}`

test('tira um bloco de código à volta da resposta', () => {
  expect(limparResposta('```markdown\n---\ntitle: "A"\n---\n\nCorpo.\n```')).toBe('---\ntitle: "A"\n---\n\nCorpo.')
})

test('tira um preâmbulo antes do frontmatter', () => {
  expect(limparResposta('Aqui está o artigo:\n\n---\ntitle: "A"\n---\n\nCorpo.')).toBe('---\ntitle: "A"\n---\n\nCorpo.')
})

test('tira um bloco de código mesmo quando vem com preâmbulo à frente', () => {
  const entrada = 'Aqui está o artigo:\n\n```markdown\n---\ntitle: "A"\n---\n\nCorpo.\n```'
  expect(limparResposta(entrada)).toBe('---\ntitle: "A"\n---\n\nCorpo.')
})

test('deixa em paz uma resposta já limpa', () => {
  expect(limparResposta(BOM)).toBe(BOM)
})

test('um artigo bom não tem problemas', () => {
  expect(verificarArtigo({ markdown: BOM, slug: 'teste', lang: 'pt' })).toEqual([])
})

test('acusa um campo em falta, pelo validador que já existe', () => {
  const semExcerpt = BOM.replace('excerpt: "Um excerto."\n', '')
  expect(verificarArtigo({ markdown: semExcerpt, slug: 'teste', lang: 'pt' }).map(p => p.mensagem).join(' ')).toContain('excerpt')
})

test('acusa uma categoria inventada', () => {
  const mau = BOM.replace('Podcasts', 'Categoria Inventada')
  expect(verificarArtigo({ markdown: mau, slug: 'teste', lang: 'pt' }).map(p => p.mensagem).join(' ')).toContain('Inventada')
})

test('acusa um artigo curto de mais', () => {
  const curto = BOM.replace(CORPO_LONGO, 'palavra '.repeat(400))
  expect(verificarArtigo({ markdown: curto, slug: 'teste', lang: 'pt' }).map(p => p.mensagem).join(' ')).toContain('400')
})

test('não deixa um comentário HTML preencher um artigo curto até ao mínimo', () => {
  const real = 'palavra '.repeat(1100).trim()
  const comentario = `<!-- ${'palavra '.repeat(300).trim()} -->`
  const curtoDisfarcado = BOM.replace(CORPO_LONGO, `${real}\n\n${comentario}`)
  const problemas = verificarArtigo({ markdown: curtoDisfarcado, slug: 'teste', lang: 'pt' })
  expect(problemas.map(p => p.mensagem).join(' ')).toContain('1100')
})

test('não deixa um comentário HTML sem fecho (resposta cortada a meio) preencher um artigo curto', () => {
  const real = 'palavra '.repeat(1100).trim()
  const comentarioSemFecho = `<!-- ${'palavra '.repeat(300).trim()}`
  const curtoDisfarcado = BOM.replace(CORPO_LONGO, `${real}\n\n${comentarioSemFecho}`)
  const problemas = verificarArtigo({ markdown: curtoDisfarcado, slug: 'teste', lang: 'pt' })
  expect(problemas.map(p => p.mensagem).join(' ')).toContain('1100')
})

test('acusa um artigo sem frontmatter nenhum', () => {
  expect(verificarArtigo({ markdown: 'Só corpo.', slug: 'teste', lang: 'pt' }).map(p => p.mensagem).join(' ')).toContain('frontmatter')
})

test('acusa um título de nível 1 no corpo', () => {
  const comH1 = BOM.replace(CORPO_LONGO, `# Um título repetido\n\n${CORPO_LONGO}`)
  expect(verificarArtigo({ markdown: comH1, slug: 'teste', lang: 'pt' }).map(p => p.mensagem).join(' ')).toContain('#')
})

test('acusa um aviso do leitor de frontmatter, não só um campo em falta', () => {
  const comAvisoDoLeitor = BOM.replace(
    'readTime: "7 min de leitura"\n---',
    'readTime: "7 min de leitura"\numa linha sem dois pontos\n---'
  )
  expect(verificarArtigo({ markdown: comAvisoDoLeitor, slug: 'teste', lang: 'pt' }).map(p => p.mensagem).join(' ')).toContain('[blog]')
})

test('acusa um segundo bloco de frontmatter que vazou para o corpo', () => {
  const comSegundo = `${BOM}\n\n---\ntitle: "Outro"\nexcerpt: "Outro excerto."\ncategory: "Podcasts"\ndate: "September 2026"\nreadTime: "1 min de leitura"\n---\n\nMais texto a seguir.`
  expect(verificarArtigo({ markdown: comSegundo, slug: 'teste', lang: 'pt' }).map(p => p.mensagem).join(' ')).toContain('segundo bloco de frontmatter')
})

test('não acusa um separador horizontal comum como se fosse um segundo frontmatter', () => {
  const comSeparador = BOM.replace(CORPO_LONGO, `${CORPO_LONGO}\n\n---\n\nMais texto depois do separador.`)
  expect(verificarArtigo({ markdown: comSeparador, slug: 'teste', lang: 'pt' }).map(p => p.mensagem).join(' ')).not.toContain('segundo bloco de frontmatter')
})

test('escreve o ficheiro no sítio certo, com newline final', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'escrever-'))
  const caminho = escreverArtigo({ contentDir: dir, slug: 'teste', lang: 'pt', markdown: BOM })
  expect(caminho).toBe(path.join(dir, 'teste', 'pt.md'))
  expect(fs.readFileSync(caminho, 'utf-8')).toBe(BOM + '\n')
})

test('recusa um slug que tente escrever fora da pasta de destino', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'escrever-'))
  expect(() => escreverArtigo({ contentDir: dir, slug: '..', lang: 'pt', markdown: BOM }))
    .toThrow(/slug inválido/)
  expect(() => escreverArtigo({ contentDir: dir, slug: '../outside', lang: 'pt', markdown: BOM }))
    .toThrow(/slug inválido/)
})

test('recusa escrever por cima de um artigo que já existe', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'escrever-'))
  escreverArtigo({ contentDir: dir, slug: 'teste', lang: 'pt', markdown: BOM })
  expect(() => escreverArtigo({ contentDir: dir, slug: 'teste', lang: 'pt', markdown: BOM }))
    .toThrow(/já existe/)
})

test('mas escreve por cima quando lhe dizem que é uma expansão', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'escrever-'))
  escreverArtigo({ contentDir: dir, slug: 'teste', lang: 'pt', markdown: BOM })
  const novo = BOM.replace('Um título', 'Outro título')
  escreverArtigo({ contentDir: dir, slug: 'teste', lang: 'pt', markdown: novo, substituir: true })
  expect(fs.readFileSync(path.join(dir, 'teste', 'pt.md'), 'utf-8')).toContain('Outro título')
})
