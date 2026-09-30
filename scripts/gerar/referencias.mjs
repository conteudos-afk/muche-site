/* ─── Os artigos que servem de norma ─────────────────────────────────────────
   A voz não se mantém por descrição — mantém-se por exemplo. O gerador recebe
   três artigos já aprovados e escreve como eles. Este método já foi validado:
   as traduções dos 14 artigos foram feitas com o primeiro artigo aprovado como
   norma, e passaram sem correções de tom.

   O critério de escolha é o comprimento, porque um artigo longo é um artigo já
   expandido — já passou por revisão humana na Fase A. A categoria desempata
   entre artigos de comprimento parecido, mas não manda: um artigo de 1500
   palavras de outra categoria ensina mais sobre a voz do que um de 300 da
   mesma. ────────────────────────────────────────────────────────────────── */
import fs from 'node:fs'
import path from 'node:path'
import { splitFrontmatter } from '../../src/lib/blog/parsePost.ts'
import { contarPalavras } from './palavras.mjs'

export function lerArtigosMarkdown(contentDir, lang) {
  const artigos = []
  const slugs = fs.readdirSync(contentDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('_'))
    .map(e => e.name)

  for (const slug of slugs) {
    const ficheiro = path.join(contentDir, slug, `${lang}.md`)
    if (!fs.existsSync(ficheiro)) continue

    const cru = fs.readFileSync(ficheiro, 'utf-8')
    const { data, content } = splitFrontmatter(cru, `${slug}/${lang}.md`)
    const corpo = content.trim()
    artigos.push({ slug, lang, categoria: data.category ?? '', frontmatter: data, corpo, palavras: contarPalavras(corpo) })
  }
  return artigos
}

/* O peso da categoria. O que interessa não é o número, é o que ele decide:

   - dois artigos de comprimento parecido — uma diferença de umas 150
     palavras, a décima parte de um artigo de 1500 — desempatam pela
     categoria, e o da mesma categoria ganha mesmo sendo o mais curto dos
     dois;
   - um artigo bastante mais curto — 500 palavras a menos, um terço — não
     ganha só por ser da mesma categoria.

   O valor de 200 palavras está entre os dois. Se fosse 1, a categoria só
   desempataria contagens de palavras exatamente iguais, o que nunca
   acontece com artigos reais, e deixava de servir para coisa nenhuma; se
   fosse de 600 para cima, deixava um artigo curto passar à frente de um
   longo, contra o critério do topo deste ficheiro. Os testes fixam esses
   dois comportamentos, não o número. */
const BONUS_MESMA_CATEGORIA = 200

export function escolherReferencias(artigos, categoria, quantas, excluirSlug) {
  return artigos
    .filter(a => a.slug !== excluirSlug)
    .map(a => ({ a, peso: a.palavras + (a.categoria === categoria ? BONUS_MESMA_CATEGORIA : 0) }))
    .sort((x, y) => y.peso - x.peso || x.a.slug.localeCompare(y.a.slug))
    .slice(0, quantas)
    .map(({ a }) => a)
}
