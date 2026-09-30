import { parsePost } from './parsePost'
import type { Lang, Post } from './types'

/* ─── Ordem da lista ─────────────────────────────────────────────────────────
   Do mais recente para o mais antigo, pela `date` (`AAAA-MM-DD`, validada no
   build). Como o formato é o ISO, comparar os textos é comparar as datas.

   Dois artigos no mesmo dia desempatam pelo slug, e depois pela língua: um
   desempate que dependesse da ordem do `import.meta.glob` (a do sistema de
   ficheiros) faria a lista mudar sem que ninguém lhe tocasse. ─────────────── */
const comparar = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

export function sortPosts(posts: Post[]): Post[] {
  return [...posts].sort((a, b) =>
    comparar(b.date, a.date) || comparar(a.slug, b.slug) || comparar(a.lang, b.lang))
}

/* ─── Corpo em falta ─────────────────────────────────────────────────────────
   Hoje não dispara: os catorze artigos têm corpo nas duas línguas, e o
   gerador escreve sempre o `pt.md` e o `en.md` juntos. Foi escrito para o
   tempo em que os artigos em português só tinham título e excerto
   traduzidos e o corpo existia apenas em inglês (era assim que o site
   funcionava antes da migração: um só corpo, em inglês, com o aviso em PT
   por cima).

   Fica como rede de segurança para um `pt.md` com o corpo vazio: em vez de
   uma página em branco, mostra o corpo inglês e assina o empréstimo com o
   `bodyLang`. Enquanto todos os artigos tiverem corpo próprio, o `bodyLang`
   nunca existe e o aviso e o canónico alternativo nunca aparecem. ─────────────────────────────────────────────── */
export function withBodyFallback(post: Post, all: Post[]): Post {
  if (post.bodyHtml) return post
  const en = all.find(p => p.slug === post.slug && p.lang === 'en')
  /* O `bodyLang` assina o empréstimo: é por ele que a vista sabe que tem de
     avisar o leitor e o `head.mjs` sabe que o canónico da página é o do
     inglês. Quem tem corpo próprio nunca passa por aqui e fica sem a marca. */
  return en ? { ...post, bodyHtml: en.bodyHtml, bodyLang: en.lang } : post
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
