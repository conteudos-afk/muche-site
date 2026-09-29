import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { avisar, lerPr, aplicar, avaliar } from './index.mjs'
import { MARCA_AVISO } from './contador.mjs'

/* ─── O aviso de ida e volta ─────────────────────────────────────────────────
   O `decidir` só junta com `jaAvisado === true`, e o `jaAvisado` vem de
   procurar o `MARCA_AVISO` nos comentários que o `avisar` escreveu. Se as
   duas pontas deixarem de concordar, o PR é avisado todas as horas e nunca se
   junta. Aqui o `avisar` e o `lerPr` de produção correm a sério, contra um
   `gh` falso que guarda o corpo que recebe e o devolve como o GitHub faria.
   Nada do corpo é escrito à mão neste ficheiro. ───────────────────────────── */

/* O `gh` falso: um ficheiro de estado com os comentários do PR 1. `pr comment`
   acrescenta, `pr view` devolve-os. `FALSO_GH_LIMPA` faz o que o GitHub faria
   se alguma vez normalizasse o corpo: tira os comentários HTML. */
const GH_FALSO = `#!/usr/bin/env node
const fs = require('fs')
const a = process.argv.slice(2)
if (process.env.FALSO_GH_LOG) require('fs').appendFileSync(process.env.FALSO_GH_LOG, JSON.stringify(a) + '\\n')
const estado = process.env.FALSO_GH_ESTADO
const ler = () => JSON.parse(fs.readFileSync(estado, 'utf8'))
const escrever = e => fs.writeFileSync(estado, JSON.stringify(e))
const saida = o => console.log(JSON.stringify(o))
const horas = n => new Date(Date.now() - n * 3600e3).toISOString()
const artigos = n => Array.from({ length: n }, (_, i) => ({ path: 'content/blog/a' + i + '/pt.md', changeType: 'ADDED' }))

if (a[0] === 'pr' && a[1] === 'list') {
  return saida(a.includes('open') ? [{ number: 1 }] : [{ number: 2, files: artigos(ler().publicados) }])
}
if (a[0] === 'pr' && a[1] === 'view' && a[2] === '1') {
  const e = ler()
  return saida({
    number: 1, state: 'OPEN', baseRefName: 'main', isCrossRepository: false,
    headRefOid: 'a'.repeat(40), createdAt: horas(e.horas), isDraft: false,
    files: e.ficheiros || artigos(1), reviews: [], comments: e.comentarios,
  })
}
if (a[0] === 'pr' && a[1] === 'comment' && a[2] === '1') {
  const e = ler()
  let corpo = a[a.indexOf('--body') + 1]
  if (process.env.FALSO_GH_LIMPA) corpo = corpo.replace(/<!--[\\s\\S]*?-->/g, '')
  e.comentarios.push({ author: { login: process.env.FALSO_GH_AUTOR }, body: corpo })
  return escrever(e)
}
if (a[0] === 'pr' && a[1] === 'merge' && a[2] === '1') {
  const e = ler()
  e.fusoes.push(a)
  return escrever(e)
}
if (a[0] === 'api') {
  return saida([])
}
console.error('gh falso: comando desconhecido', a)
process.exit(9)
`

let pasta, estadoFicheiro
const ambiente = {}

const comentarios = () => JSON.parse(fs.readFileSync(estadoFicheiro, 'utf8')).comentarios
const fusoes = () => JSON.parse(fs.readFileSync(estadoFicheiro, 'utf8')).fusoes
const definir = (horas, coments = [], publicados = 12) =>
  fs.writeFileSync(estadoFicheiro, JSON.stringify({ horas, comentarios: coments, publicados, fusoes: [] }))
const comFicheiros = ficheiros => {
  const e = JSON.parse(fs.readFileSync(estadoFicheiro, 'utf8'))
  fs.writeFileSync(estadoFicheiro, JSON.stringify({ ...e, ficheiros }))
}
const registoDeErros = () => console.error.mock.calls.map(c => String(c[0]))
const publicar = n => {
  const e = JSON.parse(fs.readFileSync(estadoFicheiro, 'utf8'))
  fs.writeFileSync(estadoFicheiro, JSON.stringify({ ...e, publicados: n }))
}

beforeAll(() => {
  pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'prazo-gh-'))
  fs.writeFileSync(path.join(pasta, 'gh'), GH_FALSO, { mode: 0o755 })
  estadoFicheiro = path.join(pasta, 'estado.json')
})
afterAll(() => fs.rmSync(pasta, { recursive: true, force: true }))

