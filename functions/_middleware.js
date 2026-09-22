/**
 * Impede que os endereços de teste sejam indexados.
 *
 * O site é servido em www.muche.pt mas também nos domínios que a Cloudflare
 * atribui automaticamente (muche-site.pages.dev e as pré-visualizações de cada
 * PR). Sem isto, o Google pode indexar essas cópias e pô-las a competir com o
 * site real como conteúdo duplicado.
 *
 * O cabeçalho só é acrescentado fora do domínio de produção, por isso o
 * www.muche.pt continua perfeitamente indexável.
 */
const DOMINIOS_DE_TESTE = [".pages.dev", ".workers.dev"]

export async function onRequest(context) {
  const resposta = await context.next()
  const { hostname } = new URL(context.request.url)

  if (!DOMINIOS_DE_TESTE.some(sufixo => hostname.endsWith(sufixo))) return resposta

  const comCabecalho = new Response(resposta.body, resposta)
  comCabecalho.headers.set("X-Robots-Tag", "noindex, nofollow")
  return comCabecalho
}
