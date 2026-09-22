# Blog — Fundação (pré-renderização) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer com que cada artigo do blog seja servido como HTML estático, com texto completo, metadados próprios e dados estruturados, em português e inglês, em URLs separados.

**Architecture:** O conteúdo sai do array `POSTS` do `App.tsx` para ficheiros Markdown por artigo e idioma. Os componentes do blog são extraídos para um módulo sem dependências do browser. Um script de build corre depois do `vite build`, lê os ficheiros, renderiza cada artigo com `react-dom/server` e escreve HTML estático em `dist/`, mais `sitemap.xml` e `robots.txt`.

**Tech Stack:** Vite 6, React 18, react-router 7, framer-motion, `gray-matter` (frontmatter), `marked` (Markdown→HTML), `vitest` (testes).

## Global Constraints

- Sem diferença visual nas páginas do blog face ao estado atual. Capturar antes, comparar depois.
- Categorias mantêm-se as de `BLOG_CATEGORIES`; o valor canónico fica em inglês, só o rótulo é traduzido (ver `CATEGORY_PT` em `src/app/i18n.tsx`).
- Nada de dependências do browser (`window`, `document`, `ResizeObserver`) no caminho de renderização do servidor, exceto dentro de `useEffect`.
- O `main` está protegido: cada tarefa acaba em commit, e o conjunto vai a Pull Request.
- Os 14 artigos existentes só têm corpo em inglês. Migram como `en.md`; o `pt.md` leva título e excerto traduzidos (já existem) e um corpo vazio sinalizado.

---

### Task 1: Infraestrutura de testes

Não existe nenhuma. Sem isto, nenhuma tarefa seguinte é verificável.

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Test: `src/lib/blog/smoke.test.ts`

**Interfaces:**
- Produces: comando `npm test`, executável por todas as tarefas seguintes.

- [ ] **Step 1: Instalar o vitest**

```bash
npm i -D vitest@2
```

- [ ] **Step 2: Criar a configuração**

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
```

- [ ] **Step 3: Acrescentar o script ao package.json**

Em `"scripts"`, junto de `build` e `dev`:

```json
"test": "vitest run"
```

- [ ] **Step 4: Escrever o teste de fumo**

`src/lib/blog/smoke.test.ts`:

```ts
import { expect, test } from 'vitest'

test('a infraestrutura de testes corre', () => {
  expect(1 + 1).toBe(2)
})
```

- [ ] **Step 5: Correr e confirmar que passa**

Run: `npm test`
Expected: 1 passed

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/blog/smoke.test.ts
git commit -m "test: infraestrutura de testes com vitest"
```

---

### Task 2: Modelo de conteúdo e leitor de ficheiros

**Files:**
- Create: `src/lib/blog/types.ts`
- Create: `src/lib/blog/loadPosts.ts`
- Test: `src/lib/blog/loadPosts.test.ts`
- Create: `content/blog/exemplo-teste/pt.md` (fixture, removido na Task 3)

**Interfaces:**
- Produces:
  - `type Lang = 'pt' | 'en'`
  - `interface PostMeta { slug: string; lang: Lang; title: string; excerpt: string; category: string; date: string; readTime: string }`
  - `interface Post extends PostMeta { bodyHtml: string }`
  - `function parsePost(raw: string, slug: string, lang: Lang): Post` — converte o texto de um ficheiro `.md` num `Post`. É esta a função partilhada entre o leitor de ficheiros (Node) e o carregador do bundle (browser), para não haver duas implementações do mesmo parsing.
  - `function loadPosts(contentDir: string): Post[]` — leitura por sistema de ficheiros, usada pelo script de pré-renderização e pelos testes

- [ ] **Step 1: Instalar as dependências**

```bash
npm i gray-matter marked
```

- [ ] **Step 2: Escrever o teste a falhar**

`src/lib/blog/loadPosts.test.ts`:

```ts
import { expect, test } from 'vitest'
import { loadPosts } from './loadPosts'
import path from 'path'

const DIR = path.resolve(__dirname, '../../../content/blog')

test('lê os artigos e converte o corpo em HTML', () => {
  const posts = loadPosts(DIR)
  const p = posts.find(x => x.slug === 'exemplo-teste' && x.lang === 'pt')
  expect(p).toBeDefined()
  expect(p!.title).toBe('Artigo de exemplo')
  expect(p!.category).toBe('Branding & Visual Identity')
  expect(p!.bodyHtml).toContain('<h2>Um cabeçalho</h2>')
  expect(p!.bodyHtml).toContain('<p>Um parágrafo.</p>')
})

test('ignora pastas que comecem por underscore', () => {
  const posts = loadPosts(DIR)
  expect(posts.some(p => p.slug.startsWith('_'))).toBe(false)
})
```