beforeEach(() => {
  for (const [k, v] of Object.entries({
    PATH: `${pasta}:${process.env.PATH}`,
    FALSO_GH_ESTADO: estadoFicheiro,
    FALSO_GH_AUTOR: 'github-actions[bot]',
    FALSO_GH_LIMPA: '',
    BUILD_VERDE: '',
    GITHUB_STEP_SUMMARY: '',
  })) {
    ambiente[k] = process.env[k]
    process.env[k] = v
  }
  delete process.env.GITHUB_REPOSITORY
  vi.spyOn(console, 'error').mockImplementation(() => {})
  definir(30)
})
afterEach(() => {
  vi.restoreAllMocks()
  for (const [k, v] of Object.entries(ambiente)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
})

test('o aviso que o avisar escreve é o que o lerPr reconhece', () => {
  expect(lerPr(1, null).pr.jaAvisado).toBe(false)

  avisar(1)

  expect(comentarios()).toHaveLength(1)
  expect(comentarios()[0].body).toContain(MARCA_AVISO)
  expect(lerPr(1, null).pr.jaAvisado).toBe(true)
})

test.each(['github-actions[bot]', 'github-actions'])(
  'o aviso não conta como comentário humano, com o autor %s',
  autor => {
    process.env.FALSO_GH_AUTOR = autor
    avisar(1)
    const { pr } = lerPr(1, null)
    expect(pr.comentariosHumanos).toBe(0)
    expect(pr.jaAvisado).toBe(true)
  },
)

test('depois de avisado o decidir deixa de mandar avisar', () => {
  expect(avaliar(1, null, 12, new Date()).acao).toBe('avisar')
  avisar(1)
  const depois = avaliar(1, null, 12, new Date())
  expect(depois.acao).toBe('nada')
  expect(depois.motivo).toContain('avisado')
})

test('várias execuções seguidas escrevem um único aviso', () => {
  for (let i = 0; i < 5; i++) aplicar(1)
  expect(comentarios()).toHaveLength(1)
})

test('se o GitHub tirar o marcador, o aviso repete-se uma vez e pára, em vez de todas as horas', () => {
  process.env.FALSO_GH_LIMPA = '1'
  for (let i = 0; i < 6; i++) aplicar(1)

  /* O marcador desapareceu, por isso o `jaAvisado` nunca fica `true`: o
     segundo comentário é o preço de descobrir. Ao terceiro, a repetição
     deteta-se sem depender do marcador, e o PR não recebe mais nenhum. */
  expect(comentarios()).toHaveLength(2)
  expect(comentarios()[0].body).not.toContain(MARCA_AVISO)

  const { acao, motivo } = avaliar(1, null, 12, new Date())
  expect(acao).toBe('nada')
  expect(motivo).toContain('repetidos')
  expect(motivo).toContain('não está a ser reconhecido')
})

test('a repetição é assinalada como anomalia na execução', () => {
  process.env.FALSO_GH_LIMPA = '1'
  for (let i = 0; i < 3; i++) aplicar(1)
  const avisos = console.error.mock.calls.map(c => String(c[0])).filter(l => l.startsWith('::warning'))
  expect(avisos.length).toBeGreaterThan(0)
  expect(avisos.at(-1)).toContain('repetidos')
})

test('dois comentários de bot iguais são repetição; comentários diferentes ou humanos não', () => {
  const bot = body => ({ author: { login: 'cloudflare-workers-and-pages' }, body })
  const pessoa = body => ({ author: { login: 'fabio' }, body })

  definir(30, [bot('Deploy A'), bot('Deploy B')])
  expect(lerPr(1, null).repetidos).toBe(false)

  definir(30, [pessoa('ok'), pessoa('ok')])
  expect(lerPr(1, null).repetidos).toBe(false)

  definir(30, [bot('Deploy A'), bot('Deploy A ')])
  expect(lerPr(1, null).repetidos).toBe(true)
})

test('o corpo do aviso não depende do número de artigos publicados', () => {
  process.env.FALSO_GH_LIMPA = '1'
  aplicar(1)
  publicar(13)
  aplicar(1)
  const [primeiro, segundo] = comentarios()
  expect(comentarios()).toHaveLength(2)
  expect(segundo.body).toBe(primeiro.body)

  /* Com o marcador ilegível e a contagem a mudar entre avisos, a deteção
     continua a apanhar a repetição e o PR não recebe um terceiro. */
  publicar(14)
  aplicar(1)
  aplicar(1)
  expect(comentarios()).toHaveLength(2)
  expect(avaliar(1, null, 14, new Date()).motivo).toContain('repetidos')
})

test('fins de linha CRLF e espaços no fim das linhas não escondem a repetição', () => {
  const bot = body => ({ author: { login: 'github-actions[bot]' }, body })

  definir(30, [bot('Faltam 24 horas.\r\n\r\nEscreve aqui.  \r\n'), bot('Faltam 24 horas.\n\nEscreve aqui.')])
  expect(lerPr(1, null).repetidos).toBe(true)

  definir(30, [bot('Faltam 24 horas.\n\nEscreve aqui.'), bot('Faltam 24 horas.\n\nEscreve ali.')])
  expect(lerPr(1, null).repetidos).toBe(false)
})

/* Um PR avisado há muito tempo, sem reações, com o build verde. O aviso vem do
   próprio `avisar`. */
function prPronto() {
  definir(60)
  avisar(1)
  process.env.BUILD_VERDE = 'true'
}

test('junta quando a ponta do PR é o commit construído', () => {
  prPronto()
  process.env.COMMIT_CONSTRUIDO = 'a'.repeat(40)
  aplicar(1)
  expect(fusoes()).toHaveLength(1)
  expect(fusoes()[0]).toContain('--match-head-commit')
  expect(fusoes()[0]).toContain('a'.repeat(40))
})

test('não junta quando a ponta do PR já não é o commit construído', () => {
  prPronto()
  process.env.COMMIT_CONSTRUIDO = 'b'.repeat(40)
  aplicar(1)
  expect(fusoes()).toHaveLength(0)
  const registo = console.error.mock.calls.map(c => String(c[0])).join('\n')
  expect(registo).toContain('a ponta do PR mudou desde o build')
})

afterEach(() => { delete process.env.COMMIT_CONSTRUIDO })

const alterado = (path, changeType) => ({ path, changeType, additions: 1, deletions: 0 })

test('um PR de expandir (tudo MODIFIED) fica fora do portão e avisa, em vez de calar', () => {
  definir(72)
  comFicheiros([
    alterado('content/blog/um/pt.md', 'MODIFIED'),
    alterado('content/blog/um/en.md', 'MODIFIED'),
    alterado('content/blog/_temas.yml', 'MODIFIED'),
  ])
  const { acao, motivo } = avaliar(1, null, 12, new Date())
  expect(acao).toBe('nada')
  expect(motivo).toContain('fora do âmbito')

  aplicar(1)
  const avisos = registoDeErros().filter(l => l.startsWith('::warning'))
  expect(avisos.length).toBeGreaterThan(0)
  expect(avisos.at(-1)).toContain('content/blog/um/pt.md')
  expect(comentarios()).toHaveLength(0)
  expect(fusoes()).toHaveLength(0)
})

test('um artigo novo (ADDED) mais a lista de temas passa o portão', () => {
  definir(30)
  comFicheiros([
    alterado('content/blog/novo/pt.md', 'ADDED'),
    alterado('content/blog/novo/en.md', 'ADDED'),
    alterado('content/blog/_temas.yml', 'MODIFIED'),
  ])
  expect(avaliar(1, null, 12, new Date()).acao).toBe('avisar')
})

test('um artigo novo com a edição de um publicado ao lado é recusado', () => {
  definir(72)
  comFicheiros([
    alterado('content/blog/novo/pt.md', 'ADDED'),
    alterado('content/blog/novo/en.md', 'ADDED'),
    alterado('content/blog/publicado/pt.md', 'MODIFIED'),
  ])
  const { acao, motivo } = avaliar(1, null, 12, new Date())
  expect(acao).toBe('nada')
  expect(motivo).toContain('content/blog/publicado/pt.md [MODIFIED]')
  process.env.BUILD_VERDE = 'true'
  process.env.COMMIT_CONSTRUIDO = 'a'.repeat(40)
  aplicar(1)
  expect(fusoes()).toHaveLength(0)
})

test('o número de artigos publicados sai de uma só chamada ao gh', () => {
  const log = path.join(pasta, 'chamadas.log')
  fs.writeFileSync(log, '')
  process.env.FALSO_GH_LOG = log
  aplicar(1)
  const chamadas = fs.readFileSync(log, 'utf8').trim().split('\n').map(l => JSON.parse(l))
  expect(chamadas.filter(c => c.includes('merged'))).toHaveLength(1)
  expect(chamadas.filter(c => c[1] === 'view' && c[2] !== '1')).toHaveLength(0)
  delete process.env.FALSO_GH_LOG
})
