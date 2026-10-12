import { useEffect, useState } from "react"

/* ─── A primeira pintura de uma página que já veio pintada ───────────────────
   As páginas do blog chegam como HTML completo e o `main.tsx` monta a
   aplicação por cima com `createRoot`: o React deita fora esse HTML e desenha
   o seu. O texto que estava no ecrã é substituído por texto igual — mas se o
   `motion` arrancar das animações de entrada (`initial={{ opacity: 0 }}`), o
   leitor vê o artigo, vê-o desaparecer e vê-o aparecer outra vez.

   Para isso não acontecer, a primeira pintura de uma página pré-renderizada
   nasce já no estado final (`initial={false}`). As animações de entrada
   continuam todas lá para o resto da vida da aplicação: quem vai da lista a
   um artigo, ou do artigo à lista, vê-as como sempre.

   O sinal é o `<div id="root">` ter conteúdo *antes de o React lhe tocar*.
   Por isso é lido uma única vez, quando este módulo é carregado — o `App`
   importa-o antes de o `createRoot().render()` correr. Lido mais tarde, o
   `#root` já teria sempre conteúdo, e o sinal não diria nada. ──────────────── */
export function veioPrerenderizado(raiz: Pick<Element, "hasChildNodes"> | null | undefined): boolean {
  return !!raiz && raiz.hasChildNodes()
}

/* Um sinal que vale uma só vez: a página que arrancou pré-renderizada é a
   primeira a montar; depois de ela estar no ecrã, tudo o que se monte é
   navegação e anima como sempre. Gastar o sinal é um passo à parte do ler
   (o `useEffect` abaixo) porque o React pode ler mais do que uma vez antes de
   montar, e todas essas leituras têm de dar a mesma resposta. */
export function criarPrimeiraPintura(arrancouPrerenderizado: boolean) {
  let pendente = arrancouPrerenderizado
  return {
    ler: () => pendente,
    gastar: () => { pendente = false },
  }
}

const arrancouPrerenderizado = veioPrerenderizado(
  typeof document !== "undefined" ? document.getElementById("root") : null
)

/* Só para o invólucro do `App`, que monta uma vez e nunca mais. */
export const ARRANCOU_PRERENDERIZADO = arrancouPrerenderizado

const primeiraPintura = criarPrimeiraPintura(arrancouPrerenderizado)

/* `true` na primeira página a montar, se ela veio pré-renderizada; `false`
   em todas as seguintes. Fixo durante a vida do componente. */
export function useEntradaInstantanea(): boolean {
  const [instantanea] = useState(primeiraPintura.ler)
  useEffect(() => { primeiraPintura.gastar() }, [])
  return instantanea
}
