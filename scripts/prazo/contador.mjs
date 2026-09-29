/* ─── Quantos artigos já saíram ──────────────────────────────────────────────
   A rampa precisa de um número, e a tentação é guardá-lo num ficheiro. Não se
   guarda: um contador em ficheiro desalinha-se do que aconteceu mesmo, e o que
   ele controla é merge automático — é o pior sítio do sistema para ter um
   número em que não se pode confiar.

   Conta-se a partir do que o GitHub sabe: os PRs já juntados com a etiqueta, e
   dentro de cada um os `pt.md` que ele mexeu. Um artigo = um `pt.md`, porque
   todos os artigos têm as duas línguas. ─────────────────────────────────── */

/* Um nível de pasta, sem underscore no início — é o mesmo critério que o
   `loadPosts` usa para decidir o que é um artigo. */
const PASTA = String.raw`content/blog/[^_/][^/]*`
const ARTIGO = new RegExp(`^${PASTA}/pt\\.md$`)

/* O que um PR de artigos pode mexer, e mais nada: os dois ficheiros de cada
   artigo, e a lista de temas que o gerador marca. É a mesma definição de
   «artigo» que o contador usa (`PASTA`), de propósito — duas definições
   desalinham-se, e este é o portão do merge automático. */
const PERMITIDO = new RegExp(`^(?:${PASTA}/(?:pt|en)\\.md|content/blog/_temas\\.yml)$`)

/* Só se junta sozinho quem acrescenta ou edita. Apagar um artigo, ou
   renomear (o `path` do `gh` é o destino: um rename de `src/x.ts` para
   `content/blog/a/pt.md` pareceria um artigo e apagaria o `x.ts`), fica para
   uma pessoa. */
const ALTERACOES_PERMITIDAS = ['ADDED', 'MODIFIED']

/* O `gh pr view --json files` devolve no máximo 100 ficheiros. Uma lista
   dessa dimensão pode estar cortada e esconder o que interessa, por isso
   trata-se como fora de âmbito. Um PR de artigos tem meia dúzia. */
const MAXIMO_FICHEIROS = 100

export const ETIQUETA = 'artigo-automatico'
export const MARCA_AVISO = '<!-- prazo-artigos: aviso-24h -->'

/* Autores de comentários que não são pessoas, SEM o sufixo `[bot]`. O `gh pr
   view --json comments` devolve o login da Cloudflare como
   `cloudflare-workers-and-pages`, sem sufixo; a API REST devolve-o com
   `[bot]`. Em vez de listar as duas grafias, `ehBot` tira o sufixo antes de
   comparar — funciona seja qual for a forma que chegue. (O `github-actions`
   tem o mesmo problema e não há aqui nenhum comentário dele para confirmar
   qual das formas o `gh` usa, que é justamente porque se normaliza.) */
export const BOTS = [
  'github-actions',
  'cloudflare-workers-and-pages',
]

/* `login` é o `author.login` de um comentário. Sem autor (conta apagada) não
   está na lista, logo devolve `false`: trata-se como humano, e um comentário
   humano pára o relógio — o lado seguro de errar. */
export function ehBot(login) {
  return BOTS.includes(String(login).toLowerCase().replace(/\[bot\]$/, ''))
}

/* `ficheiros` é o `files` do `gh pr view --json files`: objetos com `path` e
   `changeType` (ADDED, MODIFIED, DELETED, RENAMED, COPIED, CHANGED).

   Só conta um `pt.md` ADDED. Alterar, apagar ou renomear um artigo que já
   existia não publica nenhum artigo novo, e ler isso como novo faz o número
   subir sem que ninguém tenha aprovado nada — o PR #18 alterou 14 `pt.md`.
   Um ficheiro SEM `changeType` também não conta, de propósito: se o formato
   do `gh` mudar, o contador lê baixo e a rampa demora mais a acabar, em vez
   de ler alto e juntar coisas que ninguém aprovou. */
export function contarArtigos(ficheiros) {
  return ficheiros.filter(f => f.changeType === 'ADDED' && ARTIGO.test(f.path)).length
}

/* Devolve `null` se tudo o que o PR mexe é conteúdo de artigos, ou o motivo
   (com o caminho do primeiro ficheiro a mais) se houver alguma coisa fora.
   Sem isto, um PR com um artigo e uma alteração a `scripts/prazo/` ou a
   `package.json` juntava-se sozinho, com a pré-visualização a parecer só um
   artigo. Uma lista que não seja lista também é fora de âmbito. */
export function foraDoAmbito(ficheiros) {
  if (!Array.isArray(ficheiros)) return 'lista de ficheiros do PR inválida'
  if (ficheiros.length >= MAXIMO_FICHEIROS) {
    return `o PR mexe em ${ficheiros.length} ficheiros — a lista pode estar cortada`
  }
  const fora = ficheiros.filter(f =>
    typeof f?.path !== 'string' || !PERMITIDO.test(f.path) || !ALTERACOES_PERMITIDAS.includes(f.changeType))
  if (fora.length === 0) return null
  /* Até três caminhos: quem lê o registo percebe logo porquê, e o primeiro
     nem sempre é o que importa (um `scripts/prazo/` pode vir depois de um
     `src/`). */
  const nomes = fora.slice(0, 3).map(f => `${String(f?.path)} [${String(f?.changeType)}]`).join(', ')
  const mais = fora.length > 3 ? ` (e mais ${fora.length - 3})` : ''
  return `fora do âmbito dos artigos: ${nomes}${mais}`
}
