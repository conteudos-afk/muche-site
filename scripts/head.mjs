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

/* ─── Barra final ────────────────────────────────────────────────────────────
   Todos os endereços declarados aqui — `canonical`, `hreflang`, `og:url`, o
   `mainEntityOfPage` do JSON-LD — terminam em barra, porque é essa a forma
   que a Cloudflare Pages serve: as páginas saem daqui para
   `dist/blog/<slug>/index.html` e o servidor entrega-as em `/blog/<slug>/`,
   respondendo 308 a quem peça `/blog/<slug>`. Declarar a forma sem barra era
   apontar o canónico de cada página para um redirecionamento.

   A mesma escolha vale para a raiz do blog (`/blog/` e `/en/blog/`), pelo
   mesmo motivo: também ela é um `index.html` dentro de pasta. O mapa vive
   aqui, no `scripts/sitemap.mjs` e no `src/app/blog/navigate.ts` — se um dia
   mudar, muda nos três. ──────────────────────────────────────────────────── */
const articlePath = (slug, lang) => (lang === 'pt' ? `/blog/${slug}/` : `/en/blog/${slug}/`)
const listPath = (lang) => (lang === 'pt' ? '/blog/' : '/en/blog/')

/* ─── Imagem das partilhas ───────────────────────────────────────────────────
   Sem `og:image`, uma ligação partilhada no LinkedIn ou no WhatsApp sai como
   um cartão de texto — numa agência criativa, é o pior cartão possível. Por
   agora é uma imagem só, a marca sobre o fundo do site, igual para todas as
   páginas; uma imagem por artigo fica para quando os artigos tiverem arte
   própria. O `twitter:card` pede o formato grande; o resto (título,
   descrição, imagem) o Twitter/X vai buscar às etiquetas `og:`. ──────────── */
const OG_IMAGE = `${BASE}/og-default.png`
const OG_IMAGE_ALT = 'Muche — The Creative Agency'

/* ─── datePublished ──────────────────────────────────────────────────────────
   O frontmatter escreve a data como `"July 2026"`, que é o que aparece no
   ecrã. O schema.org exige ISO 8601: entregue à letra, o Google ignora a
   propriedade e regista um erro de dados estruturados na página. Aqui a data
   é convertida para `"2026-07"`; se não parsear, a propriedade fica de fora —
   um campo recomendado ausente é melhor do que um inválido. ──────────────── */
const MESES = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
}

export function isoDate(date) {
  const texto = String(date ?? '').trim()
  /* Já em ISO (`2026-07` ou `2026-07-15`) — passa como está. */
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(texto)) return texto
  const m = /^([A-Za-z]+)\s+(\d{4})$/.exec(texto)
  if (!m) return null
  const mes = MESES[m[1].toLowerCase()]
  return mes ? `${m[2]}-${mes}` : null
}

/* ─── Canónico das páginas sem corpo próprio ─────────────────────────────────
   Os artigos em português ainda não têm corpo traduzido e mostram o texto
   inglês (o `withBodyFallback`). Essas páginas são, para um motor de busca,
   duplicados da versão inglesa — e o `canonical` diz isso: aponta para o
   idioma de onde o corpo veio.

   A condição é o `bodyLang`, que só existe quando o recurso ao outro idioma
   aconteceu mesmo. No dia em que um `pt.md` ganhar corpo, o `bodyLang`
   desaparece e a página passa a ter canónico próprio sozinha, sem ninguém se
   lembrar de o mudar. ───────────────────────────────────────────────────── */
const canonicalFor = (lang, bodyLang, pathFor) =>
  bodyLang && bodyLang !== lang ? pathFor(bodyLang) : pathFor(lang)

export function buildHead({ title, excerpt, lang, slug, category, date, bodyLang }) {
  const pathPt = articlePath(slug, 'pt')
  const pathEn = articlePath(slug, 'en')
  const self = canonicalFor(lang, bodyLang, (l) => articlePath(slug, l))
  /* O `canonical` fala com os motores de busca e pode apontar para o outro
     idioma; o `og:url` fala com o Facebook e o LinkedIn, e tem de apontar para
     esta página. Se apontasse para o canónico, partilhar uma ligação portuguesa
     mostrava o cartão da página inglesa, com título e descrição em português. */
  const own = articlePath(slug, lang)
  const iso = isoDate(date)
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: excerpt,
    articleSection: category,
    ...(iso ? { datePublished: iso } : {}),
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
    `<meta property="og:url" content="${BASE}${own}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="Muche" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    `<meta property="og:image:alt" content="${esc(OG_IMAGE_ALT)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<script type="application/ld+json">${jsonLd(jsonld)}</script>`,
  ].join('\n    ')
}

/* A lista do blog é uma página como as outras e precisa das mesmas etiquetas.
   Não é um `Article`, por isso não leva o JSON-LD de artigo: leva um `Blog`,
   que é o que descreve uma coleção de textos. */
export function buildListHead({ lang }) {
  const pathPt = listPath('pt')
  const pathEn = listPath('en')
  const self = listPath(lang)
  const title = 'Blog'
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
    `<meta property="og:site_name" content="Muche" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    `<meta property="og:image:alt" content="${esc(OG_IMAGE_ALT)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
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
