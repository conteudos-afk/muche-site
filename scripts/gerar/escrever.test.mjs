import { expect, test } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { splitFrontmatter } from '../../src/lib/blog/parsePost.ts'
import { contarPalavras } from './palavras.mjs'
import { limparResposta, verificarArtigo, escreverArtigo, calcularReadTime, aplicarReadTime } from './escrever.mjs'

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

test('calcularReadTime: 200 palavras por minuto, arredondado ao inteiro mais próximo', () => {
  expect(calcularReadTime(1572, 'pt')).toBe('8 min de leitura')
  expect(calcularReadTime(1543, 'en')).toBe('8 min read')
  expect(calcularReadTime(1499, 'pt')).toBe('7 min de leitura')
  expect(calcularReadTime(1500, 'pt')).toBe('8 min de leitura')
  expect(calcularReadTime(1200, 'en')).toBe('6 min read')
  expect(calcularReadTime(1800, 'en')).toBe('9 min read')
})

test('calcularReadTime: nunca devolve zero minutos e recusa uma língua que não conhece', () => {
  expect(calcularReadTime(10, 'pt')).toBe('1 min de leitura')
  expect(() => calcularReadTime(1500, 'fr')).toThrow(/fr/)
})

/* O `readTime` que o leitor vê tem de ser o que o gerador calcularia. Os
   artigos escritos à mão diziam 4 a 7 minutos para 200 a 400 palavras e
   ficaram meses assim, no site, sem que nada o notasse. */
test('o readTime de cada artigo real corresponde à contagem do seu corpo', () => {
  const contentDir = fileURLToPath(new URL('../../content/blog', import.meta.url))
  const slugs = fs.readdirSync(contentDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('_')).map(e => e.name)
  expect(slugs.length).toBeGreaterThanOrEqual(14)
  for (const slug of slugs) {
    for (const lang of ['pt', 'en']) {
      const { data, content } = splitFrontmatter(fs.readFileSync(path.join(contentDir, slug, `${lang}.md`), 'utf-8'), `${slug}/${lang}.md`)
      expect(data.readTime, `${slug}/${lang}`).toBe(calcularReadTime(contarPalavras(content.trim()), lang))
    }
  }
})

const comCorpo = (n, readTime) => BOM.replace(CORPO_LONGO, 'palavra '.repeat(n).trim()).replace('7 min de leitura', readTime)

test('aplicarReadTime: escreve por cima do valor do modelo, a partir da contagem real', () => {
  /* 1543 palavras com o «5 min read» que o modelo copiou do artigo antigo. */
  const md = comCorpo(1543, '5 min read')
  const r = aplicarReadTime({ markdown: md, lang: 'en' })
  expect(r).toContain('readTime: "8 min read"')
  expect(r).not.toContain('5 min read')
})

test('aplicarReadTime: usa a língua para a redação, e só muda a linha readTime', () => {
  const md = comCorpo(1400, '99 min de leitura')
  const r = aplicarReadTime({ markdown: md, lang: 'pt' })
  expect(r).toBe(md.replace('99 min de leitura', '7 min de leitura'))
})

test('aplicarReadTime: o resultado continua a passar em verificarArtigo', () => {
  const r = aplicarReadTime({ markdown: comCorpo(1700, '1 min de leitura'), lang: 'pt' })
  expect(r).toContain('readTime: "9 min de leitura"')
  expect(verificarArtigo({ markdown: r, slug: 'teste', lang: 'pt' })).toEqual([])
})

test('aplicarReadTime: não toca numa linha readTime que esteja no corpo do artigo', () => {
  const md = comCorpo(1400, '1 min de leitura') + '\n\nreadTime: "3 min de leitura"'
  const r = aplicarReadTime({ markdown: md, lang: 'pt' })
  expect(r).toContain('readTime: "7 min de leitura"\n---')
  expect(r.endsWith('readTime: "3 min de leitura"')).toBe(true)
})

