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
import { validatePosts, ehDataISO, OBRIGATORIOS } from '../../src/lib/blog/validate.ts'
import { contarPalavras, dentroDoIntervalo, MIN_PALAVRAS, MAX_PALAVRAS } from './palavras.mjs'
import { grafiasAntigas } from './grafia.mjs'

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

/* Cada problema é `{ tipo, mensagem }`, nunca só uma string. O `tipo` é o
   que `index.mjs` usa para decidir se há segunda tentativa (só `dimensao`)
   ou se falha logo — uma comparação estrutural, e não uma substring da
   `mensagem`. A `mensagem` continua a ser o texto completo que chega à
   consola e ao corpo do Pull Request; reescrever essa frase não muda mais
   nenhum comportamento, porque nada volta a fazer `.includes()` nela.

   Os tipos:
   - 'sem-frontmatter': a resposta nem começa por `---`.
   - 'aviso-leitura': o `splitFrontmatter` avisou de uma linha do cabeçalho
     que não conseguiu ler — distinto de 'validacao' porque a origem é
     outra: não é um campo em falta ou uma categoria inventada, é o
     cabeçalho a não fazer sentido nenhum.
   - 'validacao': o que o `validatePosts` do build já verifica (campo em
     falta, categoria desconhecida).
   - 'chave-repetida': a mesma chave duas vezes no cabeçalho.
   - 'dimensao': fora do intervalo de palavras — o único tipo retentável.
   - 'titulo-duplicado': um `#` de nível 1 no corpo.
   - 'frontmatter-duplicado': um segundo bloco de frontmatter a vazar para
     o corpo.
   - 'grafia': formas anteriores ao Acordo Ortográfico num artigo em
     português. É uma suspeita, não uma prova — o detetor pode enganar-se, e
     o modelo pode ter mesmo regredido —, por isso só chega ao corpo do PR,
     onde um humano a lê de qualquer maneira.
   Todos menos 'dimensao' e 'grafia' são fatais, e só 'dimensao' dá segunda
   tentativa (a política está em `index.mjs`); repetir o pedido por causa de
   uma grafia que pode ser um falso positivo era gastar dinheiro à toa. */
const DATA_A_PREENCHER = '2000-01-01'

export function verificarArtigo({ markdown, slug, lang }) {
  const problemas = []

  if (!markdown.trimStart().startsWith('---')) {
    problemas.push({ tipo: 'sem-frontmatter', mensagem: `${slug}/${lang}.md: a resposta não começa por frontmatter` })
    return problemas
  }

  const { resultado: { data, content }, avisos } = comAvisosApanhados(() =>
    splitFrontmatter(markdown, `${slug}/${lang}.md`)
  )
  problemas.push(...avisos.map(mensagem => ({ tipo: 'aviso-leitura', mensagem })))

  const corpo = content.trim()

  const repetidas = chavesRepetidas(markdown.match(CABECALHO)?.[0] ?? '')
  if (repetidas.length) {
    problemas.push({
      tipo: 'chave-repetida',
      mensagem: `${slug}/${lang}.md: o cabeçalho repete a chave ${repetidas.join(', ')} — o leitor fica com a última e o resto do gerador com a primeira`,
    })
  }

  /* O `date` não é do modelo: `aplicarData` escreve-o depois desta verificação,
     por cima do que lá estiver. Validar o que o modelo pôs (ou não pôs) seria
     reprovar um artigo por uma coisa que o código vai substituir; por isso
     entra aqui uma data de preenchimento, válida, e o resto do cabeçalho é
     validado como vem. */
  problemas.push(...validatePosts([{ slug, lang, ...data, date: DATA_A_PREENCHER }]).map(mensagem => ({ tipo: 'validacao', mensagem })))

  const palavras = contarPalavras(corpo)
  if (!dentroDoIntervalo(palavras)) {
    problemas.push({
      tipo: 'dimensao',
      mensagem: `${slug}/${lang}.md: tem ${palavras} palavras, e o intervalo é ${MIN_PALAVRAS}–${MAX_PALAVRAS}`,
    })
  }

  if (/^[ \t]*#[ \t]+/m.test(corpo)) {
    problemas.push({
      tipo: 'titulo-duplicado',
      mensagem: `${slug}/${lang}.md: o corpo tem um título de nível 1 (#) — o título já está no frontmatter`,
    })
  }

  if (temSegundoFrontmatter(corpo)) {
    problemas.push({
      tipo: 'frontmatter-duplicado',
      mensagem: `${slug}/${lang}.md: o corpo tem um segundo bloco de frontmatter — só o primeiro é lido, e o resto ficava a aparecer como YAML no artigo`,
    })
  }

  /* Só o português: o detetor é de português, e em inglês dispararia em
     metade das palavras. Lê o Markdown inteiro, cabeçalho incluído — o
     `title` e o `excerpt` também aparecem na página. */
  if (lang === 'pt') {
    const antigas = [...new Set(grafiasAntigas(markdown))]
    if (antigas.length) {
      problemas.push({
        tipo: 'grafia',
        mensagem: `${slug}/${lang}.md: possíveis formas anteriores ao Acordo Ortográfico (${antigas.join(', ')}) — pode ser um falso positivo, confirma antes de juntar`,
      })
    }
  }

  return problemas
}

/* O cabeçalho é lido com a mesma expressão que o `splitFrontmatter` usa. */
const CABECALHO = /^﻿?---[ \t]*\r?\n(?:[\s\S]*?\r?\n)?---[ \t]*(?:\r?\n|$)/

