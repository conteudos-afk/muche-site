import { expect, test } from 'vitest'
import { POSTS, postsFor, sortPosts } from './posts'
import type { Lang, Post } from './types'

const post = (slug: string, date: string, lang: Lang = 'pt'): Post => ({
  slug, lang, date, title: slug, excerpt: '', category: 'Podcasts', readTime: '5 min', bodyHtml: '',
})

const slugs = (posts: Post[]) => posts.map(p => p.slug)

test('o mais recente vem primeiro', () => {
  const r = sortPosts([post('a', '2026-01-05'), post('c', '2026-03-01'), post('b', '2026-02-10')])
  expect(slugs(r)).toEqual(['c', 'b', 'a'])
})

/* O caso que a data por mês não resolvia: oito ou nove artigos no mesmo mês. */
test('dentro do mesmo mês, o dia decide', () => {
  const r = sortPosts([post('a', '2026-07-02'), post('b', '2026-07-28'), post('c', '2026-07-15')])
  expect(slugs(r)).toEqual(['b', 'c', 'a'])
})

/* Dois artigos no mesmo dia — três de cada vez, num lote — não podem depender
   da ordem em que o sistema de ficheiros os entrega. */
test('no mesmo dia desempata pelo slug, seja qual for a ordem de entrada', () => {
  const tres = [post('c', '2026-07-02'), post('a', '2026-07-02'), post('b', '2026-07-02')]
  const permutacoes = [
    [0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0],
  ]
  for (const p of permutacoes) {
    expect(slugs(sortPosts(p.map(i => tres[i])))).toEqual(['a', 'b', 'c'])
  }
})

test('no mesmo dia e no mesmo slug, o en vem antes do pt, seja qual for a ordem de entrada', () => {
  const pt = post('a', '2026-07-02', 'pt')
  const en = post('a', '2026-07-02', 'en')
  expect(sortPosts([pt, en]).map(p => p.lang)).toEqual(['en', 'pt'])
  expect(sortPosts([en, pt]).map(p => p.lang)).toEqual(['en', 'pt'])
})

test('não altera a lista que recebe', () => {
  const entrada = [post('a', '2026-01-01'), post('b', '2026-02-01')]
  sortPosts(entrada)
  expect(slugs(entrada)).toEqual(['a', 'b'])
})

/* A ordem que o leitor vê hoje. Se este teste falhar, a lista mudou — e mudar
   a ordem dos artigos é uma decisão editorial, não um efeito secundário.
   Dentro de cada mês, a ordem é a da antiga lista editorial. */
const ORDEM_DOS_CATORZE = [
  'visual-identity-business-asset',        // 2026-07-20
  'anatomy-of-cinematic-brand-film',       // 2026-07-06
  'discipline-of-editorial-design',        // 2026-06-24
  'designing-for-emotion',                 // 2026-06-16
  'event-photography-tells-story',         // 2026-06-08
  'psychology-of-colour-brand-strategy',   // 2026-05-26
  'short-form-video-brand-strategy',       // 2026-05-14
  'what-makes-podcast-worth-listening',    // 2026-05-05
  'typography-as-personality',             // 2026-04-21
  'product-photography-losing-sales',      // 2026-04-07
  'rebranding-without-losing-audience',    // 2026-03-24
  'hidden-cost-slow-website',              // 2026-03-10
  'pre-production-great-videos',           // 2026-02-17
  'podcast-strategy-before-production',    // 2026-01-20
]

test('os catorze artigos reais saem do mais recente para o mais antigo, em português', () => {
  expect(slugs(postsFor('pt'))).toEqual(ORDEM_DOS_CATORZE)
})

test('e da mesma maneira em inglês', () => {
  expect(slugs(postsFor('en'))).toEqual(ORDEM_DOS_CATORZE)
})

test('as datas dos catorze são todas diferentes: nenhum empate a resolver por desempate', () => {
  const datas = postsFor('pt').map(p => p.date)
  expect(new Set(datas).size).toBe(datas.length)
})

/* Um artigo é um só, em duas línguas. Se o pt e o en tivessem datas
   diferentes, a lista de cada língua ordenava-se de maneira diferente. */
test('as duas línguas de cada artigo têm sempre a mesma data', () => {
  const porSlug = new Map<string, Set<string>>()
  for (const p of POSTS) {
    porSlug.set(p.slug, (porSlug.get(p.slug) ?? new Set()).add(p.date))
  }
  expect(porSlug.size).toBe(14)
  for (const [slug, datas] of porSlug) {
    expect([...datas], `${slug}: datas diferentes entre pt e en`).toHaveLength(1)
  }
  for (const slug of porSlug.keys()) {
    expect(POSTS.filter(p => p.slug === slug).map(p => p.lang).sort(), slug).toEqual(['en', 'pt'])
  }
})
