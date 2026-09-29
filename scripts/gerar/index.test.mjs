import { expect, test } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { gerarUm, gerarLote, lerArgumentos, resolverAlvos } from './index.mjs'
import { lerTemas } from './temas.mjs'

const corpo = n => 'palavra '.repeat(n)
const artigo = (titulo, palavras) => `---
title: "${titulo}"
excerpt: "Um excerto."
category: "Podcasts"
date: "September 2026"
readTime: "7 min de leitura"
---

${corpo(palavras)}`

const REF = {
  slug: 'ref', lang: 'pt', categoria: 'Podcasts',
  frontmatter: { title: 'Ref', excerpt: 'E.', category: 'Podcasts', date: 'July 2026', readTime: '5 min de leitura' },
  corpo: 'Corpo.', palavras: 1,
}
const REF_EN = { ...REF, lang: 'en' }

const TEMA = {
  slug: 'tema-novo', tema: 'Um tema', angulo: 'Um ângulo',
  categoria: 'Podcasts', prioridade: 1, estado: 'por-escrever',
}

function clienteFalso(respostas) {
  const dadas = []
  return {
    dadas,
    async pedir(prompt) {
      dadas.push(prompt)
      return { texto: respostas[dadas.length - 1], custo: 0.15 }
    },
  }
}

const dirTemp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'gerar-'))

test('lê os argumentos da linha de comandos', () => {
  expect(lerArgumentos(['--modo', 'escrever', '--lote', '3'])).toEqual({ modo: 'escrever', lote: 3, slugs: [] })
  expect(lerArgumentos(['--modo', 'expandir', '--slugs', 'a,b'])).toEqual({ modo: 'expandir', lote: 3, slugs: ['a', 'b'] })
})

test('recusa um modo que não existe', () => {
  expect(() => lerArgumentos(['--modo', 'inventar'])).toThrow(/inventar/)
})

test('recusa um --lote que não é um número inteiro positivo', () => {
  expect(() => lerArgumentos(['--lote', 'abc'])).toThrow(/abc/)
  expect(() => lerArgumentos(['--lote', '-1'])).toThrow(/-1/)
  expect(() => lerArgumentos(['--lote', '0'])).toThrow(/0/)
  expect(() => lerArgumentos(['--lote', '2.5'])).toThrow(/2\.5/)
})

/* A distinção que interessa: um --lote malformado tem de rebentar em
   lerArgumentos (rota do exit(1), com o valor recebido na mensagem) — não
   pode produzir, mais abaixo, o mesmo `[]` silencioso que uma lista
   genuinamente esgotada devolve (rota do exit(2)). */
test('um --lote inválido não fica indistinguível de uma lista esgotada: lança, não devolve lista vazia', () => {
  expect(() => lerArgumentos(['--lote', 'abc'])).toThrow()

  /* Ao contrário: sem --slugs e sem nada por-escrever, é mesmo uma lista
     esgotada — resolverAlvos devolve [], não lança. */
  const temas = [{ ...TEMA, estado: 'publicado' }]
  expect(resolverAlvos({ modo: 'escrever', lote: 3, slugs: [], temas })).toEqual([])
})

test('resolverAlvos lança quando um slug pedido não existe na lista de temas, em vez de devolver lista vazia', () => {
  const temas = [TEMA]
  expect(() => resolverAlvos({ modo: 'escrever', lote: 3, slugs: ['nao-existe'], temas }))
    .toThrow(/nao-existe/)
})

test('resolverAlvos lança quando só parte dos slugs pedidos existe', () => {
  const temas = [TEMA]
  expect(() => resolverAlvos({ modo: 'escrever', lote: 3, slugs: [TEMA.slug, 'nao-existe'], temas }))
    .toThrow(/nao-existe/)
})

test('resolverAlvos devolve os temas pedidos por slug quando todos existem', () => {
  const temas = [TEMA]
  expect(resolverAlvos({ modo: 'escrever', lote: 3, slugs: [TEMA.slug], temas })).toEqual([TEMA])
})

test('resolverAlvos lança quando um slug pedido não está entre os artigos curtos, no modo expandir', () => {
  const curtos = [{ slug: 'curto-a', palavras: 300 }]
  expect(() => resolverAlvos({ modo: 'expandir', lote: 3, slugs: ['nao-existe'], curtos }))
    .toThrow(/nao-existe/)
})

test('escreve as duas línguas a partir de um tema', async () => {
  const contentDir = dirTemp()
  const cliente = clienteFalso([artigo('Português', 1400), artigo('English', 1400)])

  const r = await gerarUm({ cliente, modo: 'escrever', alvo: TEMA, referenciasPt: [REF], referenciasEn: [REF_EN], contentDir })

  expect(r.slug).toBe('tema-novo')
  expect(fs.readFileSync(path.join(contentDir, 'tema-novo', 'pt.md'), 'utf-8')).toContain('Português')
  expect(fs.readFileSync(path.join(contentDir, 'tema-novo', 'en.md'), 'utf-8')).toContain('English')
  expect(r.custo).toBeCloseTo(0.30)
})

