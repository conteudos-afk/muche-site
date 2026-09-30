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
const ARTIGO = /^content\/blog\/[^_/][^/]*\/pt\.md$/

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