- [ ] **Step 3: Criar a fixture**

`content/blog/exemplo-teste/pt.md`:

```markdown
---
title: Artigo de exemplo
excerpt: Um excerto curto.
category: Branding & Visual Identity
date: September 2026
readTime: 3 min de leitura
---

## Um cabeçalho

Um parágrafo.
```

- [ ] **Step 4: Correr o teste e confirmar que falha**

Run: `npm test`
Expected: FAIL — `Cannot find module './loadPosts'`

- [ ] **Step 5: Escrever os tipos**

`src/lib/blog/types.ts`:

```ts
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
```

- [ ] **Step 6: Escrever o leitor**

`src/lib/blog/loadPosts.ts`:

```ts
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { marked } from 'marked'
import type { Lang, Post } from './types'

const LANGS: Lang[] = ['pt', 'en']

export function parsePost(raw: string, slug: string, lang: Lang): Post {
  const { data, content } = matter(raw)
  return {
    slug,
    lang,
    title: String(data.title ?? ''),
    excerpt: String(data.excerpt ?? ''),
    category: String(data.category ?? ''),
    date: String(data.date ?? ''),
    readTime: String(data.readTime ?? ''),
    bodyHtml: marked.parse(content.trim(), { async: false }) as string,
  }
}

export function loadPosts(contentDir: string): Post[] {
  const posts: Post[] = []
  const slugs = fs.readdirSync(contentDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('_'))
    .map(e => e.name)

  for (const slug of slugs) {
    for (const lang of LANGS) {
      const file = path.join(contentDir, slug, `${lang}.md`)
      if (!fs.existsSync(file)) continue
      posts.push(parsePost(fs.readFileSync(file, 'utf-8'), slug, lang))
    }
  }
  return posts
}
```

- [ ] **Step 7: Correr o teste e confirmar que passa**

Run: `npm test`
Expected: 3 passed

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/lib/blog content/blog/exemplo-teste
git commit -m "feat: modelo de conteúdo do blog em Markdown"
```

---

### Task 3: Migrar os 14 artigos existentes

**Files:**
- Create: `scripts/migrar-posts.mjs`
- Create: `content/blog/<slug>/{pt,en}.md` × 14
- Modify: `src/app/App.tsx` (remover o array `POSTS` e a interface `Post`)
- Delete: `content/blog/exemplo-teste/`
- Test: `src/lib/blog/loadPosts.test.ts` (atualizar as asserções)

**Interfaces:**
- Consumes: `loadPosts` da Task 2.
- Produces: 14 pastas em `content/blog/`, cada uma com `pt.md` e `en.md`.

- [ ] **Step 1: Escrever o script de migração**

`scripts/migrar-posts.mjs` — lê o array `POSTS` do `App.tsx` por import dinâmico do ficheiro compilado não é fiável; em vez disso, extrai por execução direta:

```js
import fs from 'fs'
import path from 'path'

// Cola aqui o array POSTS copiado de src/app/App.tsx (linhas 1268-1510),
// convertido para JSON válido. Fazer isto uma vez, manualmente, é mais
// seguro do que tentar analisar TypeScript com expressões regulares.
const POSTS = JSON.parse(fs.readFileSync('scripts/posts-export.json', 'utf-8'))

const OUT = 'content/blog'

const fm = (o) => '---\n' + Object.entries(o)
  .map(([k, v]) => `${k}: ${String(v).includes(':') ? JSON.stringify(v) : v}`)
  .join('\n') + '\n---\n\n'

