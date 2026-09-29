import { expect, test } from 'vitest'
import { SISTEMA, promptEscrever, promptExpandir, promptIngles } from './prompt.mjs'
import { BLOG_CATEGORIES } from '../../src/lib/blog/categories.ts'

const REF = {
  slug: 'referencia', lang: 'pt', categoria: 'Podcasts',
  frontmatter: { title: 'Título de referência', excerpt: 'Excerto.', category: 'Podcasts', date: 'July 2026', readTime: '5 min de leitura' },
  corpo: 'O corpo do artigo de referência.', palavras: 6,
}

const TEMA = {
  slug: 'quanto-custa', tema: 'Quanto custa um vídeo de marca',
  angulo: 'O que faz o preço variar', categoria: 'Video Production',
  prioridade: 1, estado: 'por-escrever',
}

test('o sistema fixa as regras de voz do spec', () => {
  expect(SISTEMA).toContain('vídeo de marca')
  expect(SISTEMA.toLowerCase()).toContain('português europeu')
  expect(SISTEMA).toContain('**tu**')
  expect(SISTEMA).toContain('ecrã')
})

test('o sistema proíbe estatísticas sem fonte e imagens', () => {
  expect(SISTEMA.toLowerCase()).toContain('estatística')
  expect(SISTEMA.toLowerCase()).toContain('imagens')
})

test('o sistema mantém os termos do ofício em inglês, telemóvel/celular e os termos proibidos', () => {
  expect(SISTEMA).toContain('branding, storytelling, podcast, design, copy')
  expect(SISTEMA.toLowerCase()).toContain('telemóvel')
  expect(SISTEMA.toLowerCase()).toContain('celular')
  expect(SISTEMA).toContain('filme de marca')
  expect(SISTEMA).toContain('vídeo institucional')
})

test('o sistema fixa a ortografia do novo Acordo Ortográfico, com pares concretos', () => {
  expect(SISTEMA).toContain('Novo Acordo Ortográfico')
  expect(SISTEMA).toContain('«ativo», nunca «activo»')
  expect(SISTEMA).toContain('«perceção», nunca «percepção»')
  expect(SISTEMA).toContain('«diretor», nunca «director»')
  expect(SISTEMA).toContain('«outubro», nunca «Outubro»')
})

test('o sistema proíbe qualquer coisa a seguir à última linha do artigo', () => {
  expect(SISTEMA).toContain('última linha do artigo')
  expect(SISTEMA).toContain('comentário sobre o próprio artigo')
})

test('o prompt de escrita leva o tema, o ângulo e a categoria', () => {
  const p = promptEscrever({ tema: TEMA, referencias: [REF] })
  expect(p).toContain('Quanto custa um vídeo de marca')
  expect(p).toContain('O que faz o preço variar')
  expect(p).toContain('Video Production')
  expect(p).toContain('quanto-custa')
})

test('o prompt de escrita leva as referências com corpo', () => {
  const p = promptEscrever({ tema: TEMA, referencias: [REF] })
  expect(p).toContain('O corpo do artigo de referência.')
})

test('o prompt de escrita pede o intervalo de palavras', () => {
  const p = promptEscrever({ tema: TEMA, referencias: [REF] })
  expect(p).toContain('1200')
  expect(p).toContain('1800')
})

test('o prompt de expansão leva o artigo original inteiro', () => {
  const original = {
    ...REF, slug: 'original', corpo: 'Texto curto a expandir.',
    frontmatter: { ...REF.frontmatter, title: 'Título original a expandir' },
  }
  const p = promptExpandir({ artigo: original, referencias: [REF] })
  expect(p).toContain('Texto curto a expandir.')
  expect(p).toContain('Título original a expandir')
})

test('o prompt de expansão manda manter o slug e a categoria', () => {
  const original = { ...REF, slug: 'original', frontmatter: { ...REF.frontmatter, category: 'Fotografia' } }
  const p = promptExpandir({ artigo: original, referencias: [REF] })
  expect(p).toContain('original')
  expect(p).toContain('a categoria `Fotografia`')
  expect(p.toLowerCase()).toContain('mantém')
})

test('o prompt inglês leva o artigo português e uma referência inglesa', () => {
  const refEn = { ...REF, lang: 'en', corpo: 'An approved English article.' }
  const p = promptIngles({ artigoPt: 'Artigo em português.', referenciaEn: refEn })
  expect(p).toContain('Artigo em português.')
  expect(p).toContain('An approved English article.')
})

