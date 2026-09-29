#!/usr/bin/env node
/* ─── O gerador ──────────────────────────────────────────────────────────────
   Junta as peças: lê o que há para fazer, pede ao modelo, verifica, escreve.

   Duas regras de desenho valem a pena explicar.

   A primeira: uma segunda tentativa quando o artigo sai fora do intervalo de
   palavras, e só por causa disso. Dizer ao modelo «saiu com 400, precisas de
   1200» resolve quase sempre, e é barato. Ao fim da segunda desiste e regista
   um aviso — o PR abre à mesma, com o aviso lá dentro, porque um artigo curto
   é uma decisão editorial e não um erro técnico.

   A segunda: um frontmatter inválido **não** abre PR. Ao contrário da
   dimensão, isso partiria o build, e o spec é explícito em que o merge
   automático só corre com o build verde. Falha alto, não escreve nada. ──── */
import path from 'node:path'
import { appendFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { lerTemas, proximosTemas, marcarUsados, validarTemas } from './temas.mjs'
import { lerArtigosMarkdown, escolherReferencias } from './referencias.mjs'
import { promptEscrever, promptExpandir, promptIngles } from './prompt.mjs'
import { limparResposta, verificarArtigo, escreverArtigo } from './escrever.mjs'
import { criarCliente } from './cliente.mjs'
import { contarPalavras, MIN_PALAVRAS, MAX_PALAVRAS } from './palavras.mjs'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const CONTENT_DIR = path.join(RAIZ, 'content', 'blog')
const TEMAS = path.join(CONTENT_DIR, '_temas.yml')
const MODOS = ['escrever', 'expandir']
const REFERENCIAS = 3

export function lerArgumentos(argv) {
  const valor = nome => {
    const i = argv.indexOf(`--${nome}`)
    return i === -1 ? undefined : argv[i + 1]
  }

  const modo = valor('modo') ?? 'escrever'
  if (!MODOS.includes(modo)) {
    throw new Error(`modo "${modo}" não existe — usa ${MODOS.join(' ou ')}`)
  }

  /* `Number('abc')` é `NaN`, e `NaN` a passar por `slice(0, NaN)` mais
     abaixo dá `[]` — o mesmo resultado de uma lista de temas genuinamente
     esgotada, e o mesmo `exit(2)`, que no workflow abre uma issue a dizer
     "não há mais temas". Um erro de digitação num `--lote` não pode
     produzir essa afirmação, confiante e errada, sobre o estado do blog:
     tem de rebentar aqui, com o valor que recebeu, antes de chegar a
     qualquer decisão sobre o que fazer. */
  const loteTexto = valor('lote') ?? '3'
  const lote = Number(loteTexto)
  if (!Number.isInteger(lote) || lote <= 0) {
    throw new Error(`--lote "${loteTexto}" não é um número inteiro positivo`)
  }

  return {
    modo,
    lote,
    slugs: (valor('slugs') ?? '').split(',').map(s => s.trim()).filter(Boolean),
  }
}

/* Decide o que gerar nesta execução. Distinto de `lerArgumentos`: aqui o
   erro não está na sintaxe do argumento, está em o pedido não corresponder
   a nada — um `--slugs` a nomear um slug que não existe na lista de temas
   (modo "escrever") ou entre os artigos curtos (modo "expandir"). Isso é
   um erro do pedido, não uma lista esgotada: só devolve `[]` quando
   `slugs` está vazio e não sobra mesmo nada por fazer, para que o
   `exit(2)` de `principal()` continue a significar só essa coisa. */
export function resolverAlvos({ modo, lote, slugs, temas, curtos }) {
  const candidatos = modo === 'escrever' ? temas : curtos
  const contexto = modo === 'escrever' ? 'na lista de temas' : 'entre os artigos curtos por expandir'

  if (slugs.length) {
    const alvos = candidatos.filter(c => slugs.includes(c.slug))
    const encontrados = new Set(alvos.map(a => a.slug))
    const emFalta = slugs.filter(s => !encontrados.has(s))
    if (emFalta.length) {
      throw new Error(`slug(s) não encontrado(s) ${contexto}: ${emFalta.join(', ')}`)
    }
    return alvos
  }

  return modo === 'escrever' ? proximosTemas(temas, lote) : curtos.slice(0, lote)
}

/* Uma tentativa: pede, limpa, verifica. Devolve o Markdown ou os problemas. */
async function tentar(cliente, prompt, slug, lang) {
  const { texto, custo } = await cliente.pedir(prompt)
  const markdown = limparResposta(texto)
  return { markdown, custo, problemas: verificarArtigo({ markdown, slug, lang }) }
}

/* Separa o que é dimensão do que é frontmatter: só a primeira dá segunda
   tentativa, e só a segunda é fatal. Estrutural — compara o `tipo` que
   `verificarArtigo` atribui a cada problema — e não uma substring da
   mensagem: reescrever a frase em `escrever.mjs` já não muda esta decisão. */
const ehDimensao = p => p.tipo === 'dimensao'

async function pedirComRetentativa(cliente, prompt, slug, lang) {
  let total = 0
  let ultimo = null

  for (const tentativa of [1, 2]) {
    const pedido = tentativa === 1
      ? prompt
      : `${prompt}\n\n---\n\nA versão anterior saiu com ${contarPalavras(ultimo.markdown)} palavras, e o intervalo é ${MIN_PALAVRAS}–${MAX_PALAVRAS}. Escreve outra vez, com a dimensão certa. Desenvolve os pontos, não os repitas.`

    const r = await tentar(cliente, pedido, slug, lang)
    total += r.custo
    ultimo = r

    if (r.problemas.length === 0) return { markdown: r.markdown, custo: total, avisos: [] }

    const fatais = r.problemas.filter(p => !ehDimensao(p))
    if (fatais.length) {
      const mensagens = r.problemas.map(p => p.mensagem).join('\n  ')
      throw new Error(`${slug}/${lang}.md não passou a verificação:\n  ${mensagens}`)
    }
  }

  /* Só sobra a dimensão: escreve à mesma e avisa. `avisos` é consumido pelo
     `console.warn` e pelo corpo do PR em `principal()` — tem de continuar a
     ser texto legível, não os objectos estruturados de `verificarArtigo`. */
  return { markdown: ultimo.markdown, custo: total, avisos: ultimo.problemas.map(p => p.mensagem) }
}

export async function gerarUm({ cliente, modo, alvo, referenciasPt, referenciasEn, contentDir }) {
  const slug = alvo.slug
  const substituir = modo === 'expandir'

  const promptPt = modo === 'escrever'
    ? promptEscrever({ tema: alvo, referencias: referenciasPt })
    : promptExpandir({ artigo: alvo, referencias: referenciasPt })

  const pt = await pedirComRetentativa(cliente, promptPt, slug, 'pt')
  const en = await pedirComRetentativa(
    cliente,
    promptIngles({ artigoPt: pt.markdown, referenciaEn: referenciasEn[0] }),
    slug,
    'en',
  )

  const caminhos = [
    escreverArtigo({ contentDir, slug, lang: 'pt', markdown: pt.markdown, substituir }),
    escreverArtigo({ contentDir, slug, lang: 'en', markdown: en.markdown, substituir }),
  ]

  return { slug, caminhos, custo: pt.custo + en.custo, avisos: [...pt.avisos, ...en.avisos] }
}

/* Corre o lote todo: para cada alvo, gera os dois artigos e, assim que os
   ficheiros estão escritos, marca o tema como usado — dentro do ciclo, e
   não uma vez só no fim do lote como antes.

   A ordem dentro de cada iteração importa. `gerarUm` só devolve depois de
   `escreverArtigo` já ter posto os dois ficheiros em disco; só depois
   disso é que `marcarUsados` corre aqui. Ao contrário — marcar antes de
   escrever — uma falha a meio da escrita deixava o tema como "publicado"
   sem nenhum artigo em disco: perdido por completo, e sem forma de o notar
   numa segunda execução, que já não voltaria a escolher esse tema.

   Com a ordem escolhida, o que resta é uma janela pequena e de um só
   artigo: entre `escreverArtigo` terminar e `marcarUsados` correr, um
   crash deixa esse artigo em disco mas o tema ainda "por-escrever" — a
   próxima execução tenta escrevê-lo outra vez e tropeça no "já existe" de
   `escreverArtigo`, só para esse artigo. Os artigos anteriores do mesmo
   lote já foram marcados nas suas próprias iterações e não sofrem o
   mesmo problema — é isto que faz uma falha a meio do lote continuável,
   e não bloqueante, numa segunda execução. */
export async function gerarLote({ cliente, modo, alvos, artigosPt, artigosEn, contentDir, temasPath }) {
  const feitos = []
  let custo = 0

  for (const alvo of alvos) {
    const categoria = modo === 'escrever' ? alvo.categoria : alvo.frontmatter.category
    console.log(`[gerar] ${modo}: ${alvo.slug}`)

    const r = await gerarUm({
      cliente,
      modo,
      alvo,
      referenciasPt: escolherReferencias(artigosPt, categoria, REFERENCIAS, alvo.slug),
      referenciasEn: escolherReferencias(artigosEn, categoria, REFERENCIAS, alvo.slug),
      contentDir,
    })

    custo += r.custo
    feitos.push(r)
    for (const aviso of r.avisos) console.warn(`[gerar] aviso: ${aviso}`)

    if (modo === 'escrever') marcarUsados(temasPath, [r.slug])
  }

  return { feitos, custo }
}

async function principal() {
  const { modo, lote, slugs } = lerArgumentos(process.argv.slice(2))
  const cliente = criarCliente(process.env.ANTHROPIC_API_KEY)

  const artigosPt = lerArtigosMarkdown(CONTENT_DIR, 'pt')
  const artigosEn = lerArtigosMarkdown(CONTENT_DIR, 'en')

  let alvos
  if (modo === 'escrever') {
    const temas = lerTemas(TEMAS)
    const problemas = validarTemas(temas)
    if (problemas.length) {
      console.error(`[gerar] a lista de temas tem problemas:\n  ${problemas.join('\n  ')}`)
      process.exit(1)
    }

    alvos = resolverAlvos({ modo, lote, slugs, temas })
    if (alvos.length === 0) {
      console.error('[gerar] LISTA_ESGOTADA')
      process.exit(2)
    }
  } else {
    const curtos = artigosPt
      .filter(a => a.palavras < MIN_PALAVRAS)
      .sort((a, b) => a.slug.localeCompare(b.slug))
    alvos = resolverAlvos({ modo, lote, slugs, curtos })
    if (alvos.length === 0) {
      console.error('[gerar] não há artigos curtos por expandir')
      process.exit(2)
    }
  }

  const { feitos, custo } = await gerarLote({
    cliente, modo, alvos, artigosPt, artigosEn, contentDir: CONTENT_DIR, temasPath: TEMAS,
  })

  const avisos = feitos.flatMap(f => f.avisos)
  console.log(`[gerar] ${feitos.length} artigos, $${custo.toFixed(2)}`)

  /* Consumido pelo workflow para montar o corpo do PR. */
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, [
      `slugs=${feitos.map(f => f.slug).join(',')}`,
      `custo=${custo.toFixed(2)}`,
      `avisos<<FIM\n${avisos.join('\n')}\nFIM`,
    ].join('\n') + '\n')
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch(erro => {
    console.error(`[gerar] ${erro.message}`)
    process.exit(1)
  })
}