for (const p of POSTS) {
  const dir = path.join(OUT, p.slug)
  fs.mkdirSync(dir, { recursive: true })

  const body = p.body
    .map(b => (b.heading ? `## ${b.heading}\n\n${b.text}` : b.text))
    .join('\n\n')

  fs.writeFileSync(path.join(dir, 'en.md'),
    fm({ title: p.title, excerpt: p.excerpt, category: p.category, date: p.date, readTime: p.readTime }) + body + '\n')

  fs.writeFileSync(path.join(dir, 'pt.md'),
    fm({ title: p.title_pt, excerpt: p.excerpt_pt, category: p.category, date: p.date, readTime: p.readTime }) + '')

  console.log('escrito:', p.slug)
}
```

- [ ] **Step 2: Exportar o array POSTS para JSON**

Abrir `src/app/App.tsx`, copiar o conteúdo do array `POSTS` (começa na linha 1268, `const POSTS: Post[] = [`) e gravar como JSON válido em `scripts/posts-export.json`. Converter aspas e remover a anotação de tipo. Verificar com:

Run: `node -e "console.log(JSON.parse(require('fs').readFileSync('scripts/posts-export.json','utf8')).length)"`
Expected: `14`

- [ ] **Step 3: Correr a migração**

Run: `node scripts/migrar-posts.mjs`
Expected: 14 linhas `escrito: <slug>`

- [ ] **Step 4: Verificar a contagem de ficheiros**

Run: `ls content/blog | grep -v _template | grep -v exemplo-teste | wc -l`
Expected: `14`

Run: `ls content/blog/*/en.md | wc -l`
Expected: `14`

- [ ] **Step 5: Remover a fixture e atualizar o teste**

```bash
rm -rf content/blog/exemplo-teste
```

Em `src/lib/blog/loadPosts.test.ts`, substituir o primeiro teste por:

```ts
test('lê os 14 artigos em inglês e converte o corpo em HTML', () => {
  const posts = loadPosts(DIR)
  const en = posts.filter(p => p.lang === 'en')
  expect(en).toHaveLength(14)
  const p = en.find(x => x.slug === 'visual-identity-business-asset')
  expect(p).toBeDefined()
  expect(p!.title).toBe('Why visual identity is your most underrated business asset')
  expect(p!.bodyHtml).toContain('<h2>Recognition compounds over time</h2>')
})

test('os artigos em português têm título mas ainda não têm corpo', () => {
  const pt = loadPosts(DIR).filter(p => p.lang === 'pt')
  expect(pt).toHaveLength(14)
  expect(pt.every(p => p.title.length > 0)).toBe(true)
})
```

- [ ] **Step 6: Correr os testes**

Run: `npm test`
Expected: 4 passed

- [ ] **Step 7: Remover o array POSTS do App.tsx**

Apagar a interface `Post` (linhas 1256-1267) e o array `POSTS` (1268-1510) de `src/app/App.tsx`. O ficheiro vai ficar com erros de referência — resolvidos na Task 4. Confirmar que os erros são apenas sobre `POSTS` e `Post`:

Run: `npx tsc --noEmit 2>&1 | grep -c "POSTS\|'Post'"`
Expected: um número maior que zero, e nenhum erro de outra natureza

- [ ] **Step 8: Commit**

```bash
git add content/blog scripts src/lib/blog/loadPosts.test.ts src/app/App.tsx
git commit -m "refactor: migra os 14 artigos do App.tsx para Markdown"
```

---

### Task 4: Extrair os componentes do blog

**Files:**
- Create: `src/app/blog/ArticleView.tsx`
- Create: `src/app/blog/BlogListView.tsx`
- Create: `src/app/blog/tokens.ts`
- Modify: `src/app/App.tsx` (remover `BlogPage` e `ArticlePage`, importar dos novos módulos)
- Test: `src/lib/blog/render.test.ts`

**Interfaces:**
- Consumes: `Post`, `Lang` da Task 2.
- Produces:
  - `function ArticleView({ post, lang }: { post: Post; lang: Lang }): JSX.Element` — renderiza um artigo sem usar `useParams` nem `useNavigate`
  - `function BlogListView({ posts, lang }: { posts: Post[]; lang: Lang }): JSX.Element`
  - `tokens.ts` exporta `GOLD`, `SANS`, `SERIF`, `CAMPTON_BOOK`, copiados de `App.tsx`

- [ ] **Step 1: Capturar o estado visual atual**

Com o dev server a correr (`npm run dev`), gravar capturas de `/blog` e `/blog/visual-identity-business-asset` para comparar no fim. Guardar em `/tmp/blog-antes-*.png`.

- [ ] **Step 2: Escrever o teste a falhar**

`src/lib/blog/render.test.ts`:

```ts
import { expect, test } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { ArticleView } from '../../app/blog/ArticleView'
import type { Post } from './types'

const post: Post = {
  slug: 'teste', lang: 'en', title: 'Um título', excerpt: 'Um excerto',
  category: 'Branding & Visual Identity', date: 'September 2026',
  readTime: '3 min read', bodyHtml: '<h2>Cabeçalho</h2><p>Parágrafo.</p>',
}

test('renderiza o artigo no servidor com o texto completo', () => {
  const html = renderToString(createElement(ArticleView, { post, lang: 'en' }))
  expect(html).toContain('Um título')
  expect(html).toContain('<h2>Cabeçalho</h2>')
  expect(html).toContain('Parágrafo.')
})
```

- [ ] **Step 3: Correr e confirmar que falha**

Run: `npm test`
Expected: FAIL — módulo `ArticleView` não existe

- [ ] **Step 4: Criar os tokens**

`src/app/blog/tokens.ts` — copiar de `src/app/App.tsx` as constantes `GOLD`, `SANS`, `SERIF`, `CAMPTON_BOOK`, `CAMPTON_BOLD` e exportá-las.

- [ ] **Step 5: Criar o ArticleView**

`src/app/blog/ArticleView.tsx` — mover o JSX de `ArticlePage` (a partir de `return (` na linha ~1683 até ao fecho), substituindo:
- `post.body.map(...)` por `<div dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />` com os mesmos estilos de `<p>` e `<h2>` aplicados por CSS em vez de inline
- `useParams`/`useNavigate` removidos — o componente recebe `post` e `lang` por props
- `motion.*` mantém-se: o framer-motion renderiza no servidor

A navegação "voltar" passa a `<a href="/blog">` em vez de `navigate("/blog")`, para funcionar sem JavaScript.

- [ ] **Step 6: Criar o BlogListView**

`src/app/blog/BlogListView.tsx` — mover o JSX de `BlogPage`, recebendo `posts` e `lang` por props. O filtro por categoria mantém-se em `useState` (só funciona com JS, e não faz mal: a lista completa está no HTML).

- [ ] **Step 7: Criar o carregador de posts para o bundle**

O `loadPosts` da Task 2 usa `fs` e só funciona em Node. O bundle precisa de outro caminho, que reutiliza o mesmo `parsePost`.

`src/lib/blog/posts.ts`:

```ts
import { parsePost } from './loadPosts'
import type { Lang, Post } from './types'

const FILES = import.meta.glob('../../../content/blog/*/*.md', {
  query: '?raw', import: 'default', eager: true,
}) as Record<string, string>

