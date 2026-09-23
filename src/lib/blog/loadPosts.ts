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
