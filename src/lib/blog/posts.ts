import { parsePost } from './parsePost'
import type { Lang, Post } from './types'

/* ─── Ordem editorial ────────────────────────────────────────────────────────
   Antes da migração para Markdown os artigos viviam num array no `App.tsx` e
   apareciam na lista pela ordem em que lá estavam escritos — agrupados por
   tema, não por data nem por nome de ficheiro. O nome das pastas não
   reproduz essa ordem, por isso ela fica aqui explícita. Um artigo novo que
   não esteja nesta lista vai para o fim. ──────────────────────────────────── */
export const POST_ORDER: readonly string[] = [
  'visual-identity-business-asset',
  'psychology-of-colour-brand-strategy',
  'rebranding-without-losing-audience',
  'discipline-of-editorial-design',
  'typography-as-personality',
  'anatomy-of-cinematic-brand-film',
  'short-form-video-brand-strategy',
  'pre-production-great-videos',
  'designing-for-emotion',
  'hidden-cost-slow-website',
  'event-photography-tells-story',
  'product-photography-losing-sales',
  'what-makes-podcast-worth-listening',
  'podcast-strategy-before-production',
]

const rank = (slug: string) => {
  const i = POST_ORDER.indexOf(slug)
  return i === -1 ? POST_ORDER.length : i
}

export function sortPosts(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => rank(a.slug) - rank(b.slug))
}

/* ─── Corpo em falta ─────────────────────────────────────────────────────────
   Os artigos em português ainda só têm título e excerto traduzidos; o corpo
   existe apenas em inglês. Era assim que o site funcionava antes da migração
   (um só corpo, em inglês, com o aviso em PT por cima), e é isso que se
   mantém aqui. Quando houver tradução, o `bodyHtml` do pt.md deixa de estar
   vazio e o recurso ao inglês desliga-se sozinho. ─────────────────────────── */
export function withBodyFallback(post: Post, all: Post[]): Post {
  if (post.bodyHtml) return post
  const en = all.find(p => p.slug === post.slug && p.lang === 'en')
  return en ? { ...post, bodyHtml: en.bodyHtml } : post
}

const FILES = import.meta.glob('../../../content/blog/*/*.md', {
  query: '?raw', import: 'default', eager: true,
}) as Record<string, string>

export const POSTS: Post[] = Object.entries(FILES)
  .map(([file, raw]) => {
    const m = file.match(/content\/blog\/([^/]+)\/(pt|en)\.md$/)
    return m ? parsePost(raw, m[1], m[2] as Lang) : null
  })
  .filter((p): p is Post => p !== null)

export const postsFor = (lang: Lang) => sortPosts(POSTS.filter(p => p.lang === lang))

export const postBySlug = (slug: string, lang: Lang) => {
  const post = POSTS.find(p => p.slug === slug && p.lang === lang)
  return post ? withBodyFallback(post, POSTS) : undefined
}
