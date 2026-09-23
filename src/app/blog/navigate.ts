import type { MouseEvent } from "react"

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

export function linkHandler(href: string, onNavigate?: OnNavigate) {
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
