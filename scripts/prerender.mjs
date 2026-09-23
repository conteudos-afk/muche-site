/* ─── Pré-renderização do blog ───────────────────────────────────────────────
   O site é uma aplicação de uma página: o servidor entrega sempre o mesmo
   `index.html`, com um `<div id="root">` vazio, e é o JavaScript que desenha
   o conteúdo já no browser. Para um visitante isso é indiferente; para quem
   lê o HTML e não corre JavaScript — rastreadores, pré-visualizações de links
   no WhatsApp e no LinkedIn, leitores de RSS — o blog simplesmente não existe.

   Este script corre depois do `vite build` e resolve isso ficheiro a ficheiro:
   pega no `dist/index.html` como molde, desenha cada artigo com o
   `renderToString`, mete o resultado dentro do `<div id="root">` e troca o
   `<head>` genérico do site pelas etiquetas próprias da página. O resultado
   são páginas completas em `dist/blog/<slug>/index.html` (pt) e
   `dist/en/blog/<slug>/index.html` (en), mais as duas listas.

   O JavaScript continua a carregar por cima e a aplicação arranca como
   sempre; a diferença é que o texto já lá está antes disso. ──────────────── */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { buildHead, buildListHead, revealInitialState } from './head.mjs'
import { buildSitemap } from './sitemap.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const SSR_ENTRY = path.join(ROOT, 'dist-ssr', 'entry-server.js')
const TEMPLATE = path.join(DIST, 'index.html')

/* ─── Avisos do leitor de frontmatter ────────────────────────────────────────
   O `parsePost` avisa no `console` quando encontra um cabeçalho que não sabe
   ler, mas não lança: também corre no browser, e um artigo mal formatado não
   pode deitar abaixo o site. Aqui, no build, o cálculo é outro — um aviso é
   um artigo que vai para produção com um campo errado, e ninguém lê o registo
   de um build que passou. Por isso os avisos são contados e, se houver algum,
   o build termina com erro.

   O embrulho apanha todos os `console.warn` do processo — os do React, os do
   `motion` e os do `marked` durante os 30 `renderToString` inclusive —, e
   nenhum desses é um erro de frontmatter. Por isso só são acumulados os que o
   `parsePost` assina com `[blog] `; os outros passam para o `console` como
   sempre, sem rebentar o build com um diagnóstico que apontaria ao sítio
   errado. ───────────────────────────────────────────────────────────────── */
const ASSINATURA = '[blog] '
const avisos = []
const warnOriginal = console.warn
console.warn = (...args) => {
  const mensagem = args.map(String).join(' ')
  if (mensagem.startsWith(ASSINATURA)) avisos.push(mensagem)
  warnOriginal.apply(console, args)
}

const rel = (p) => path.relative(ROOT, p) || p

function falhar(mensagem) {
  console.error(`\n[prerender] ${mensagem}\n`)
  process.exit(1)
}

if (!fs.existsSync(TEMPLATE)) falhar(`falta o molde ${rel(TEMPLATE)} — corre o \`vite build\` primeiro`)
if (!fs.existsSync(SSR_ENTRY)) falhar(`falta o bundle ${rel(SSR_ENTRY)} — corre o \`vite build --ssr\` primeiro`)

const molde = fs.readFileSync(TEMPLATE, 'utf-8')

/* O `import.meta.glob` do `posts.ts` só existe depois do Vite, por isso os
   artigos vêm do bundle compilado — e é ao importá-lo que o `parsePost` corre
   e os avisos (se os houver) aparecem. */
const { renderArticle, renderList, postsFor, postBySlug, LANGS } =
  await import(pathToFileURL(SSR_ENTRY).href)

/* ─── Molde → página ─────────────────────────────────────────────────────────
   Cada troca é verificada: um `replace` que não encontra nada devolve a string
   original sem se queixar, e o resultado seria uma página publicada com o
   `<div id="root">` vazio ou com o `<title>` do site em vez do do artigo. Com
   a verificação, uma mudança no `index.html` que parta isto rebenta o build em
   vez de sair em silêncio para produção. */