/* Regressão: o inglês não pode ser instruído a imitar a dimensão do
   artigo português — quando o português sai fora do intervalo e é aceite
   com aviso (ver index.mjs), isso pediria ao inglês, na primeira
   tentativa, para reproduzir a mesma dimensão errada. O intervalo tem de
   vir explícito, como em promptEscrever e promptExpandir. */
test('o prompt inglês pede o intervalo de palavras explícito, e não a dimensão do português', () => {
  const refEn = { ...REF, lang: 'en', corpo: 'An approved English article.' }
  const p = promptIngles({ artigoPt: 'Artigo em português.', referenciaEn: refEn })
  expect(p).toContain('1200')
  expect(p).toContain('1800')
  expect(p.toLowerCase()).not.toContain('a mesma dimensão')
})

test('o bloco de referências escapa aspas duplas no frontmatter', () => {
  const refComAspas = { ...REF, frontmatter: { ...REF.frontmatter, title: 'Um título com "aspas" dentro' } }
  const p = promptEscrever({ tema: TEMA, referencias: [refComAspas] })
  expect(p).toContain('title: "Um título com \\"aspas\\" dentro"')
})

test('o bloco de referências alarga a vedação quando o corpo já tem crases', () => {
  const refComCrases = { ...REF, corpo: 'Antes.\n\n```js\nconst x = 1\n```\n\nDepois.' }
  const p = promptEscrever({ tema: TEMA, referencias: [refComCrases] })
  expect(p).toContain('````')
  expect(p).toContain('```js\nconst x = 1\n```\n\nDepois.')
})

test('o artigo a expandir escapa aspas duplas e alarga a vedação quando tem crases', () => {
  const original = {
    ...REF, slug: 'original',
    frontmatter: { ...REF.frontmatter, title: 'Um título "citado" a expandir' },
    corpo: 'Antes.\n\n```js\nconst y = 2\n```\n\nDepois.',
  }
  const p = promptExpandir({ artigo: original, referencias: [REF] })
  expect(p).toContain('title: "Um título \\"citado\\" a expandir"')
  expect(p).toContain('````')
  expect(p).toContain('```js\nconst y = 2\n```\n\nDepois.')
})

test('o artigo português em promptIngles alarga a vedação quando tem crases', () => {
  const artigoPt = 'Antes.\n\n```js\nconst z = 3\n```\n\nDepois.'
  const refEn = { ...REF, lang: 'en', corpo: 'An approved English article.' }
  const p = promptIngles({ artigoPt, referenciaEn: refEn })
  expect(p).toContain('````')
  expect(p).toContain('```js\nconst z = 3\n```\n\nDepois.')
})

test('a referência inglesa em promptIngles alarga a vedação quando tem crases', () => {
  const refEnComCrases = { ...REF, lang: 'en', corpo: 'Before.\n\n```js\nconst w = 4\n```\n\nAfter.' }
  const p = promptIngles({ artigoPt: 'Texto simples em português.', referenciaEn: refEnComCrases })
  expect(p).toContain('````')
  expect(p).toContain('```js\nconst w = 4\n```\n\nAfter.')
})

/* O `readTime` é calculado em código (ver `aplicarReadTime`). Uma instrução
   sobre ele nos prompts já não governaria nada — e induziria em erro quem os
   lesse. As instruções vinham sempre com `readTime` entre crases, ao
   contrário do frontmatter simulado das referências, que o escreve à
   direita de uma chave. */
test('nenhum dos três prompts instrui o modelo sobre o readTime', () => {
  const refEn = { ...REF, lang: 'en', corpo: 'An approved English article.' }
  const prompts = [
    promptEscrever({ tema: TEMA, referencias: [REF] }),
    promptExpandir({ artigo: { ...REF, slug: 'original' }, referencias: [REF] }),
    promptIngles({ artigoPt: 'Texto em português.', referenciaEn: refEn }),
  ]
  for (const p of prompts) {
    expect(p).not.toContain('`readTime`')
    expect(p).not.toContain('dividir por 200')
    expect(p).not.toContain('min read')
  }
})

test('o sistema diz ao modelo que o readTime é calculado depois e que qualquer valor plausível serve', () => {
  expect(SISTEMA).toContain('qualquer valor plausível')
  expect(SISTEMA).toContain('calculado depois, por código')
})

