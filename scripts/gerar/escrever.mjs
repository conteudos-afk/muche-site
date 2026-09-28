/* ─── Da resposta ao ficheiro ────────────────────────────────────────────────
   Entre o que o modelo devolve e o que fica no repositório há uma porta, e é
   esta. O que passa por aqui vai ser lido pelo mesmo `parsePost` e pelo mesmo
   `validatePosts` que o build usa — de propósito. Um artigo que passe aqui e
   rebente no build seria a pior das combinações: o PR aberto, a revisão feita,
   e o merge a partir o site.

   Por isso o `verificarArtigo` chama o validador que já existe em vez de
   repetir as regras. Só acrescenta o que o validador não sabe: a dimensão, e
   o `#` de nível 1 que duplicaria o título na página. ────────────────────── */
import fs from 'node:fs'
import path from 'node:path'
import { splitFrontmatter } from '../../src/lib/blog/parsePost.ts'
import { validatePosts } from '../../src/lib/blog/validate.ts'
import { contarPalavras, dentroDoIntervalo, MIN_PALAVRAS, MAX_PALAVRAS } from './palavras.mjs'

/* O modelo tem o hábito de embrulhar a resposta ou de a anunciar. Nenhuma das
   duas coisas é um erro do artigo, por isso limpam-se antes de verificar. */
export function limparResposta(texto) {
  let t = String(texto).trim()

  const bloco = t.match(/^```(?:markdown|md)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/)
  if (bloco) t = bloco[1].trim()

  /* Um preâmbulo antes do frontmatter: fica só do `---` para a frente. */
  const inicio = t.indexOf('\n---')
  if (!t.startsWith('---') && inicio !== -1) t = t.slice(inicio + 1).trim()

  return t
}

export function verificarArtigo({ markdown, slug, lang }) {
  const problemas = []

  if (!markdown.trimStart().startsWith('---')) {
    problemas.push(`${slug}/${lang}.md: a resposta não começa por frontmatter`)
    return problemas
  }

  const { data, content } = splitFrontmatter(markdown, `${slug}/${lang}.md`)
  const corpo = content.trim()

  problemas.push(...validatePosts([{ slug, lang, ...data }]))

  const palavras = contarPalavras(corpo)
  if (!dentroDoIntervalo(palavras)) {
    problemas.push(
      `${slug}/${lang}.md: tem ${palavras} palavras, e o intervalo é ${MIN_PALAVRAS}–${MAX_PALAVRAS}`
    )
  }

  if (/^[ \t]*#[ \t]+/m.test(corpo)) {
    problemas.push(`${slug}/${lang}.md: o corpo tem um título de nível 1 (#) — o título já está no frontmatter`)
  }

  return problemas
}

export function escreverArtigo({ contentDir, slug, lang, markdown, substituir = false }) {
  const pasta = path.join(contentDir, slug)
  const ficheiro = path.join(pasta, `${lang}.md`)

  if (!substituir && fs.existsSync(ficheiro)) {
    throw new Error(`${slug}/${lang}.md já existe — o gerador não escreve por cima de um artigo publicado`)
  }

  fs.mkdirSync(pasta, { recursive: true })
  fs.writeFileSync(ficheiro, markdown.trimEnd() + '\n', 'utf-8')
  return ficheiro
}
