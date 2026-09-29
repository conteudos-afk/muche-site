import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import { grafiasAntigas } from './grafia.mjs'

const dispara = palavra => grafiasAntigas(`Uma frase com ${palavra} lá dentro.`)

/* ─── Prefixos ───────────────────────────────────────────────────────────────
   As raízes legítimas estavam ancoradas com `^`, por isso a mesma palavra
   certa deixava de o ser assim que levava um prefixo. */
const COM_PREFIXO = [
  'desconectar', 'reconectar', 'interconectado', 'ininterruptamente',
  'incorrupto', 'descaracterizar', 'factualmente', 'inapto',
]

test('uma palavra legítima com prefixo (in, des, re, inter) continua legítima', () => {
  for (const pal of COM_PREFIXO) expect(dispara(pal), pal).toEqual([])
})

/* O outro lado: o prefixo não pode legitimar a grafia antiga. */
const ANTIGAS_COM_PREFIXO = ['indirecto', 'inactivo', 'reacção', 'interacção', 'redacção', 'reflectir']

test('o prefixo não legitima a grafia antiga', () => {
  for (const pal of ANTIGAS_COM_PREFIXO) expect(dispara(pal), pal).toContain(pal)
})

/* ─── Terminações inglesas ───────────────────────────────────────────────────
   Só se aceitam as que nenhuma palavra portuguesa tem. `-or` e `-al` ficam de
   fora, de propósito: `director`, `actor`, `sector`, `actual` são
   justamente as formas antigas que interessa apanhar. */
const INGLES = [
  'directed', 'connected', 'selected', 'accepted', 'optimize', 'optimized',
  'optimal', 'acceptance', 'spectator', 'enactment', 'enactments', 'effectiveness', 'optimizer',
  'captain', 'success', 'successful', 'succeed', 'succeeded', 'selecting',
]

test('inglês com as terminações -ed, -ize, -ment, -ness, -ance, -ator (e as palavras que a estreita de capt/succ largou) não dispara', () => {
  for (const pal of INGLES) expect(dispara(pal), pal).toEqual([])
})

test('as terminações portuguesas -or e -al continuam a disparar na forma antiga', () => {
  for (const pal of ['actor', 'director', 'sector', 'actual', 'factor', 'contractual', 'projector']) {
    expect(dispara(pal), pal).toContain(pal)
  }
})

/* Limite conhecido e documentado no cabeçalho do módulo. */
test('«contractor» dispara: termina em -or como «actor», e não se distingue', () => {
  expect(dispara('contractor')).toEqual(['contractor'])
})

/* ─── Raízes estreitas ───────────────────────────────────────────────────────
   `capt` e `succ` eram largas de mais e deixavam passar «captivante» e
   «succinto». */
test('«captivante», «captivar» e «succinto» são a forma antiga', () => {
  for (const pal of ['captivante', 'captivar', 'captivo', 'succinto', 'succinta']) {
    expect(dispara(pal), pal).toContain(pal)
  }
})

test('captar, capturar e sucção continuam legítimos, em todas as flexões', () => {
  const certas = [
    'captar', 'capta', 'captam', 'captou', 'captei', 'captámos', 'captando', 'captado',
    'captada', 'captados', 'captação', 'captações', 'captor', 'captores',
    'captura', 'capturar', 'capturado', 'capturam', 'capturou',
    'sucção', 'succionar',
  ]
  for (const pal of certas) expect(dispara(pal), pal).toEqual([])
})

/* ─── Os artigos reais ───────────────────────────────────────────────────────
   Uma lista FIXA de slugs, e não um glob sobre `content/blog/`. Uma lista fixa
   é determinista: um artigo novo, com um falso positivo, não pode pôr a build
   vermelha — e um teste que faz isso é o primeiro a ser apagado. O que ela
   guarda é o que já foi lido e aprovado: nada de legítimo dispara nestes 14. */
const ARTIGOS_APROVADOS = [
  'anatomy-of-cinematic-brand-film',
  'designing-for-emotion',
  'discipline-of-editorial-design',
  'event-photography-tells-story',
  'hidden-cost-slow-website',
  'podcast-strategy-before-production',
  'pre-production-great-videos',
  'product-photography-losing-sales',
  'psychology-of-colour-brand-strategy',
  'rebranding-without-losing-audience',
  'short-form-video-brand-strategy',
  'typography-as-personality',
  'visual-identity-business-asset',
  'what-makes-podcast-worth-listening',
]

test('nenhum dos 14 artigos aprovados em português dispara', () => {
  expect(ARTIGOS_APROVADOS).toHaveLength(14)
  for (const slug of ARTIGOS_APROVADOS) {
    const texto = fs.readFileSync(path.join('content/blog', slug, 'pt.md'), 'utf-8')
    expect(grafiasAntigas(texto), slug).toEqual([])
  }
})