export const POSTS: Post[] = Object.entries(FILES).map(([file, raw]) => {
  const m = file.match(/content\/blog\/([^/]+)\/(pt|en)\.md$/)!
  return parsePost(raw, m[1], m[2] as Lang)
})

export const postsFor = (lang: Lang) => POSTS.filter(p => p.lang === lang)
export const postBySlug = (slug: string, lang: Lang) =>
  POSTS.find(p => p.slug === slug && p.lang === lang)
```

- [ ] **Step 8: Religar o App.tsx**

Em `src/app/App.tsx`, substituir `BlogPage` e `ArticlePage` por invólucros finos:

```tsx
import { ArticleView } from './blog/ArticleView'
import { BlogListView } from './blog/BlogListView'
import { postsFor, postBySlug } from '@/lib/blog/posts'

function BlogPage() {
  const lang = useLang()
  return <BlogListView posts={postsFor(lang)} lang={lang} />
}

function ArticlePage() {
  const lang = useLang()
  const { slug } = useParams<{ slug: string }>()
  const post = slug ? postBySlug(slug, lang) : undefined
  if (!post) return <ArticleNotFound lang={lang} />
  return <ArticleView post={post} lang={lang} />
}
```

`ArticleNotFound` é o bloco "artigo não encontrado" que já existe no `ArticlePage` atual, movido para `src/app/blog/ArticleNotFound.tsx`.

- [ ] **Step 9: Deixar o blog passar à frente do preloader**

Hoje o `App.tsx` só monta o router quando o vídeo do hero acaba de descarregar:

```tsx
{ready && (<motion.div …><RouterProvider router={router} /></motion.div>)}
```

Numa página de artigo pré-renderizada isto anula o efeito: o crawler vê o HTML, mas o visitante fica a olhar para o ecrã de carregamento. Nas rotas do blog o conteúdo deve aparecer de imediato.

Em `App.tsx`, no componente `App`, calcular se a rota atual é do blog e ignorar o preloader nesse caso:

```tsx
const isBlog = typeof window !== 'undefined' && /^\/(en\/)?blog(\/|$)/.test(window.location.pathname)
const gated = ready || isBlog
```

e usar `gated` em vez de `ready` nas duas condições (`{!gated && <LoadingScreen …>}` e `{gated && …}`).

- [ ] **Step 10: Correr os testes e o build**

Run: `npm test`
Expected: 5 passed

Run: `npm run build`
Expected: `✓ built`

- [ ] **Step 11: Comparar visualmente**

Com o dev server, gravar de novo `/blog` e o artigo, e comparar com as capturas do Step 1. **Sem diferença visual.** Se houver, corrigir antes de commitar.

- [ ] **Step 12: Commit**

```bash
git add src/app/blog src/app/App.tsx src/lib/blog
git commit -m "refactor: extrai os componentes do blog para módulo renderizável no servidor"
```

---

### Task 5: Script de pré-renderização

**Files:**
- Create: `scripts/prerender.mjs`
- Modify: `package.json` (script `build`)
- Test: `src/lib/blog/prerender.test.ts`

**Interfaces:**
- Consumes: `loadPosts`, `ArticleView`, `BlogListView`.
- Produces: `dist/blog/<slug>/index.html`, `dist/en/blog/<slug>/index.html`, `dist/blog/index.html`, `dist/en/blog/index.html`.

- [ ] **Step 1: Escrever o teste a falhar**

`src/lib/blog/prerender.test.ts`:

```ts
import { expect, test } from 'vitest'
import { buildHead } from '../../../scripts/head.mjs'

