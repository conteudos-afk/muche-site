import { BLOG_CATEGORIES } from './categories'
import type { PostMeta } from './types'

/* ─── Validação do frontmatter ───────────────────────────────────────────────
   O `parsePost` resolve uma chave em falta com `?? ''` e não se queixa: é o
   que tem de fazer, porque também corre no browser e um artigo mal formatado
   não pode deitar abaixo o site. Mas isso deixa passar o erro mais provável
   de todos — um `titel:` mal escrito, um ficheiro sem `date` — e o resultado
   publicado é um `<title> — Muche</title>` com descrição vazia, um cartão de
   partilha em branco e uma data que não aparece.

   O sítio para apanhar isso é o build, que já tem a máquina de falhar (ver o
   `prerender.mjs`): aqui um campo em falta é um erro, e o build não passa. A
   Parte 2 vai gerar estes ficheiros automaticamente — esta é a rede que os
   valida antes de irem para o ar.

   Devolve a lista de problemas, um por linha, em vez de lançar no primeiro:
   quem corrige o frontmatter quer ver tudo o que está mal de uma vez, não
   descobrir um problema por cada build. ──────────────────────────────────── */
const OBRIGATORIOS = ['title', 'excerpt', 'category', 'date', 'readTime'] as const

const CATEGORIAS: readonly string[] = BLOG_CATEGORIES

export function validatePosts(posts: readonly PostMeta[]): string[] {
  const problemas: string[] = []

  for (const post of posts) {
    const onde = `${post.slug}/${post.lang}.md`

    for (const campo of OBRIGATORIOS) {
      if (!String(post[campo] ?? '').trim()) {
        problemas.push(`${onde}: falta o campo "${campo}" (ou está vazio)`)
      }
    }

    /* A categoria só é comparada quando existe: um campo em falta já foi
       contado acima e repeti-lo aqui só faria barulho. */
    const categoria = String(post.category ?? '').trim()
    if (categoria && !CATEGORIAS.includes(categoria)) {
      problemas.push(
        `${onde}: a categoria "${categoria}" não é nenhuma das conhecidas — ` +
        `escolhe uma de: ${CATEGORIAS.join(', ')}`
      )
    }
  }

  return problemas
}
