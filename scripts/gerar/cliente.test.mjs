import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { criarCliente } from './cliente.mjs'

/* O que se testa aqui é a autenticação, e só ela: com a configuração de cada
   ambiente, que cabeçalho o SDK acaba por mandar. O `fetch` é falso, por isso
   não há rede nem chave verdadeira: os valores abaixo são inventados e a
   chamada ao modelo nunca sai da máquina. */

const CHAVE_FALSA = 'chave-falsa-so-para-testes'
const JWT_FALSO = 'jwt.falso.so-para-testes'
const ACESSO_FALSO = 'acesso-falso-so-para-testes'

const FEDERACAO = {
  ANTHROPIC_FEDERATION_RULE_ID: 'fdrl_teste',
  ANTHROPIC_ORGANIZATION_ID: 'org-teste',
  ANTHROPIC_SERVICE_ACCOUNT_ID: 'svac_teste',
  ANTHROPIC_WORKSPACE_ID: 'wrkspc_teste',
}

/* Uma resposta em streaming mínima, no formato que o SDK espera. */
const SSE = [
  ['message_start', { type: 'message_start', message: { id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1000, output_tokens: 1 } } }],
  ['content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }],
  ['content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Olá.' } }],
  ['content_block_stop', { type: 'content_block_stop', index: 0 }],
  ['message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 500 } }],
  ['message_stop', { type: 'message_stop' }],
].map(([evento, dados]) => `event: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`).join('')

/* Regista todos os pedidos. Responde à troca de token e ao pedido ao modelo;
   qualquer outro endereço rebenta o teste, para uma chamada inesperada não
   passar despercebida. */
function fetchFalso() {
  const pedidos = []
  const fn = async (url, init = {}) => {
    const u = String(url)
    const cabecalhos = new Headers(init.headers)
    const corpo = init.body ? String(init.body) : ''
    pedidos.push({ url: u, cabecalhos, corpo })
    if (u.endsWith('/v1/oauth/token')) {
      return new Response(JSON.stringify({ access_token: ACESSO_FALSO, token_type: 'Bearer', expires_in: 3600 }), {
        status: 200, headers: { 'content-type': 'application/json' },
      })
    }
    if (u.includes('/v1/messages')) {
      return new Response(SSE, { status: 200, headers: { 'content-type': 'text/event-stream' } })
    }
    throw new Error(`pedido inesperado: ${u}`)
  }
  fn.pedidos = pedidos
  fn.aoModelo = () => pedidos.filter(p => p.url.includes('/v1/messages'))
  fn.trocas = () => pedidos.filter(p => p.url.endsWith('/v1/oauth/token'))
  return fn
}

let ambiente, pasta

/* Parte de um ambiente limpo: nenhuma variável `ANTHROPIC_*` da máquina de
   quem corre os testes, e uma pasta de configuração vazia para o SDK não
   encontrar um perfil verdadeiro. Os valores nunca são lidos nem escritos
   em lado nenhum. */
beforeEach(() => {
  ambiente = { ...process.env }
  for (const nome of Object.keys(process.env)) {
    if (nome.startsWith('ANTHROPIC_')) delete process.env[nome]
  }
  pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'cliente-teste-'))
  process.env.ANTHROPIC_CONFIG_DIR = pasta
})

afterEach(() => {
  for (const nome of Object.keys(process.env)) {
    if (!(nome in ambiente)) delete process.env[nome]
  }
  Object.assign(process.env, ambiente)
  fs.rmSync(pasta, { recursive: true, force: true })
})

const definir = vars => Object.assign(process.env, vars)
const escreverToken = () => {
  const ficheiro = path.join(pasta, 'token-oidc')
  fs.writeFileSync(ficheiro, `${JWT_FALSO}\n`)
  return ficheiro
}

