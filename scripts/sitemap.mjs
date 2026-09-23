/* ─── sitemap.xml ─────────────────────────────────────────────────────────────
   Cada artigo existe em duas versões — pt na raiz, en debaixo de `/en` — e o
   sitemap tem de listar as duas, com o `hreflang` a dizer ao motor de busca
   que são a mesma peça em idiomas diferentes, senão arrisca-se a tratá-las
   como conteúdo duplicado em vez de traduções.

   Tal como o `head.mjs`, isto é `.mjs` simples e sem dependências: corre no
   Node, chamado pelo `prerender.mjs` depois do `vite build`, sem passar pelo
   compilador. ─────────────────────────────────────────────────────────────── */
const BASE = 'https://www.muche.pt'

const urlFor = (slug, lang) => lang === 'pt' ? `${BASE}/blog/${slug}` : `${BASE}/en/blog/${slug}`

export function buildSitemap(posts) {
  const entries = posts.map(({ slug, lang }) => `  <url>
    <loc>${urlFor(slug, lang)}</loc>
    <xhtml:link rel="alternate" hreflang="pt" href="${urlFor(slug, 'pt')}" />
    <xhtml:link rel="alternate" hreflang="en" href="${urlFor(slug, 'en')}" />
  </url>`).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
</urlset>
`
}
