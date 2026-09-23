/* ─── <head> das páginas pré-renderizadas ────────────────────────────────────
   O `index.html` do site traz um <head> genérico: um só <title> e uma só
   <meta description>, iguais para toda a gente. Isso chega para uma aplicação
   de uma página, onde o visitante entra sempre pela raiz, mas não chega para
   um blog: cada artigo precisa do seu título, do seu excerto, do seu endereço
   canónico e do par pt/en, senão o Google indexa catorze páginas com o mesmo
   cartão e o que aparece na pesquisa é o nome da agência, não o do artigo.

   Este módulo produz esse bloco. É `.mjs` simples e sem dependências porque é
   chamado pelo `prerender.mjs`, que corre no Node depois do `vite build`, sem
   passar pelo compilador. ─────────────────────────────────────────────────── */
const BASE = 'https://www.muche.pt'

export function buildHead({ title, excerpt, lang, slug, category, date }) {
  const pathPt = `/blog/${slug}`
  const pathEn = `/en/blog/${slug}`
  const self = lang === 'pt' ? pathPt : pathEn
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: excerpt,
    articleSection: category,
    datePublished: date,
    inLanguage: lang,
    publisher: { '@type': 'Organization', name: 'Muche', url: BASE },
    mainEntityOfPage: BASE + self,
  }
  return [
    `<title>${esc(title)} — Muche</title>`,
    `<meta name="description" content="${esc(excerpt)}" />`,
    `<link rel="canonical" href="${BASE}${self}" />`,
    `<link rel="alternate" hreflang="pt" href="${BASE}${pathPt}" />`,
    `<link rel="alternate" hreflang="en" href="${BASE}${pathEn}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(excerpt)}" />`,
    `<meta property="og:url" content="${BASE}${self}" />`,
    `<meta property="og:type" content="article" />`,
    `<script type="application/ld+json">${jsonLd(jsonld)}</script>`,
  ].join('\n    ')
}

/* A lista do blog é uma página como as outras e precisa das mesmas etiquetas.
   Não é um `Article`, por isso não leva o JSON-LD de artigo: leva um `Blog`,
   que é o que descreve uma coleção de textos. */
export function buildListHead({ lang }) {
  const pathPt = '/blog'
  const pathEn = '/en/blog'
  const self = lang === 'pt' ? pathPt : pathEn
  const title = lang === 'pt' ? 'Blog' : 'Blog'
  const excerpt = lang === 'pt'
    ? 'Textos sobre branding, design, vídeo, fotografia, web e podcast — o que aprendemos a fazer e porquê.'
    : 'Writing on branding, design, video, photography, web and podcasts — what we have learned and why.'
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `${title} — Muche`,
    description: excerpt,
    inLanguage: lang,
    publisher: { '@type': 'Organization', name: 'Muche', url: BASE },
    mainEntityOfPage: BASE + self,
  }
  return [
    `<title>${esc(title)} — Muche</title>`,
    `<meta name="description" content="${esc(excerpt)}" />`,
    `<link rel="canonical" href="${BASE}${self}" />`,
    `<link rel="alternate" hreflang="pt" href="${BASE}${pathPt}" />`,
    `<link rel="alternate" hreflang="en" href="${BASE}${pathEn}" />`,
    `<meta property="og:title" content="${esc(title)} — Muche" />`,
    `<meta property="og:description" content="${esc(excerpt)}" />`,
    `<meta property="og:url" content="${BASE}${self}" />`,
    `<meta property="og:type" content="website" />`,
    `<script type="application/ld+json">${jsonLd(jsonld)}</script>`,
  ].join('\n    ')
}

/* ─── Estado inicial das animações ───────────────────────────────────────────
   As vistas do blog animam a entrada com o `motion`: o título começa em
   `initial={{ opacity: 0, y: 24 }}` e só aparece quando o JavaScript corre.
   No servidor, o `renderToString` escreve esse estado inicial no HTML —
   `style="opacity:0;transform:translateY(24px)"` — e o resultado é uma página
   estática onde o texto está lá, mas invisível para quem não corre
   JavaScript. Ou seja, exatamente o público para quem a pré-renderização foi
   feita.

   Por isso o estado inicial é neutralizado no HTML gerado. Não há aqui risco
   de estragar as animações: o `main.tsx` usa `createRoot().render()`, não
   `hydrateRoot()`, por isso o browser deita fora este HTML e volta a desenhar
   tudo do zero assim que o JavaScript carrega. Este HTML só é visto por quem
   nunca chega a essa fase.

   As trocas são estreitas de propósito. O `opacity:0` só conta quando acaba
   ali (`(?=[;"])`), senão apanhava também o `opacity:0.5` do texto secundário;
   e o `transform` tem de vir logo a seguir a `"` ou a `;`, senão apanhava o
   `text-transform: uppercase`. ──────────────────────────────────────────── */
export function revealInitialState(html) {
  return String(html)
    .replace(/opacity:0(?=[;"])/g, 'opacity:1')
    .replace(/(?<=[";])transform:(?:translate|scale|rotate|skew|matrix)[^;"]*/g, 'transform:none')
}

/* O `JSON.stringify` não escapa `<`, e isto vai para dentro de um `<script>`:
   um título que contivesse `</script>` fechava o elemento a meio e o resto do
   JSON passava a ser lido como HTML, dentro do `<head>`. Como o frontmatter
   vem de ficheiros de conteúdo, isso é também por onde alguém injetaria
   marcação. O `\u003c` é escape de JSON válido, por isso o que sai continua a
   fazer `JSON.parse` exatamente na mesma. */
const jsonLd = (data) => JSON.stringify(data).replace(/</g, '\\u003c')

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