test('aplicarReadTime: lança se o cabeçalho não tem readTime', () => {
  const semLinha = BOM.replace('readTime: "7 min de leitura"\n', '')
  expect(() => aplicarReadTime({ markdown: semLinha, lang: 'pt' })).toThrow(/readTime/)
})

const COM_READTIME_REPETIDO = BOM.replace('readTime: "7 min de leitura"', 'readTime: "7 min de leitura"\nreadTime: "3 min de leitura"')

test('verificarArtigo: uma chave repetida no cabeçalho é um problema fatal', () => {
  const problemas = verificarArtigo({ markdown: COM_READTIME_REPETIDO, slug: 'teste', lang: 'pt' })
  expect(problemas.map(p => p.tipo)).toEqual(['chave-repetida'])
  expect(problemas[0].mensagem).toContain('readTime')
})

test('verificarArtigo: o mesmo texto de chave no corpo não é uma chave repetida', () => {
  const noCorpo = BOM + '\n\nreadTime: "3 min de leitura"'
  expect(verificarArtigo({ markdown: noCorpo, slug: 'teste', lang: 'pt' })).toEqual([])
})

test('aplicarReadTime: recusa um cabeçalho com readTime repetido, em vez de adivinhar', () => {
  expect(() => aplicarReadTime({ markdown: COM_READTIME_REPETIDO, lang: 'pt' })).toThrow(/repetida/)
})

/* ─── Grafia antiga: um aviso, nunca um erro ─────────────────────────────────
   O primeiro artigo real voltou com seis formas do Acordo antigo. O detetor
   pode enganar-se (falso positivo) e o modelo pode regredir (verdadeiro), por
   isso o resultado é um problema de tipo próprio, que chega ao corpo do PR
   para um humano ver — e que `index.mjs` não trata como fatal nem como
   motivo para repetir o pedido. */
const comFrase = frase => BOM.replace(CORPO_LONGO, `${frase} ${'palavra '.repeat(1395).trim()}`)
const grafias = problemas => problemas.filter(p => p.tipo === 'grafia')

test('verificarArtigo: uma forma do Acordo antigo num artigo português é um problema de tipo «grafia»', () => {
  const problemas = verificarArtigo({ markdown: comFrase('O director tem um objectivo.'), slug: 'teste', lang: 'pt' })
  expect(problemas.map(p => p.tipo)).toEqual(['grafia'])
  expect(problemas[0].mensagem).toContain('teste/pt.md')
  expect(problemas[0].mensagem).toContain('director')
  expect(problemas[0].mensagem).toContain('objectivo')
})

test('verificarArtigo: cada forma antiga aparece uma só vez na mensagem, mesmo repetida', () => {
  const problemas = grafias(verificarArtigo({ markdown: comFrase('O director, o director e o director.'), slug: 'teste', lang: 'pt' }))
  expect(problemas).toHaveLength(1)
  expect(problemas[0].mensagem.match(/director/g)).toHaveLength(1)
})

test('verificarArtigo: um artigo em inglês não é lido pelo detetor, que é só de português', () => {
  const problemas = verificarArtigo({ markdown: comFrase('The director sold the actual product.'), slug: 'teste', lang: 'en' })
  expect(grafias(problemas)).toEqual([])
})

test('verificarArtigo: português no novo Acordo não gera aviso de grafia', () => {
  const problemas = verificarArtigo({ markdown: comFrase('O diretor tem um objetivo e uma perceção clara.'), slug: 'teste', lang: 'pt' })
  expect(grafias(problemas)).toEqual([])
})

test('verificarArtigo: a grafia antiga no cabeçalho também conta', () => {
  const md = BOM.replace('excerpt: "Um excerto."', 'excerpt: "Um excerto directo."')
  expect(grafias(verificarArtigo({ markdown: md, slug: 'teste', lang: 'pt' })).map(p => p.mensagem).join(' ')).toContain('directo')
})
