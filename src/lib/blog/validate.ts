import { BLOG_CATEGORIES } from './categories.ts'
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
export const OBRIGATORIOS = ['title', 'excerpt', 'category', 'date', 'readTime'] as const

const CATEGORIAS: readonly string[] = BLOG_CATEGORIES

/* ─── A data ─────────────────────────────────────────────────────────────────
   `YYYY-MM-DD`, dia incluído: é por ela que o blog se ordena (do mais recente
   para o mais antigo), e com a precisão de um mês dois artigos da mesma
   semana empatavam.

   O formato sozinho não chega: `2026-02-30` tem o feitio certo e não existe.
   Escreve-se de volta a data a partir dos números e compara-se com o texto —
   30 de fevereiro volta como 2 de março e não coincide. É a mesma ideia do
   `lerInstante` em `scripts/prazo/decidir.mjs`. ────────────────────────── */
const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/
const ANO_MINIMO = 2000

export function ehDataISO(texto: unknown): texto is string {
  if (typeof texto !== 'string') return false
  const m = DATA_ISO.exec(texto)
  if (!m) return false
  const [ano, mes, dia] = m.slice(1, 4).map(Number)
  if (ano < ANO_MINIMO) return false

  const calendario = new Date(0)
  calendario.setUTCFullYear(ano, mes - 1, dia)
  return calendario.toISOString().slice(0, 10) === texto
}

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

    /* Tal como a categoria, só quando existe: uma data em falta já foi
       contada acima. */
    const data = String(post.date ?? '').trim()
    if (data && !ehDataISO(data)) {
      problemas.push(
        `${onde}: a data "${data}" não está no formato AAAA-MM-DD ` +
        `(por exemplo 2026-07-15), ou não existe no calendário — o blog ordena por ela`
      )
    }
  }

  return problemas
}
