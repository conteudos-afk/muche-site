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
  /* O idioma de onde o corpo veio, quando não foi o da própria página — é o
     `withBodyFallback` que o marca, nos artigos pt que ainda mostram o texto
     inglês. Ausente quando a página tem corpo próprio, que é o caso normal.

     É esta marca — e não `lang === 'pt'` — que decide o aviso no ecrã e o
     `canonical` dessas páginas: no dia em que um `pt.md` ganhar corpo, ela
     deixa de existir e as duas coisas corrigem-se sozinhas. */
  bodyLang?: Lang
}
