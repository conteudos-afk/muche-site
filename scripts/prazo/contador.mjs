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
export const BOTS = [
  'github-actions[bot]',
  'cloudflare-workers-and-pages[bot]',
  'cloudflare-pages[bot]',
]

export function contarArtigos(ficheiros) {
  return ficheiros.filter(f => ARTIGO.test(f.path)).length
}