/* As chaves que aparecem mais do que uma vez no cabeçalho. */
function chavesRepetidas(cabecalho) {
  const vistas = new Set()
  const repetidas = new Set()
  for (const linha of cabecalho.split(/\r?\n/)) {
    const chave = linha.match(/^([A-Za-z0-9_-]+)[ \t]*:/)?.[1]
    if (!chave) continue
    if (vistas.has(chave)) repetidas.add(chave)
    vistas.add(chave)
  }
  return [...repetidas]
}

/* ─── O tempo de leitura ─────────────────────────────────────────────────────
   Quem conta as palavras é o código, não o modelo. Um modelo de linguagem não
   conta o que acabou de escrever: na primeira execução real o artigo inglês
   saiu com «5 min read» para 1543 palavras — o valor do artigo antigo,
   copiado em vez de recalculado — e essa string aparece na página publicada.

   Vive aqui, e não em `index.mjs`, porque é uma transformação do texto do
   artigo, a par de `limparResposta` e `verificarArtigo`: `index.mjs` só
   decide a ordem (verificar, calcular, escrever). E usa a mesma contagem que
   `verificarArtigo` — o corpo depois do frontmatter, aparado — para que o
   número que o leitor vê seja o mesmo que passou a verificação.

   200 palavras por minuto e arredondamento ao inteiro mais próximo: é o que
   o prompt sempre disse ao modelo. Os artigos aprovados não desempatam — o
   `readTime` deles foi escrito à mão e não corresponde a divisor nenhum. */
export const PALAVRAS_POR_MINUTO = 200

export function calcularReadTime(palavras, lang) {
  const minutos = Math.max(1, Math.round(palavras / PALAVRAS_POR_MINUTO))
  if (lang === 'pt') return `${minutos} min de leitura`
  if (lang === 'en') return `${minutos} min read`
  throw new Error(`língua desconhecida para o readTime: "${lang}"`)
}

/* Reescreve a linha `readTime` do cabeçalho — só do cabeçalho: uma linha
   `readTime:` dentro do corpo é texto do artigo e não se toca. Lança se o
   cabeçalho não a tiver, porque um artigo sem `readTime` já devia ter
   reprovado em `verificarArtigo`. */
export function aplicarReadTime({ markdown, lang }) {
  const cabecalho = markdown.match(CABECALHO)
  const LINHA = /^readTime[ \t]*:[^\r\n]*/m
  if (!cabecalho || !LINHA.test(cabecalho[0])) {
    throw new Error('o cabeçalho não tem a linha readTime para atualizar')
  }
  /* O `splitFrontmatter` fica com a ÚLTIMA ocorrência de uma chave repetida;
     reescrever só a primeira deixava o valor errado a ser publicado. Em vez
     de adivinhar qual das duas era a certa, recusa-se. */
  if (chavesRepetidas(cabecalho[0]).includes('readTime')) {
    throw new Error('o cabeçalho tem a chave readTime repetida — não se adivinha qual é a certa')
  }

  const { resultado: { content } } = comAvisosApanhados(() => splitFrontmatter(markdown))
  const readTime = calcularReadTime(contarPalavras(content.trim()), lang)

  const novo = cabecalho[0].replace(LINHA, `readTime: "${readTime}"`)
  return novo + markdown.slice(cabecalho[0].length)
}

/* ─── A data ─────────────────────────────────────────────────────────────────
   Tal como o `readTime`, a data é do código e não do modelo: um modelo não
   sabe que dia é hoje, e o artigo antigo que ele viu como referência ensina-o
   a copiar a data errada. E há uma razão a mais — o blog ordena por ela, e uma
   data inventada põe um artigo novo no meio da lista.

   Recebe a data já decidida por quem chama (`index.mjs`): a de hoje num artigo
   novo, a que o artigo já tinha num artigo expandido. Reescrever um artigo
   antigo não pode fazê-lo parecer novo. Escreve-a por cima de uma linha `date`
   que o modelo tenha posto e, se não houver, acrescenta-a — antes do
   `readTime`, que é onde os artigos escritos à mão a têm. Só mexe no
   cabeçalho. Recusa uma data que o build recusaria. */
export function aplicarData({ markdown, data }) {
  if (!ehDataISO(data)) {
    throw new Error(`a data "${data}" não é uma data AAAA-MM-DD válida`)
  }
  const cabecalho = markdown.match(CABECALHO)
  if (!cabecalho) throw new Error('o markdown não tem cabeçalho onde pôr a data')
  if (chavesRepetidas(cabecalho[0]).includes('date')) {
    throw new Error('o cabeçalho tem a chave date repetida — não se adivinha qual é a certa')
  }

  const linha = `date: "${data}"`
  const LINHA = /^date[ \t]*:[^\r\n]*/m
  const fimDeLinha = cabecalho[0].includes('\r\n') ? '\r\n' : '\n'

  let novo
  if (LINHA.test(cabecalho[0])) {
    novo = cabecalho[0].replace(LINHA, linha)
  } else {
    const antes = cabecalho[0].match(/^readTime[ \t]*:/m)?.index ?? cabecalho[0].lastIndexOf('---')
    novo = cabecalho[0].slice(0, antes) + linha + fimDeLinha + cabecalho[0].slice(antes)
  }
  return novo + markdown.slice(cabecalho[0].length)
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