test('gera metadados próprios por artigo', () => {
  const head = buildHead({
    title: 'Um título', excerpt: 'Um excerto', lang: 'pt',
    slug: 'teste', category: 'Branding & Visual Identity', date: 'September 2026',
  })
  expect(head).toContain('<title>Um título — Muche</title>')
  expect(head).toContain('name="description" content="Um excerto"')
  expect(head).toContain('rel="canonical" href="https://www.muche.pt/blog/teste"')
  expect(head).toContain('hreflang="en" href="https://www.muche.pt/en/blog/teste"')
  expect(head).toContain('"@type":"Article"')
})
```

- [ ] **Step 2: Correr e confirmar que falha**

Run: `npm test`
Expected: FAIL — `scripts/head.mjs` não existe

- [ ] **Step 3: Escrever o gerador de `<head>`**

`scripts/head.mjs`:

```js
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
    `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>`,
  ].join('\n    ')
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
```

- [ ] **Step 4: Correr o teste e confirmar que passa**

Run: `npm test`
Expected: 6 passed

- [ ] **Step 5: Escrever o script de pré-renderização**

`scripts/prerender.mjs` — lê `dist/index.html` como molde, e para cada artigo e idioma:
1. renderiza `ArticleView` com `renderToString`
2. substitui `<div id="root"></div>` por `<div id="root">…</div>`
3. substitui o `<title>` e a `<meta description>` existentes pelo resultado de `buildHead`
4. escreve em `dist/blog/<slug>/index.html` e `dist/en/blog/<slug>/index.html`

Os componentes TSX precisam de ser compilados antes: usar `vite build --ssr` para gerar um bundle de servidor em `dist-ssr/`, e importar daí.

Acrescentar ao `package.json`:

```json
"build": "vite build && vite build --ssr src/entry-server.tsx --outDir dist-ssr && node scripts/prerender.mjs"
```

Criar `src/entry-server.tsx` que exporta `renderArticle(post, lang)` e `renderList(posts, lang)`.

- [ ] **Step 6: Correr o build**

Run: `npm run build`
Expected: `✓ built` e ficheiros em `dist/blog/*/index.html`

- [ ] **Step 7: Verificar que o texto está no HTML**

Run: `grep -c "Recognition compounds" dist/en/blog/visual-identity-business-asset/index.html`
Expected: `1`

Run: `grep -o '<title>[^<]*</title>' dist/en/blog/visual-identity-business-asset/index.html`
Expected: o título do artigo, não o título genérico do site

- [ ] **Step 8: Commit**

```bash
git add scripts src/entry-server.tsx package.json src/lib/blog/prerender.test.ts
git commit -m "feat: pré-renderiza os artigos do blog para HTML estático"
```

---

### Task 6: sitemap.xml e robots.txt

**Files:**
- Create: `scripts/sitemap.mjs`
- Create: `public/robots.txt`
- Modify: `scripts/prerender.mjs` (chamar o gerador de sitemap)
- Test: `src/lib/blog/sitemap.test.ts`

**Interfaces:**
- Consumes: a lista de posts da Task 2.
- Produces: `dist/sitemap.xml`.

- [ ] **Step 1: Escrever o teste a falhar**

`src/lib/blog/sitemap.test.ts`:

```ts
import { expect, test } from 'vitest'
import { buildSitemap } from '../../../scripts/sitemap.mjs'

test('inclui as duas versões de cada artigo com hreflang', () => {
  const xml = buildSitemap([{ slug: 'teste', lang: 'pt' }, { slug: 'teste', lang: 'en' }])
  expect(xml).toContain('<loc>https://www.muche.pt/blog/teste</loc>')
  expect(xml).toContain('<loc>https://www.muche.pt/en/blog/teste</loc>')
  expect(xml).toContain('hreflang="pt"')
  expect(xml).toContain('hreflang="en"')
})
```

- [ ] **Step 2: Correr e confirmar que falha**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: Escrever o gerador**

`scripts/sitemap.mjs`:

```js
const BASE = 'https://www.muche.pt'

export function buildSitemap(posts) {
  const url = (slug, lang) => lang === 'pt' ? `${BASE}/blog/${slug}` : `${BASE}/en/blog/${slug}`
  const entries = posts.map(p => `  <url>
    <loc>${url(p.slug, p.lang)}</loc>
    <xhtml:link rel="alternate" hreflang="pt" href="${url(p.slug, 'pt')}" />
    <xhtml:link rel="alternate" hreflang="en" href="${url(p.slug, 'en')}" />
  </url>`).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
</urlset>
`
}
```

- [ ] **Step 4: Criar o robots.txt**

`public/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://www.muche.pt/sitemap.xml
```

- [ ] **Step 5: Ligar ao prerender**

Em `scripts/prerender.mjs`, no fim, escrever `dist/sitemap.xml` com `buildSitemap(posts)`.

- [ ] **Step 6: Correr os testes e o build**

Run: `npm test`
Expected: 7 passed

Run: `npm run build && ls dist/sitemap.xml dist/robots.txt`
Expected: ambos existem

- [ ] **Step 7: Commit**

```bash
git add scripts/sitemap.mjs public/robots.txt scripts/prerender.mjs src/lib/blog/sitemap.test.ts
git commit -m "feat: sitemap.xml e robots.txt"
```

---

### Task 7: Rotas em inglês e verificação em produção

**Files:**
- Modify: `src/app/App.tsx` (router)
- Test: manual, na pré-visualização do PR

**Interfaces:**
- Consumes: tudo o anterior.

- [ ] **Step 1: Acrescentar as rotas /en**

Em `src/app/App.tsx`, no `createBrowserRouter`, junto das existentes:

```tsx
{ path: "en/blog",       Component: BlogPage },
{ path: "en/blog/:slug", Component: ArticlePage },
```

As rotas em `/en` forçam `lang = 'en'` independentemente da deteção automática.

- [ ] **Step 2: Correr o build**

Run: `npm run build`
Expected: `✓ built`

- [ ] **Step 3: Commit e abrir Pull Request**

```bash
git add src/app/App.tsx
git commit -m "feat: rotas do blog em inglês"
git push -u origin feat/blog-fundacao
gh pr create --title "feat: blog pré-renderizado para SEO e AEO" --body "Ver docs/superpowers/plans/2026-09-22-blog-fundacao.md"
```

- [ ] **Step 4: Verificar na pré-visualização**

Na URL de pré-visualização que o Cloudflare Pages gera para o PR:

```bash
curl -s <preview>/blog/visual-identity-business-asset | grep -c "Recognition compounds"
```
Expected: `1` — o texto está no HTML sem executar JavaScript

```bash
curl -s <preview>/sitemap.xml | head -3
curl -s <preview>/robots.txt
```
Expected: XML válido e o robots com a linha `Sitemap:`

- [ ] **Step 5: Comparar visualmente**

Abrir `/blog` e um artigo na pré-visualização e comparar com as capturas do Step 1 da Task 4. **Sem diferença visual.**

- [ ] **Step 6: Merge**

Depois de aprovado.

---

## Próximo plano

A **Parte 2 — Automação** (lista de temas, tarefa agendada, geração dos artigos, abertura de PR) leva plano próprio, a escrever depois desta fundação estar em produção. Depende do formato de conteúdo definido na Task 2.
