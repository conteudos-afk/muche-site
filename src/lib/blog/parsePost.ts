import { marked } from 'marked'
import type { Lang, Post } from './types'

/* ─── Frontmatter ────────────────────────────────────────────────────────────
   A Task 2 usava o `gray-matter` para separar o cabeçalho do corpo. Só que o
   `gray-matter` depende do `Buffer` do Node e rebenta no browser
   ("Buffer is not defined"), e o blog passou a ser lido também no bundle do
   site. Em vez de dois caminhos diferentes — um para o Node, outro para o
   browser — o cabeçalho passa a ser lido aqui, com o mesmo código nos dois
   sítios. O formato é o que os 28 ficheiros usam: uma chave por linha, com o
   valor entre aspas.

       ---
       title: "Um título"
       excerpt: "Um excerto"
       ---
   ──────────────────────────────────────────────────────────────────────── */
const FRONTMATTER = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/
const KEY_VALUE = /^([A-Za-z0-9_-]+)[ \t]*:[ \t]*(.*)$/

function unquote(value: string): string {
  const v = value.trim()
  if (v.length >= 2 && v[0] === '"' && v[v.length - 1] === '"') {
    return v.slice(1, -1).replace(/\\"/g, '"')
  }
  if (v.length >= 2 && v[0] === "'" && v[v.length - 1] === "'") {
    return v.slice(1, -1).replace(/''/g, "'")
  }
  return v
}

export function splitFrontmatter(raw: string): { data: Record<string, string>; content: string } {
  const match = raw.match(FRONTMATTER)
  if (!match) return { data: {}, content: raw }

  const data: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    const kv = line.match(KEY_VALUE)
    if (kv) data[kv[1]] = unquote(kv[2])
  }
  return { data, content: raw.slice(match[0].length) }
}

/* Converte um ficheiro Markdown num Post. Vive num módulo próprio, sem `fs`
   nem `path`, para poder ser usado tanto no Node (pré-renderização) como no
   bundle do browser, onde os módulos do Node não existem. */
export function parsePost(raw: string, slug: string, lang: Lang): Post {
  const { data, content } = splitFrontmatter(raw)
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
