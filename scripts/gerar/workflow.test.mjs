import { describe, expect, test } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parse } from 'yaml'

/* A ligação entre o workflow e o SDK não se vê em lado nenhum antes de uma
   execução real: se o nome de uma variável estiver errado, o SDK não se queixa,
   limita-se a não encontrar a federação. Estes testes seguram os nomes, as
   permissões e a ordem dos passos, e correm o script do token com um `core`
   falso. Não provam que a Anthropic aceita a troca — isso só uma execução. */

const CAMINHO = '.github/workflows/gerar-artigos.yml'
const texto = fs.readFileSync(CAMINHO, 'utf-8')
const wf = parse(texto)
const passos = wf.jobs.gerar.steps
const oidc = passos.find(p => p.id === 'oidc')
const gerar = passos.find(p => p.id === 'gerar')

describe('permissões e passos', () => {
  test('o workflow pode pedir o token de identidade', () => {
    expect(wf.permissions['id-token']).toBe('write')
  })

  test('o token pede-se antes de gerar, e só quando a guarda não saltou', () => {
    expect(oidc).toBeDefined()
    expect(passos.indexOf(oidc)).toBeLessThan(passos.indexOf(gerar))
    expect(oidc.if).toBe(gerar.if)
  })

  test('a chave estática desapareceu do workflow', () => {
    expect(texto).not.toMatch(/ANTHROPIC_API_KEY/)
    expect(texto).not.toMatch(/secrets\.ANTHROPIC/)
  })
})

describe('o ambiente do passo que gera', () => {
  test('tem os identificadores da regra de federação', () => {
    expect(gerar.env).toMatchObject({
      ANTHROPIC_FEDERATION_RULE_ID: 'fdrl_01XAxS2jvMHUojSjvtf14A5x',
      ANTHROPIC_ORGANIZATION_ID: 'c99e6f25-0679-43cb-8dec-da3e8c7b68ba',
      ANTHROPIC_SERVICE_ACCOUNT_ID: 'svac_01VqeUyndXHB2Y5RnVzsCdR2',
      ANTHROPIC_WORKSPACE_ID: 'wrkspc_019nKYk8pw6bkJHszVY5MNUE',
    })
  })

  test('o ficheiro do token é o que o passo anterior escreveu, e o token em si não passa pelo ambiente', () => {
    expect(gerar.env.ANTHROPIC_IDENTITY_TOKEN_FILE).toBe('${{ steps.oidc.outputs.ficheiro }}')
    expect(Object.keys(gerar.env)).not.toContain('ANTHROPIC_IDENTITY_TOKEN')
  })
})

/* Corre o script do passo tal como o `github-script` o faria, com um `core`
   que só regista o que lhe pedem. */
async function correr({ workspace, temp }) {
  const registo = []
  const core = {
    getIDToken: async audiencia => { registo.push(['getIDToken', audiencia]); return 'jwt.falso' },
    setSecret: valor => {
      registo.push(['setSecret', valor])
      /* O que interessa saber é se, quando o valor é mascarado, já está em disco. */
      registo.jaEstavaEmDisco = fs.existsSync(path.join(temp, 'anthropic-oidc-token'))
    },
    setOutput: (nome, valor) => registo.push(['setOutput', nome, valor]),
  }
  const antes = { ...process.env }
  process.env.GITHUB_WORKSPACE = workspace
  process.env.RUNNER_TEMP = temp
  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
    const requerer = await import('node:module').then(m => m.createRequire(import.meta.url))
    await new AsyncFunction('core', 'require', oidc.with.script)(core, requerer)
  } finally {
    process.env.GITHUB_WORKSPACE = antes.GITHUB_WORKSPACE
    process.env.RUNNER_TEMP = antes.RUNNER_TEMP
    if (antes.GITHUB_WORKSPACE === undefined) delete process.env.GITHUB_WORKSPACE
    if (antes.RUNNER_TEMP === undefined) delete process.env.RUNNER_TEMP
  }
  return registo
}

describe('o script do token', () => {
  const base = () => {
    const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'oidc-teste-'))
    const workspace = path.join(raiz, 'repo')
    const temp = path.join(raiz, '_temp')
    fs.mkdirSync(workspace)
    fs.mkdirSync(temp)
    return { raiz, workspace, temp }
  }

  test('pede o token para a audiência da API, mascara-o e escreve-o fora do checkout, só para o dono', async () => {
    const { raiz, workspace, temp } = base()
    try {
      const registo = await correr({ workspace, temp })
      const ficheiro = path.join(temp, 'anthropic-oidc-token')

      expect([...registo]).toEqual([
        ['getIDToken', 'https://api.anthropic.com'],
        ['setSecret', 'jwt.falso'],
        ['setOutput', 'ficheiro', ficheiro],
      ])
      expect(fs.readFileSync(ficheiro, 'utf-8')).toBe('jwt.falso')
      expect(fs.statSync(ficheiro).mode & 0o777).toBe(0o600)
    } finally {
      fs.rmSync(raiz, { recursive: true, force: true })
    }
  })

  test('recusa-se a escrever o token dentro do checkout', async () => {
    const { raiz, workspace } = base()
    try {
      const dentro = path.join(workspace, 'tmp')
      fs.mkdirSync(dentro)
      await expect(correr({ workspace, temp: dentro })).rejects.toThrow(/dentro do checkout/)
      expect(fs.existsSync(path.join(dentro, 'anthropic-oidc-token'))).toBe(false)
    } finally {
      fs.rmSync(raiz, { recursive: true, force: true })
    }
  })

  test('mascara o token antes de o escrever em disco', async () => {
    const { raiz, workspace, temp } = base()
    try {
      const registo = await correr({ workspace, temp })
      expect(registo.jaEstavaEmDisco).toBe(false)
    } finally {
      fs.rmSync(raiz, { recursive: true, force: true })
    }
  })
})