function trocar(html, procura, substituto, oQue) {
  /* Procurar antes de trocar, e não comparar o antes com o depois: uma troca
     pode ser legitimamente idempotente — o molde já vem com `lang="pt"` e nas
     páginas pt o resultado é igual ao original. */
  const encontrou = typeof procura === 'string' ? html.includes(procura) : procura.test(html)
  if (!encontrou) falhar(`não encontrei ${oQue} no molde ${rel(TEMPLATE)}`)
  /* A substituição vai como função para o HTML do artigo entrar à letra: em
     forma de string, um `$&` ou um `$1` no texto seria interpretado. */
  return html.replace(procura, () => substituto)
}

function montarPagina({ head, body, lang }) {
  let html = molde
  html = trocar(html, /<html lang="[^"]*"/, `<html lang="${lang}"`, 'o `<html lang>`')
  html = trocar(html, /[ \t]*<title>[\s\S]*?<\/title>[ \t]*\r?\n/, '', 'o `<title>` genérico')
  html = trocar(html, /[ \t]*<meta name="description"[^>]*>[ \t]*\r?\n/, '', 'a `<meta description>` genérica')
  html = trocar(html, '</head>', `  ${head}\n    </head>`, 'o fecho do `<head>`')
  html = trocar(html, '<div id="root"></div>', `<div id="root">${revealInitialState(body)}</div>`, 'o `<div id="root">`')
  return html
}

function escrever(destino, html) {
  const ficheiro = path.join(DIST, ...destino, 'index.html')
  fs.mkdirSync(path.dirname(ficheiro), { recursive: true })
  fs.writeFileSync(ficheiro, html)
  return ficheiro
}

/* pt vive na raiz (`/blog`), en vive debaixo de `/en`. */
const prefixo = (lang) => (lang === 'pt' ? [] : [lang])

/* Para o sitemap, que quer os dois idiomas de cada artigo numa lista só,
   independentemente das páginas que o loop abaixo vai escrevendo. */
const todosOsPosts = []

let escritos = 0
for (const lang of LANGS) {
  const posts = postsFor(lang)
  for (const { slug } of posts) todosOsPosts.push({ slug, lang })

  const lista = montarPagina({
    head: buildListHead({ lang }),
    body: renderList(posts, lang),
    lang,
  })
  console.log(`  ${rel(escrever([...prefixo(lang), 'blog'], lista))}`)
  escritos++

  for (const { slug } of posts) {
    /* `postBySlug`, não o post da lista: é ele que traz o corpo inglês para os
       artigos pt que ainda não estão traduzidos. */
    const post = postBySlug(slug, lang)
    if (!post) falhar(`o artigo "${slug}" (${lang}) desapareceu entre a lista e a página`)
    if (!post.bodyHtml) falhar(`o artigo "${slug}" (${lang}) ficou sem corpo — a página sairia vazia`)

    const pagina = montarPagina({
      head: buildHead({
        title: post.title,
        excerpt: post.excerpt,
        lang,
        slug: post.slug,
        category: post.category,
        date: post.date,
      }),
      body: renderArticle(post, lang),
      lang,
    })
    console.log(`  ${rel(escrever([...prefixo(lang), 'blog', slug], pagina))}`)
    escritos++
  }
}

/* O `sitemap.xml` fica na raiz do `dist`, não num `index.html` dentro de
   pasta — por isso não usa o `escrever()` de cima, mas segue o mesmo padrão:
   cria a pasta de destino (aqui, já existe) e grava o ficheiro. */
const sitemapDestino = path.join(DIST, 'sitemap.xml')
fs.mkdirSync(path.dirname(sitemapDestino), { recursive: true })
fs.writeFileSync(sitemapDestino, buildSitemap(todosOsPosts))
console.log(`  ${rel(sitemapDestino)}`)

console.warn = warnOriginal

if (avisos.length > 0) {
  falhar(
    `${avisos.length} aviso(s) do leitor de frontmatter durante o build.\n` +
    `Um cabeçalho mal escrito dá um campo errado em produção, por isso aqui é erro.\n` +
    avisos.map(a => `  - ${a}`).join('\n')
  )
}

console.log(`\n✓ pré-renderizadas ${escritos} páginas do blog\n`)
