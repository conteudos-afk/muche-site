/* ─── A chamada ao modelo ────────────────────────────────────────────────────
   O único ficheiro do circuito que toca na rede, e por isso o único sem teste
   automático — testá-lo seria testar o SDK. Quem o verifica é a primeira
   execução real, com um artigo só.

   Streaming porque as respostas são longas: 1800 palavras mais thinking passam
   folgadamente o tempo limite de um pedido normal. ───────────────────────── */
import Anthropic from '@anthropic-ai/sdk'
import { SISTEMA } from './prompt.mjs'

export const MODELO = 'claude-opus-5'

/* Preço por milhão de tokens, para a conta sair no fim da execução. */
const POR_MTOK_ENTRADA = 5
const POR_MTOK_SAIDA = 25

export function criarCliente(apiKey) {
  if (!apiKey) throw new Error('falta a ANTHROPIC_API_KEY')
  const anthropic = new Anthropic({ apiKey })

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
