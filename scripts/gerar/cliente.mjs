/* ─── A chamada ao modelo ────────────────────────────────────────────────────
   O único ficheiro do circuito que toca na rede. O `pedir` não tem teste
   automático — testá-lo seria testar o SDK —, mas a autenticação tem: o que se
   verifica aqui é que, com a configuração de cada ambiente, o SDK acaba a
   mandar o cabeçalho certo. Quem verifica a rede é a primeira execução real.

   Streaming porque as respostas são longas: 1800 palavras mais thinking passam
   folgadamente o tempo limite de um pedido normal.

   AUTENTICAÇÃO. Este ficheiro não guarda nem passa credencial nenhuma: o SDK
   descobre sozinho, pela ordem em que o próprio documenta.

   - No GitHub Actions, por federação de identidade (OIDC). O workflow põe no
     ambiente `ANTHROPIC_FEDERATION_RULE_ID`, `ANTHROPIC_ORGANIZATION_ID` e
     companhia, e a **localização** (não o conteúdo) do ficheiro com o token
     em `ANTHROPIC_IDENTITY_TOKEN_FILE`. O SDK lê o token e troca-o por um
     acesso de curta duração. Não há chave guardada que possa caducar.
   - Numa máquina de desenvolvimento não há fornecedor de OIDC, e aí serve a
     `ANTHROPIC_API_KEY` do ambiente, que o SDK também lê sozinho. Nada aqui a
     proíbe: o código não a lê nem a passa, só deixa o SDK vê-la.

   Se houver as duas, a chave ganha à federação (é a ordem do SDK). No
   workflow não se define a chave, e por isso não há ambiguidade. ──────────── */
import Anthropic from '@anthropic-ai/sdk'
import { loadConfig } from '@anthropic-ai/sdk/core/credentials'
import { SISTEMA } from './prompt.mjs'

export const MODELO = 'claude-opus-5'

/* Preço por milhão de tokens, para a conta sair no fim da execução. */
const POR_MTOK_ENTRADA = 5
const POR_MTOK_SAIDA = 25

/* O mesmo critério do SDK para uma variável de ambiente estar definida: sem
   espaços nas pontas, e vazia conta como ausente (um secret que não existe
   chega ao runner como `""`, não como variável em falta). */
const definida = nome => Boolean(process.env[nome]?.trim())

/* Falha cedo e com mensagem nossa quando não há nenhuma credencial, em vez de
   deixar o SDK queixar-se no primeiro pedido com um texto genérico em inglês.

   Não repete as regras do SDK: a chave e o token estáticos são só duas
   variáveis, e tudo o resto (ficheiro de perfil, `ANTHROPIC_PROFILE`, a
   configuração montada a partir das variáveis da federação) pergunta-se ao
   próprio `loadConfig` dele, que lê ficheiros e variáveis mas não vai à rede.
   Uma réplica das regras daria erros falsos no dia em que o SDK as mudasse.

   O que isto **não** apanha, de propósito: uma configuração presente mas
   errada — o ficheiro do token vazio, a regra de federação recusada. Isso só
   se sabe trocando o token, o que é a primeira coisa que o primeiro pedido faz
   e acontece antes de qualquer geração paga, com o erro do próprio SDK. */
export async function verificarCredenciais() {
  if (definida('ANTHROPIC_API_KEY') || definida('ANTHROPIC_AUTH_TOKEN')) return
  if (await loadConfig()) return

  throw new Error(
    'não há credenciais da Anthropic configuradas. ' +
    'No GitHub Actions: o workflow tem de definir ANTHROPIC_FEDERATION_RULE_ID e ' +
    'ANTHROPIC_ORGANIZATION_ID e apontar ANTHROPIC_IDENTITY_TOKEN_FILE para o token OIDC. ' +
    'Numa máquina local: define ANTHROPIC_API_KEY.',
  )
}

/* `opcoes` vai direto para o SDK. Existe para os testes poderem injetar um
   `fetch` falso; em produção chama-se sem argumentos. */
export async function criarCliente(opcoes = {}) {
  await verificarCredenciais()
  const anthropic = new Anthropic(opcoes)

  return {
    async pedir(prompt) {
      const stream = anthropic.messages.stream({
        model: MODELO,
        max_tokens: 16000,
        thinking: { type: 'adaptive' },
        system: SISTEMA,
        messages: [{ role: 'user', content: prompt }],
      })

      const mensagem = await stream.finalMessage()

      if (mensagem.stop_reason === 'max_tokens') {
        throw new Error('a resposta foi cortada no limite de tokens — o artigo ficaria incompleto')
      }
      if (mensagem.stop_reason === 'refusal') {
        throw new Error('o modelo recusou o pedido')
      }

      const texto = mensagem.content
        .filter(bloco => bloco.type === 'text')
        .map(bloco => bloco.text)
        .join('')

      if (!texto.trim()) throw new Error('a resposta não trouxe texto nenhum')

      const custo =
        (mensagem.usage.input_tokens / 1e6) * POR_MTOK_ENTRADA +
        (mensagem.usage.output_tokens / 1e6) * POR_MTOK_SAIDA

      return { texto, custo }
    },
  }
}
