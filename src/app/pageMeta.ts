import { COPY, langFromPath, type Lang } from "./i18n"
import { postBySlug } from "@/lib/blog/posts"
import { fullTitle, listMeta } from "../../scripts/head.mjs"

/* ─── Título e descrição de cada página ──────────────────────────────────────
   O `prerender.mjs` escreve no HTML de cada página do blog o `<title>` e a
   `<meta description>` dela. Quando o JavaScript carrega, é o cliente que os
   mantém — e até aqui fazia-o só por idioma: voltava a pôr o título genérico do
   site em cima do do artigo, e quem tinha vários separadores abertos via
   «Muche — Agência Criativa» em todos.

   Esta função diz, para um endereço e um idioma, qual é o título certo. Para o
   blog devolve o mesmo texto que o `head.mjs` pôs no HTML (vem de lá, não é
   recomposto: ver o comentário em `fullTitle`); fora do blog, o genérico do
   site. ───────────────────────────────────────────────────────────────────── */
export interface PageMeta { title: string; description: string }

const ARTIGO = /^\/(?:en\/)?blog\/([^/]+)\/?$/
const LISTA = /^\/(?:en\/)?blog\/?$/

/* O `useParams` do router entrega o slug já descodificado; aqui o endereço vem
   cru. Um `%` mal formado não pode deitar abaixo o efeito que escreve o título. */
function descodificar(slug: string): string {
  try { return decodeURIComponent(slug) } catch { return slug }
}

export function pageMeta(pathname: string, lang: Lang): PageMeta {
  /* No blog o idioma é o do endereço. Na navegação por histórico o `lang` do
     estado só alcança o endereço um render depois, e sem isto o título saía
     uma vez com o idioma errado. */
  const l = langFromPath(pathname) ?? lang

  const artigo = ARTIGO.exec(pathname)
  if (artigo) {
    const post = postBySlug(descodificar(artigo[1]), l)
    if (post) return { title: fullTitle(post.title), description: post.excerpt }
    /* Artigo que não existe: a página diz «não encontrado», e o título é o do
       site, não o de um artigo inventado a partir do endereço. */
  } else if (LISTA.test(pathname)) {
    const { title, description } = listMeta(l)
    return { title: fullTitle(title), description }
  }
  return COPY[l].meta
}