describe('sem nenhuma credencial', () => {
  test('falha logo, com uma mensagem que diz o que falta, sem fazer nenhum pedido', async () => {
    const fetch = fetchFalso()
    await expect(criarCliente({ fetch })).rejects.toThrow(/ANTHROPIC_FEDERATION_RULE_ID.*ANTHROPIC_API_KEY/s)
    expect(fetch.pedidos).toHaveLength(0)
  })

  test('uma chave vazia ou só com espaços conta como ausente (é o que um secret inexistente dá no Actions)', async () => {
    definir({ ANTHROPIC_API_KEY: '   ' })
    await expect(criarCliente({ fetch: fetchFalso() })).rejects.toThrow(/não há credenciais/)
    definir({ ANTHROPIC_API_KEY: '' })
    await expect(criarCliente({ fetch: fetchFalso() })).rejects.toThrow(/não há credenciais/)
  })

  test('uma federação a meio (falta a organização) não conta como configurada', async () => {
    definir({ ANTHROPIC_FEDERATION_RULE_ID: 'fdrl_teste' })
    await expect(criarCliente({ fetch: fetchFalso() })).rejects.toThrow(/não há credenciais/)
  })
})

describe('só com ANTHROPIC_API_KEY (execução local)', () => {
  test('manda a chave em x-api-key, sem Authorization e sem trocar token nenhum', async () => {
    definir({ ANTHROPIC_API_KEY: CHAVE_FALSA })
    const fetch = fetchFalso()
    const cliente = await criarCliente({ fetch })
    const { texto, custo } = await cliente.pedir('olá')

    expect(texto).toBe('Olá.')
    expect(custo).toBeCloseTo(0.005 + 0.0125, 6)
    expect(fetch.trocas()).toHaveLength(0)
    const [pedido] = fetch.aoModelo()
    expect(pedido.cabecalhos.get('x-api-key')).toBe(CHAVE_FALSA)
    expect(pedido.cabecalhos.get('authorization')).toBeNull()
  })
})

describe('com a federação de identidade (GitHub Actions)', () => {
  test('troca o token do ficheiro por um acesso e manda-o em Authorization, sem x-api-key', async () => {
    definir({ ...FEDERACAO, ANTHROPIC_IDENTITY_TOKEN_FILE: escreverToken() })
    const fetch = fetchFalso()
    const cliente = await criarCliente({ fetch })
    const { texto } = await cliente.pedir('olá')

    expect(texto).toBe('Olá.')

    const [troca] = fetch.trocas()
    expect(JSON.parse(troca.corpo)).toEqual({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: JWT_FALSO,
      federation_rule_id: 'fdrl_teste',
      organization_id: 'org-teste',
      service_account_id: 'svac_teste',
      workspace_id: 'wrkspc_teste',
    })

    const [pedido] = fetch.aoModelo()
    expect(pedido.cabecalhos.get('authorization')).toBe(`Bearer ${ACESSO_FALSO}`)
    expect(pedido.cabecalhos.get('x-api-key')).toBeNull()
  })

  test('o token do ficheiro nunca vai no pedido ao modelo, só o acesso trocado', async () => {
    definir({ ...FEDERACAO, ANTHROPIC_IDENTITY_TOKEN_FILE: escreverToken() })
    const fetch = fetchFalso()
    await (await criarCliente({ fetch })).pedir('olá')

    const [pedido] = fetch.aoModelo()
    expect(JSON.stringify([...pedido.cabecalhos])).not.toContain(JWT_FALSO)
    expect(pedido.corpo).not.toContain(JWT_FALSO)
  })

  test('um ficheiro de token em falta falha no primeiro pedido, com o erro do SDK e antes de falar com o modelo', async () => {
    definir({ ...FEDERACAO, ANTHROPIC_IDENTITY_TOKEN_FILE: path.join(pasta, 'nao-existe') })
    const fetch = fetchFalso()
    const cliente = await criarCliente({ fetch })

    await expect(cliente.pedir('olá')).rejects.toThrow(/identity token file/i)
    expect(fetch.aoModelo()).toHaveLength(0)
  })
})

describe('com as duas', () => {
  test('a chave ganha à federação, como no SDK (no workflow não há chave, por isso não há ambiguidade)', async () => {
    definir({ ...FEDERACAO, ANTHROPIC_IDENTITY_TOKEN_FILE: escreverToken(), ANTHROPIC_API_KEY: CHAVE_FALSA })
    const fetch = fetchFalso()
    await (await criarCliente({ fetch })).pedir('olá')

    expect(fetch.trocas()).toHaveLength(0)
    expect(fetch.aoModelo()[0].cabecalhos.get('x-api-key')).toBe(CHAVE_FALSA)
  })
})
