import { marked } from 'marked'
import type { Lang, Post } from './types'

/* ─── Frontmatter ────────────────────────────────────────────────────────────
   A Task 2 usava o `gray-matter` para separar o cabeçalho do corpo. Só que o
   `gray-matter` depende do `Buffer` do Node e rebenta no browser
   ("Buffer is not defined"), e o blog passou a ser lido também no bundle do
   site. Em vez de dois caminhos diferentes — um para o Node, outro para o
   browser — o cabeçalho passa a ser lido aqui, com o mesmo código nos dois
   sítios.

   O que é suportado é uma fatia pequena de YAML, e só isso: uma chave por
   linha, com um valor escalar numa só linha, entre aspas duplas, aspas
   simples ou sem aspas. Linhas em branco e linhas que comecem por `#` são
   ignoradas.

       ---
       title: "Um título"
       excerpt: "Um excerto"
       ---

   Tudo o resto — listas, blocos `>` e `|`, chaves aninhadas, comentários no
   fim da linha — **não** é suportado, e é aí que este leitor tem de se fazer
   ouvir. Um cabeçalho mal escrito não pode dar uma string errada em silêncio:
   dá um aviso no `console` a dizer o ficheiro, a chave e a linha. Avisa, mas
   não lança, porque isto também corre no browser e um artigo mal formatado
   não pode deitar abaixo o site inteiro. ────────────────────────────────── */

/* O grupo do meio é opcional para aceitar um cabeçalho vazio (`---\n---`). */
const FRONTMATTER = /^﻿?---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/
const KEY_VALUE = /^([A-Za-z0-9_-]+)[ \t]*:[ \t]*(.*)$/
/* Indicadores de bloco YAML: `>`, `|`, `>-`, `|+`, … */
const BLOCK_SCALAR = /^[>|][-+]?\d*$/

function warn(source: string | undefined, message: string, line: string) {
  const where = source ? `${source}: ` : ''
  console.warn(`[blog] ${where}${message} — linha ignorada ou lida à letra: ${JSON.stringify(line)}`)
}

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

export function splitFrontmatter(
  raw: string,
  source?: string,
): { data: Record<string, string>; content: string } {
  const match = raw.match(FRONTMATTER)
  if (!match) return { data: {}, content: raw }

  const data: Record<string, string> = {}
  for (const line of (match[1] ?? '').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const kv = line.match(KEY_VALUE)
    if (!kv) {
      /* Item de lista, continuação de um bloco, chave indentada… */
      warn(source, 'linha do cabeçalho que não é `chave: valor`', line)
      continue
    }

    const [, key, rawValue] = kv
    const value = unquote(rawValue)

    if (value === '') {
      warn(source, `a chave "${key}" ficou sem valor (listas e blocos não são suportados)`, line)
    } else if (BLOCK_SCALAR.test(value)) {
      warn(source, `a chave "${key}" usa um bloco YAML, que não é suportado`, line)
    } else if (rawValue.trim() === value && / #/.test(value)) {
      /* Em YAML isto seria um comentário; aqui o valor fica como está escrito. */
      warn(source, `a chave "${key}" tem um "#" num valor sem aspas e ele conta como texto`, line)
    }

    data[key] = value
  }
  return { data, content: raw.slice(match[0].length) }
}

/* Converte um ficheiro Markdown num Post. Vive num módulo próprio, sem `fs`
   nem `path`, para poder ser usado tanto no Node (pré-renderização) como no
   bundle do browser, onde os módulos do Node não existem. */
export function parsePost(raw: string, slug: string, lang: Lang): Post {
  const { data, content } = splitFrontmatter(raw, `${slug}/${lang}.md`)
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
