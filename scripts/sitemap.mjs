/* ─── sitemap.xml ─────────────────────────────────────────────────────────────
   Cada artigo existe em duas versões — pt na raiz, en debaixo de `/en` — e o
   sitemap tem de listar as duas, com o `hreflang` a dizer ao motor de busca
   que são a mesma peça em idiomas diferentes, senão arrisca-se a tratá-las
   como conteúdo duplicado em vez de traduções.

   O mesmo vale para as duas páginas de lista (`/blog` e `/en/blog`): são elas
   que agregam e ligam a todo o resto do blog, por isso entram sempre no
   sitemap — mesmo que `posts` venha vazio —, e não só os artigos.

   Tal como o `head.mjs`, isto é `.mjs` simples e sem dependências: corre no
   Node, chamado pelo `prerender.mjs` depois do `vite build`, sem passar pelo
   compilador. ─────────────────────────────────────────────────────────────── */
const BASE = 'https://www.muche.pt'

const urlFor = (slug, lang) => lang === 'pt' ? `${BASE}/blog/${slug}` : `${BASE}/en/blog/${slug}`
const listUrlFor = (lang) => lang === 'pt' ? `${BASE}/blog` : `${BASE}/en/blog`

/* Uma entrada `<url>` por página, com o par pt/en em `xhtml:link` — `loc` é
   qual dos dois é esta entrada; `locPt`/`locEn` são sempre os dois endereços,
   para que os dois `hreflang` apareçam nas duas entradas do par. */
const urlEntry = (loc, locPt, locEn) => `  <url>
    <loc>${loc}</loc>
    <xhtml:link rel="alternate" hreflang="pt" href="${locPt}" />
    <xhtml:link rel="alternate" hreflang="en" href="${locEn}" />
  </url>`

export function buildSitemap(posts) {
  const listas = [
    urlEntry(listUrlFor('pt'), listUrlFor('pt'), listUrlFor('en')),
    urlEntry(listUrlFor('en'), listUrlFor('pt'), listUrlFor('en')),
  ]
  const artigos = posts.map(({ slug, lang }) =>
    urlEntry(urlFor(slug, lang), urlFor(slug, 'pt'), urlFor(slug, 'en')))

  const entries = [...listas, ...artigos].join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
</urlset>
`
}