test('o pedido inglês leva o artigo português dentro', async () => {
  const cliente = clienteFalso([artigo('Português', 1400), artigo('English', 1400)])
  await gerarUm({ cliente, modo: 'escrever', alvo: TEMA, referenciasPt: [REF], referenciasEn: [REF_EN], contentDir: dirTemp() })
  expect(cliente.dadas[1]).toContain('Português')
})

test('tenta uma segunda vez quando o artigo sai fora do intervalo', async () => {
  const cliente = clienteFalso([artigo('Curto', 400), artigo('Bom', 1400), artigo('English', 1400)])
  const r = await gerarUm({ cliente, modo: 'escrever', alvo: TEMA, referenciasPt: [REF], referenciasEn: [REF_EN], contentDir: dirTemp() })
  expect(cliente.dadas).toHaveLength(3)
  expect(cliente.dadas[1]).toContain('400')
  expect(r.avisos).toEqual([])
})

test('desiste ao fim de duas tentativas e regista o aviso, sem falhar', async () => {
  const contentDir = dirTemp()
  const cliente = clienteFalso([artigo('Curto', 400), artigo('Curto', 500), artigo('English', 1400)])
  const r = await gerarUm({ cliente, modo: 'escrever', alvo: TEMA, referenciasPt: [REF], referenciasEn: [REF_EN], contentDir })
  expect(r.avisos.join(' ')).toContain('500')
  expect(fs.existsSync(path.join(contentDir, 'tema-novo', 'pt.md'))).toBe(true)
})

test('não escreve nada quando o frontmatter vem estragado das duas vezes', async () => {
  const contentDir = dirTemp()
  const mau = artigo('Mau', 1400).replace('category: "Podcasts"', 'category: "Inventada"')
  const cliente = clienteFalso([mau, mau])
  await expect(gerarUm({ cliente, modo: 'escrever', alvo: TEMA, referenciasPt: [REF], referenciasEn: [REF_EN], contentDir }))
    .rejects.toThrow(/Inventada/)
  expect(fs.existsSync(path.join(contentDir, 'tema-novo'))).toBe(false)
})

test('no modo expandir escreve por cima do artigo que já existe', async () => {
  const contentDir = dirTemp()
  fs.mkdirSync(path.join(contentDir, 'antigo'), { recursive: true })
  fs.writeFileSync(path.join(contentDir, 'antigo', 'pt.md'), artigo('Antigo', 300))
  fs.writeFileSync(path.join(contentDir, 'antigo', 'en.md'), artigo('Old', 300))

  const alvo = { slug: 'antigo', lang: 'pt', categoria: 'Podcasts', frontmatter: { title: 'Antigo', category: 'Podcasts' }, corpo: corpo(300), palavras: 300 }
  const cliente = clienteFalso([artigo('Expandido', 1400), artigo('Expanded', 1400)])

  await gerarUm({ cliente, modo: 'expandir', alvo, referenciasPt: [REF], referenciasEn: [REF_EN], contentDir })
  expect(fs.readFileSync(path.join(contentDir, 'antigo', 'pt.md'), 'utf-8')).toContain('Expandido')
})

const ficheiroTemasTemp = () => {
  const ficheiro = path.join(dirTemp(), '_temas.yml')
  fs.writeFileSync(ficheiro, `temas:
  - slug: um
    tema: "Primeiro tema"
    angulo: "Um ângulo"
    categoria: "Podcasts"
    prioridade: 1
    estado: por-escrever
  - slug: dois
    tema: "Segundo tema"
    angulo: "Outro ângulo"
    categoria: "Podcasts"
    prioridade: 2
    estado: por-escrever
`, 'utf-8')
  return ficheiro
}

/* Regressão: uma falha a meio do lote não pode perder a marcação dos
   artigos que já tinham sido escritos com sucesso antes dela. */
test('gerarLote marca cada tema como usado assim que o artigo é escrito, não só no fim do lote', async () => {
  const contentDir = dirTemp()
  const temasPath = ficheiroTemasTemp()
  const alvos = [
    { slug: 'um', tema: 'Primeiro tema', angulo: 'Um ângulo', categoria: 'Podcasts', prioridade: 1, estado: 'por-escrever' },
    { slug: 'dois', tema: 'Segundo tema', angulo: 'Outro ângulo', categoria: 'Podcasts', prioridade: 2, estado: 'por-escrever' },
  ]
  const mau = artigo('Mau', 1400).replace('category: "Podcasts"', 'category: "Inventada"')
  /* um/pt, um/en escrevem bem; dois/pt vem com frontmatter fatal e lança
     de imediato (sem segunda tentativa, porque uma categoria inventada não
     é dimensão). */
  const cliente = clienteFalso([artigo('Um PT', 1400), artigo('Um EN', 1400), mau])

  await expect(gerarLote({ cliente, modo: 'escrever', alvos, artigosPt: [REF], artigosEn: [REF_EN], contentDir, temasPath }))
    .rejects.toThrow(/Inventada/)

  expect(fs.existsSync(path.join(contentDir, 'um', 'pt.md'))).toBe(true)
  expect(fs.existsSync(path.join(contentDir, 'dois', 'pt.md'))).toBe(false)

  const temasDepois = lerTemas(temasPath)
  expect(temasDepois.find(t => t.slug === 'um').estado).toBe('publicado')
  expect(temasDepois.find(t => t.slug === 'dois').estado).toBe('por-escrever')
})