/* ─── Nenhuma grafia anterior ao Acordo nos prompts ─────────────────────────
   O `SISTEMA` manda escrever no novo Acordo; se ele próprio estiver escrito
   no antigo, contradiz-se, e o modelo tende a copiar o que vê mais do que o
   que lhe mandam. Este teste apanha as sequências que o Acordo tirou —
   consoante muda antes de outra (`c` ou `p` antes de `c`, `ç`, `t`) — e os
   nomes dos meses com maiúscula.

   A LISTA DE EXCEPÇÕES É PARTE DO TESTE, e tem de estar certa: um teste que
   dispara numa palavra legítima é apagado pelo primeiro que tropeçar nele, e
   a partir daí não protege nada. Por isso está em duas partes:
   - `LEGITIMAS`: palavras (ou raízes) em que a consoante se pronuncia e por
     isso se mantém no Acordo — facto, contacto, adaptar, opção, espectador,
     ficção, corrupção, impacto… Se uma palavra correcta for apanhada, é aqui
     que se acrescenta (com a razão), não no teste que a apanhou.
   - `INGLES`: palavras inglesas que aparecem nos prompts (chaves do
     frontmatter, o mês do exemplo de data).
   Fica de fora, de propósito, o que está dentro de «nunca «…»»: o `SISTEMA`
   cita a grafia antiga para a proibir, e isso tem de poder continuar. ─── */
const LEGITIMAS = [
  /^fact(o|os)$/, /^artefact/, /^contact/, /^impact/, /^pact/, /^compact/, /^intact/, /^tact(o|os)$/, /^cact/,
  /^espect/, /^pict/, /^intelect/, /^oct(o|a)/,
  /^adapt/, /^apt(o|a|os|as|idão|idões)$/, /^capt/, /^opç/, /^opt(ar|ou|am|a|e|ei|amos|ando|ado|ados|ativ)/,
  /^rupt/, /^ruptur/, /^abrupt/, /^corrupç/, /^erupç/, /^interrupç/, /^disrupt/, /^inept/,
  /^ficç/, /^ficc/, /^fricç/, /^occip/,
]
/* `production` vem do nome da categoria «Video Production», que entra nos prompts à letra. */
const INGLES = new Set(['excerpt', 'september', 'production', 'accept', 'except', 'script', 'receipt'])
const MESES = /\b(Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)\b/g

function grafiasAntigas(texto) {
  /* O que vem depois de «nunca» é a grafia antiga citada para ser proibida. */
  const semProibidas = String(texto).replace(/nunca\s+«[^»]*»/g, ' ')
  const palavras = semProibidas.match(/\p{L}+/gu) ?? []
  const suspeitas = palavras.filter(pal => {
    const p = pal.toLowerCase()
    return /c[cçt]|p[tç]/.test(p) && !INGLES.has(p) && !LEGITIMAS.some(re => re.test(p))
  })
  return [...suspeitas, ...(semProibidas.match(MESES) ?? [])]
}

test('grafiasAntigas apanha as formas do Acordo antigo', () => {
  for (const velha of ['directo', 'exactamente', 'actuais', 'percepção', 'excepção', 'objectivo', 'colectivo', 'projecto', 'carácter', 'Outubro']) {
    expect(grafiasAntigas(`Uma frase com ${velha} lá dentro.`), velha).toContain(velha)
  }
})

test('grafiasAntigas deixa passar as palavras em que a consoante se pronuncia', () => {
  const legitimo = 'O facto e o contacto com o espectador: adaptar, opção, ficção, corrupção, impacto, egípcio, pictórico, intelectual, exatamente, diretor, atuais, exceção, outubro.'
  expect(grafiasAntigas(legitimo)).toEqual([])
})

test('grafiasAntigas deixa passar a grafia antiga citada depois de «nunca», e só aí', () => {
  expect(grafiasAntigas('«ativo», nunca «activo». «diretor», nunca «director».')).toEqual([])
  expect(grafiasAntigas('Escreve director, nunca «director».')).toEqual(['director'])
})

test('nenhum prompt tem grafia anterior ao Acordo Ortográfico', () => {
  const refEn = { ...REF, lang: 'en', corpo: 'An approved English article.' }
  /* Todas as categorias reais, porque entram nos prompts à letra. */
  const escrever = BLOG_CATEGORIES.map(categoria => promptEscrever({ tema: { ...TEMA, categoria }, referencias: [REF] }))
  const montados = [
    SISTEMA,
    ...escrever,
    promptExpandir({ artigo: { ...REF, slug: 'original' }, referencias: [REF] }),
    promptIngles({ artigoPt: 'Texto em português.', referenciaEn: refEn }),
  ].join('\n\n')

  const encontradas = [...new Set(grafiasAntigas(montados))]
  expect(encontradas, `grafia antiga nos prompts: ${encontradas.join(', ')}. Se a palavra estiver certa no Acordo, acrescenta-a a LEGITIMAS`).toEqual([])
})
