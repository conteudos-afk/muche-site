export type Lang = 'pt' | 'en'

export interface PostMeta {
  slug: string
  lang: Lang
  title: string
  excerpt: string
  category: string
  date: string
  readTime: string
}

export interface Post extends PostMeta {
  bodyHtml: string
}
