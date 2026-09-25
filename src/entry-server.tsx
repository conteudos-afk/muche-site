/* ─── Entrada do servidor ────────────────────────────────────────────────────
   O `prerender.mjs` corre no Node e precisa de duas coisas que só existem
   depois de passarem pelo Vite: os componentes do blog, escritos em TSX, e os
   artigos, que o `posts.ts` carrega com `import.meta.glob` — uma função do
   Vite, não do Node. Por isso o caminho não é o Node importar o `src/`
   diretamente: é o `vite build --ssr` compilar este ficheiro para
   `dist-ssr/entry-server.js`, e o script importar de lá.

   As vistas são renderizadas sem `onNavigate`. É essa prop que troca o clique
   num `<a href>` por navegação do router, e no HTML estático não há router:
   sem ela, os `<a href>` ficam links a sério — que é o que um rastreador
   segue e o que faz as páginas funcionarem antes de o JavaScript carregar.
   ──────────────────────────────────────────────────────────────────────── */
import { renderToString } from 'react-dom/server'
import { ArticleView } from './app/blog/ArticleView'
import { BlogListView } from './app/blog/BlogListView'
import { POSTS, postsFor, postBySlug } from './lib/blog/posts'
import { validatePosts } from './lib/blog/validate'
import type { Lang, Post } from './lib/blog/types'

/* Reexportados para o `prerender.mjs`: o `postsFor` traz a ordem editorial
   (`sortPosts`) e o `postBySlug` traz o corpo inglês nos artigos PT que ainda
   não estão traduzidos (`withBodyFallback`). Filtrar o `POSTS` à mão perderia
   as duas coisas.

   O `POSTS` e o `validatePosts` vão juntos e servem só para a validação do
   frontmatter no build: a lista por validar, e quem a valida. */
export { POSTS, postsFor, postBySlug, validatePosts }

export const LANGS: readonly Lang[] = ['pt', 'en']

export function renderArticle(post: Post, lang: Lang): string {
  return renderToString(<ArticleView post={post} lang={lang} />)
}

export function renderList(posts: Post[], lang: Lang): string {
  return renderToString(<BlogListView posts={posts} lang={lang} />)
}
