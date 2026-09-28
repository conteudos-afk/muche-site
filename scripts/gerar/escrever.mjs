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
import { validatePosts, OBRIGATORIOS } from '../../src/lib/blog/validate.ts'
import { contarPalavras, dentroDoIntervalo, MIN_PALAVRAS, MAX_PALAVRAS } from './palavras.mjs'

/* O slug entra no `path.join` de `escreverArtigo` mais abaixo. Um `..` ou um
   `../outside` escrevem fora de `content/blog/` — o `validarTemas` do
   `temas.mjs` já tem esta regra, mas vive a montante, só cobre o caminho
   "escrever" e nem existe para o modo "expandir". A guarda tem de estar
   aqui, na função que constrói o caminho, e não confiar em quem a chama. */
const SLUG_VALIDO = /^[a-z0-9-]+$/

/* O `parsePost.splitFrontmatter` avisa no `console` com este prefixo quando
   encontra uma linha do cabeçalho que não sabe ler — e não lança, porque
   também corre no browser. Aqui, tal como no `prerender.mjs`, um aviso
   destes é motivo para reprovar o artigo: um cabeçalho mal escrito publica
   um título corrompido em silêncio. */
const ASSINATURA_AVISO = '[blog] '

/* Chama `fn` apanhando os `console.warn` assinados com `[blog] `; os
   restantes continuam a sair para a consola, como sempre. Restaura sempre o
   `console.warn` original, mesmo que `fn` lance — por isso o `finally`, e
   não uma reposição a seguir à chamada, que um throw saltaria. */
function comAvisosApanhados(fn) {
  const avisos = []
  const warnOriginal = console.warn
  console.warn = (...args) => {
    const mensagem = args.map(String).join(' ')
    if (mensagem.startsWith(ASSINATURA_AVISO)) avisos.push(mensagem)
    else warnOriginal.apply(console, args)
  }
  try {
    return { resultado: fn(), avisos }
  } finally {
    console.warn = warnOriginal
  }
}

/* Um segundo bloco `---...---` dentro do corpo é o mesmo erro que o de
   cima, só que mais a jusante: o `splitFrontmatter` só lê o primeiro, e o
   resto fica a aparecer como YAML à vista no artigo publicado. Um `---`
   sozinho também é um separador horizontal válido em Markdown, por isso não
   basta encontrar a linha — tenta-se ler o que vem a seguir como se fosse
   frontmatter, e só conta se aparecer lá alguma das cinco chaves que o
   `SISTEMA` pede. Os avisos desta leitura especulativa não interessam: um
   separador decorativo não é um cabeçalho mal escrito. */
function temSegundoFrontmatter(corpo) {
  const linhas = corpo.split(/\r?\n/)
  for (let i = 0; i < linhas.length; i++) {
    if (linhas[i].trim() !== '---') continue
    const resto = linhas.slice(i).join('\n')
    const { resultado: { data } } = comAvisosApanhados(() => splitFrontmatter(resto))
    if (OBRIGATORIOS.some(chave => chave in data)) return true
  }
  return false
}

/* O modelo tem o hábito de embrulhar a resposta ou de a anunciar. Nenhuma das
   duas coisas é um erro do artigo, por isso limpam-se antes de verificar.

   As duas coisas também acontecem juntas: "Aqui está o artigo:" seguido do
   bloco vedado. A vedação continua ancorada ao fim da resposta (com `$`) —
   para não arriscar cortar um bloco de código que o próprio artigo tenha a
   meio —, mas agora aceita um preâmbulo opcional antes de abrir. Sem isto,
   o preâmbulo tirava-se pela regra de baixo antes de a vedação ter hipótese
   de correr, e sobrava uma vedação solta no fim do corpo publicado. */
export function limparResposta(texto) {
  let t = String(texto).trim()

  const bloco = t.match(/^(?:[\s\S]*?\r?\n)?```(?:markdown|md)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/)
  if (bloco) t = bloco[1].trim()

  /* Um preâmbulo antes do frontmatter, sem vedação: fica só do `---` para a
     frente. */
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

  const { resultado: { data, content }, avisos } = comAvisosApanhados(() =>
    splitFrontmatter(markdown, `${slug}/${lang}.md`)
  )
  problemas.push(...avisos)

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

  if (temSegundoFrontmatter(corpo)) {
    problemas.push(
      `${slug}/${lang}.md: o corpo tem um segundo bloco de frontmatter — só o primeiro é lido, e o resto ficava a aparecer como YAML no artigo`
    )
  }

  return problemas
}

export function escreverArtigo({ contentDir, slug, lang, markdown, substituir = false }) {
  if (!SLUG_VALIDO.test(slug)) {
    throw new Error(`slug inválido: "${slug}" — só pode ter minúsculas, números e hífenes`)
  }

  const pasta = path.join(contentDir, slug)
  const ficheiro = path.join(pasta, `${lang}.md`)

  if (!substituir && fs.existsSync(ficheiro)) {
    throw new Error(`${slug}/${lang}.md já existe — o gerador não escreve por cima de um artigo publicado`)
  }

  fs.mkdirSync(pasta, { recursive: true })
  fs.writeFileSync(ficheiro, markdown.trimEnd() + '\n', 'utf-8')
  return ficheiro
}
