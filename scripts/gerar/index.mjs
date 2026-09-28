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

  return {
    modo,
    lote: Number(valor('lote') ?? 3),
    slugs: (valor('slugs') ?? '').split(',').map(s => s.trim()).filter(Boolean),
  }
}

/* Uma tentativa: pede, limpa, verifica. Devolve o Markdown ou os problemas. */
async function tentar(cliente, prompt, slug, lang) {
  const { texto, custo } = await cliente.pedir(prompt)
  const markdown = limparResposta(texto)
  return { markdown, custo, problemas: verificarArtigo({ markdown, slug, lang }) }
}

/* Separa o que é dimensão do que é frontmatter: só a primeira dá segunda
   tentativa, e só a segunda é fatal. */
const ehDimensao = p => p.includes('palavras, e o intervalo é')

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
    if (fatais.length) throw new Error(`${slug}/${lang}.md não passou a verificação:\n  ${r.problemas.join('\n  ')}`)
  }

  /* Só sobra a dimensão: escreve à mesma e avisa. */
  return { markdown: ultimo.markdown, custo: total, avisos: ultimo.problemas }
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

    alvos = slugs.length ? temas.filter(t => slugs.includes(t.slug)) : proximosTemas(temas, lote)
    if (alvos.length === 0) {
      console.error('[gerar] LISTA_ESGOTADA')
      process.exit(2)
    }
  } else {
    const curtos = artigosPt
      .filter(a => a.palavras < MIN_PALAVRAS)
      .sort((a, b) => a.slug.localeCompare(b.slug))
    alvos = slugs.length ? curtos.filter(a => slugs.includes(a.slug)) : curtos.slice(0, lote)
    if (alvos.length === 0) {
      console.error('[gerar] não há artigos curtos por expandir')
      process.exit(2)
    }
  }

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
      contentDir: CONTENT_DIR,
    })

    custo += r.custo
    feitos.push(r)
    for (const aviso of r.avisos) console.warn(`[gerar] aviso: ${aviso}`)
  }

  if (modo === 'escrever') marcarUsados(TEMAS, feitos.map(f => f.slug))

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
