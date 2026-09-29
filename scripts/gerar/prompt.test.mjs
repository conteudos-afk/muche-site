import { expect, test } from 'vitest'
import { SISTEMA, promptEscrever, promptExpandir, promptIngles } from './prompt.mjs'
import { BLOG_CATEGORIES } from '../../src/lib/blog/categories.ts'
import { grafiasAntigas } from './grafia.mjs'

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

test('a regra dos meses é só para português: o date do frontmatter fica em inglês', () => {
  expect(SISTEMA).toContain('Em português, os meses escrevem-se com minúscula')
  expect(SISTEMA).toContain('O `date` do frontmatter não conta: é sempre em inglês.')
})

test('o sistema diz ao modelo que o readTime é calculado depois e que qualquer valor plausível serve', () => {
  expect(SISTEMA).toContain('qualquer valor plausível')
  expect(SISTEMA).toContain('calculado depois, por código')
})

/* ─── Nenhuma grafia anterior ao Acordo nos prompts ─────────────────────────
   O detector e a razão das suas três portas de saída (inglês, raízes
   legítimas, «nunca «…»») estão em `grafia.mjs`. Aqui testa-se o detector
   com texto de agência realista — o que interessa é que NADA legítimo
   dispare — e depois aplica-se aos prompts. ─── */
const ANTIGAS = [
  'directo', 'directas', 'exactamente', 'actuais', 'percepção', 'excepção', 'objectivo', 'colectivo',
  'projecto', 'carácter', 'actor', 'dialecto', 'reflectir', 'óptimo', 'espectáculo', 'recepção',
  'concepção', 'factura', 'fractura', 'sector', 'Egipto', 'adopção', 'electrónico', 'arquitecto',
]

test('grafiasAntigas apanha as formas do Acordo antigo', () => {
  for (const velha of ANTIGAS) {
    expect(grafiasAntigas(`Uma frase com ${velha} lá dentro.`), velha).toContain(velha)
  }
  expect(grafiasAntigas('Adiado para Outubro.'), 'Outubro').toEqual(['Outubro'])
})

/* Português correcto, de agência: cada palavra aqui já disparou, ou dispararia,
   numa versão anterior da lista. */
const TEXTO_DE_AGENCIA = `As características do projeto definem a caracterização da marca. Cada cliente
traz expectativas e uma convicção sobre a dicção da voz; o facto é que o contacto
diário com o espectador dita o impacto. Para conectar a equipa, a conectividade
das ferramentas importa: um pacote de scripts, uma secção de criptografia e um
mundo cripto que muda depressa. O receptor mais receptivo lê o conceito conceptual
como uma análise factual, quase fractal, e as formas fractais. Podes adaptar, optar, captar: a opção
de ficção ou de corrupção de dados, uma interrupção abrupta, um helicóptero no céu.
Um egípcio, um eucalipto e um artefacto pictórico; a intersecção dos temas.
Tudo isto no dia 25 de Abril, ou a 1.º de Maio, ou a 5 de Outubro.`

/* Inglês em texto português: a REGRA, não uma lista. */
const TEXTO_COM_INGLES = `O call-to-action do project mostra o product e a direction. Um concept com
prompts e scripts para a collection, a selection e o object. Um site interactive,
uma picture, uma sculpture, um fact, um effect, uma action e a Accenture.
Actions, products, projects, characters, directors e activity, exactly e actually.`

test('grafiasAntigas não dispara em português correcto de agência', () => {
  expect(grafiasAntigas(TEXTO_DE_AGENCIA)).toEqual([])
})

test('grafiasAntigas não dispara em inglês no meio de português', () => {
  expect(grafiasAntigas(TEXTO_COM_INGLES)).toEqual([])
})

test('grafiasAntigas: «espectáculo» e «recepção» são a forma antiga, «espectador» e «receptor» não', () => {
  expect(grafiasAntigas('O espectáculo e a recepção.')).toEqual(['espectáculo', 'recepção'])
  expect(grafiasAntigas('O espectador e o receptor.')).toEqual([])
})

test('grafiasAntigas: a maiúscula dos feriados aceita-se depois de «<número> de», e só aí', () => {
  expect(grafiasAntigas('O 25 de Abril e o 1.º de Maio.')).toEqual([])
  expect(grafiasAntigas('Em Abril e em Maio.')).toEqual(['Abril', 'Maio'])
})

test('grafiasAntigas deixa passar a grafia antiga citada depois de «nunca», e só aí', () => {
  expect(grafiasAntigas('«ativo», nunca «activo». «diretor», nunca «director».')).toEqual([])
  expect(grafiasAntigas('Escreve director, nunca «director».')).toEqual(['director'])
})

/* Um «nunca «» por fechar não pode esconder o que vem a seguir. O padrão
   antigo `nunca\s+«[^»]*»` atravessava linhas e engolia tudo até ao
   próximo `»`. */
test('grafiasAntigas: um «nunca «» por fechar não engole as linhas seguintes', () => {
  const escondido = 'Escreve nunca «director\nsem fechar; o directo e o objectivo\nficam à vista, e a excepção também\ne depois nunca «activo».'
  expect(grafiasAntigas(escondido)).toEqual(expect.arrayContaining(['directo', 'objectivo', 'excepção']))
})

test('grafiasAntigas: uma citação não atravessa a mudança de linha, mesmo curta', () => {
  expect(grafiasAntigas('nunca «director\nfoi o directo»')).toEqual(expect.arrayContaining(['director', 'directo']))
})

test('grafiasAntigas: um «nunca «» por fechar na mesma linha também não engole nada', () => {
  expect(grafiasAntigas('nunca «director e o directo dos «x» e da percepção')).toEqual(expect.arrayContaining(['director', 'directo', 'percepção']))
  /* E uma citação com mais de 40 caracteres deixa de ser uma citação. */
  expect(grafiasAntigas(`nunca «${'a'.repeat(41)} director»`)).toEqual(['director'])
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
