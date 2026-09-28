// Migra os 14 artigos hardcoded em src/app/App.tsx (array POSTS) para
// ficheiros Markdown em content/blog/<slug>/{en,pt}.md.
//
// Em vez de copiar o array manualmente para JSON (frágil e sujeito a erros
// de transcrição em texto com aspas curvas, travessões e dois-pontos), este
// script extrai o literal do array diretamente da fonte do App.tsx por
// contagem de parênteses/colchetes e avalia-o como JavaScript (o literal já
// é sintaxe JS válida — apenas não é JSON válido por causa de chaves sem
// aspas). Isto garante que o conteúdo migrado é byte-a-byte o que está no
// App.tsx, sem re-digitação.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const APP_TSX = path.join(ROOT, 'src/app/App.tsx')
const OUT = path.join(ROOT, 'content/blog')

const src = fs.readFileSync(APP_TSX, 'utf-8')

const marker = 'const POSTS: Post[] = '
const startMarker = src.indexOf(marker)
if (startMarker === -1) {
  throw new Error('Não encontrei "const POSTS: Post[] = " em src/app/App.tsx')
}
const arrayStart = startMarker + marker.length
if (src[arrayStart] !== '[') {
  throw new Error('Esperava "[" logo a seguir a "const POSTS: Post[] = "')
}

// Conta colchetes para encontrar o fecho do array, respeitando strings.
let depth = 0
let i = arrayStart
let inString = null // aspas de abertura da string atual, ou null
for (; i < src.length; i++) {
  const ch = src[i]
  if (inString) {
    if (ch === '\\') { i++; continue }
    if (ch === inString) inString = null
    continue
  }
  if (ch === '"' || ch === "'" || ch === '`') { inString = ch; continue }
  if (ch === '[') depth++
  else if (ch === ']') {
    depth--
    if (depth === 0) { i++; break }
  }
}
const arrayLiteral = src.slice(arrayStart, i)

// O literal usa apenas sintaxe válida em JS puro (strings, arrays, objetos
// com chaves identifier), por isso pode ser avaliado diretamente.
const POSTS = new Function(`"use strict"; return (${arrayLiteral});`)()

if (!Array.isArray(POSTS) || POSTS.length === 0) {
  throw new Error('Falha ao extrair o array POSTS (vazio ou não é array)')
}

// Serializa um valor como string YAML segura (evita problemas com
// dois-pontos, aspas, travessões e outros caracteres especiais nos títulos
// e excertos dos artigos).
const yamlString = (v) => JSON.stringify(String(v))

const frontmatter = (fields) =>
  '---\n' +
  Object.entries(fields).map(([k, v]) => `${k}: ${yamlString(v)}`).join('\n') +
  '\n---\n\n'

for (const p of POSTS) {
  const dir = path.join(OUT, p.slug)
  fs.mkdirSync(dir, { recursive: true })

  const body = p.body
    .map((b) => (b.heading ? `## ${b.heading}\n\n${b.text}` : b.text))
    .join('\n\n')

  const enFm = frontmatter({
    title: p.title,
    excerpt: p.excerpt,
    category: p.category,
    date: p.date,
    readTime: p.readTime,
  })
  fs.writeFileSync(path.join(dir, 'en.md'), enFm + body + '\n')

  const ptFm = frontmatter({
    title: p.title_pt,
    excerpt: p.excerpt_pt,
    category: p.category,
    date: p.date,
    readTime: p.readTime,
  })
  fs.writeFileSync(path.join(dir, 'pt.md'), ptFm)

  console.log('escrito:', p.slug)
}

console.log(`\nTotal: ${POSTS.length} artigos migrados.`)
