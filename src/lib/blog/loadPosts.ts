import fs from 'fs'
import path from 'path'
import { parsePost } from './parsePost'
import type { Lang, Post } from './types'

/* O `parsePost` mudou-se para `./parsePost`, que não toca em `fs` nem em
   `path`, para que o bundle do browser o possa importar sem arrastar módulos
   do Node. Continua a ser exportado daqui para quem já o importava. */
export { parsePost }

const LANGS: Lang[] = ['pt', 'en']

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
