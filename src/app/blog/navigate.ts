import type { MouseEvent } from "react"
import type { Lang } from "@/lib/blog/types"

/* ─── Navegação das vistas do blog ───────────────────────────────────────────
   As vistas do blog usam `<a href>` a sério: é o que os rastreadores seguem e
   o que faz as páginas pré-renderizadas funcionarem sem JavaScript. Mas um
   clique num `<a>` recarrega a página toda — o `App` volta a montar, o
   `isBlog` do gate do preloader deixa de valer para a rota nova e o visitante
   pode ficar até 15 segundos (o `PRELOAD_TIMEOUT_MS`) a olhar para o ecrã de
   carregamento onde antes tinha navegação instantânea.

   Daí o `onNavigate`: quando existe — o invólucro no `App.tsx` passa-o a
   partir do `useNavigate()` —, o clique é tratado pelo router e a página não
   recarrega. Quando não existe (servidor, pré-renderização, ou HTML sem
   JavaScript), o `<a>` faz o seu trabalho sozinho. As vistas continuam sem
   depender do router, que é o que lhes permite renderizar no servidor.
   ──────────────────────────────────────────────────────────────────────── */
export type OnNavigate = (href: string) => void

function linkHandler(href: string, onNavigate?: OnNavigate) {
  if (!onNavigate) return undefined
  return (event: MouseEvent) => {
    /* Ctrl/Cmd/Shift/Alt e o botão do meio abrem noutro separador ou noutra
       janela — esses cliques são do browser, não nossos. */
    if (event.defaultPrevented) return
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onNavigate(href)
  }
}

/* ─── Endereços por idioma ───────────────────────────────────────────────────
   O blog existe duas vezes: o português na raiz (`/blog`, `/blog/<slug>`) e o
   inglês debaixo de `/en` (`/en/blog`, `/en/blog/<slug>`). É o mesmo mapa que
   o `scripts/prerender.mjs` usa para decidir onde escreve cada ficheiro e o
   `scripts/sitemap.mjs` para os `<loc>` — se um dia mudar, muda nos três.

   A raiz do site (`/`) fica de fora de propósito: não há `/en` para a página
   inicial, só para o blog. ──────────────────────────────────────────────── */
export const blogHref = (lang: Lang) => (lang === "en" ? "/en/blog" : "/blog")

export const articleHref = (slug: string, lang: Lang) => `${blogHref(lang)}/${slug}`

/* ─── href + onClick de uma vez ──────────────────────────────────────────────
   Cada ligação precisa das duas coisas com o mesmo destino: o `href`, que é o
   que o rastreador segue e o que funciona sem JavaScript, e o `onClick`, que
   evita o recarregamento quando o router está montado. Passá-las à mão em
   dois sítios é um convite a que só uma delas seja atualizada — e o sintoma
   (o clique leva a um sítio, o "abrir noutro separador" leva a outro) é dos
   que passam despercebidos numa revisão. Daqui saem sempre as duas juntas. */
export function linkProps(href: string, onNavigate?: OnNavigate) {
  return { href, onClick: linkHandler(href, onNavigate) }
}
