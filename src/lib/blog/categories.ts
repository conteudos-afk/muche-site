/* ─── Categorias do blog ─────────────────────────────────────────────────────
   A lista vivia no `BlogListView`, que é quem desenha os filtros. Mudou-se
   para aqui porque deixou de ser só um detalhe da vista: é também o conjunto
   de valores que o `validate.ts` aceita no frontmatter, e um módulo de
   validação não deve depender de um componente React para saber o que é uma
   categoria válida.

   O valor fica em inglês nos ficheiros de conteúdo — é a chave pela qual se
   filtra. Só a etiqueta no ecrã é traduzida (ver `translateCategory` no
   `i18n.tsx`). ──────────────────────────────────────────────────────────── */
export const BLOG_CATEGORIES = [
  "Branding & Visual Identity",
  "Graphic Design",
  "Video Production",
  "Web Design",
  "Photography & Events",
  "Podcasts",
] as const

export type BlogCategory = typeof BLOG_CATEGORIES[number]
