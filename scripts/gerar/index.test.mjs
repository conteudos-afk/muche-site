import { expect, test } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { gerarUm, lerArgumentos } from './index.mjs'

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
