import { expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { ArticleView } from './ArticleView'
import { BlogListView } from './BlogListView'
import { criarPrimeiraPintura, veioPrerenderizado } from '../primeiraPintura'
import { revealInitialState } from '../../../scripts/head.mjs'
import type { Post } from '@/lib/blog/types'

const post: Post = {
  slug: 'teste', lang: 'en', title: 'Um título', excerpt: 'Um excerto',
  category: 'Branding & Visual Identity', date: '2026-09-29',
  readTime: '3 min read', bodyHtml: '<p>Parágrafo.</p>',
}

/* ─── O defeito ──────────────────────────────────────────────────────────────
   O texto pré-renderizado desaparecia e voltava: o `motion` arrancava de
   `opacity: 0` por cima de texto que já estava no ecrã. Aqui mede-se o que o
   `motion` escreve no primeiro render, que é o estado a partir do qual anima. */

test('no servidor, as vistas continuam a escrever o estado inicial da animação', () => {
  /* É o estado que o `revealInitialState` neutraliza no HTML estático. Se
     `instant` passasse a ser o comportamento por omissão, a navegação dentro da
     aplicação perdia as animações de entrada. */
  const artigo = renderToString(createElement(ArticleView, { post, lang: 'en' }))
  expect(artigo).toMatch(/opacity:0[;"]/)
  const lista = renderToString(createElement(BlogListView, { posts: [post], lang: 'en' }))
  expect(lista).toMatch(/opacity:0[;"]/)
})

test('o HTML estático que o build escreve não fica com nada invisível', () => {
  const artigo = revealInitialState(renderToString(createElement(ArticleView, { post, lang: 'en' })))
  expect(artigo).not.toMatch(/opacity:0[;"]/)
})

test('com `instant`, o artigo não arranca de opacidade 0 nem de deslocamento', () => {
  const html = renderToString(createElement(ArticleView, { post, lang: 'en', instant: true }))
  expect(html).not.toMatch(/opacity:0[;"]/)
  expect(html).not.toMatch(/translateY\(\d/)
  expect(html).not.toContain('scaleX(0)')
  /* O conteúdo está lá, e o corpo é o do artigo. */
  expect(html).toContain('Um título')
  expect(html).toContain('<p>Parágrafo.</p>')
})

test('com `instant`, a lista não arranca de opacidade 0 nem de deslocamento', () => {
  const html = renderToString(createElement(BlogListView, { posts: [post, { ...post, slug: 'outro' }], lang: 'en', instant: true }))
  expect(html).not.toMatch(/opacity:0[;"]/)
  expect(html).not.toMatch(/translateY\(\d/)
  expect(html).toContain('Um título')
})

/* ─── O sinal ─────────────────────────────────────────────────────────────── */

test('o `#root` com conteúdo diz que a página veio pré-renderizada; vazio, não', () => {
  expect(veioPrerenderizado({ hasChildNodes: () => true })).toBe(true)
  expect(veioPrerenderizado({ hasChildNodes: () => false })).toBe(false)
  /* Sem `#root` (ou sem `document`, como nos testes) não há sinal. */
  expect(veioPrerenderizado(null)).toBe(false)
  expect(veioPrerenderizado(undefined)).toBe(false)
})

test('o sinal vale só para a primeira página: depois de gasto, tudo anima', () => {
  const sinal = criarPrimeiraPintura(true)
  /* O React pode ler mais do que uma vez antes de montar: todas dão o mesmo. */
  expect(sinal.ler()).toBe(true)
  expect(sinal.ler()).toBe(true)
  sinal.gastar()
  expect(sinal.ler()).toBe(false)
})

test('uma página que não veio pré-renderizada nunca é instantânea', () => {
  const sinal = criarPrimeiraPintura(false)
  expect(sinal.ler()).toBe(false)
})

/* ─── O título ───────────────────────────────────────────────────────────────
   O efeito do `LangProvider` repunha o título genérico do site em cima do da
   página. Não há DOM nestes testes para o correr, por isso a salvaguarda é
   sobre o código: o `i18n.tsx` não volta a escrever o título nem a descrição —
   isso é do `pageMeta`, que conhece a página. A garantia do valor está no
   `pageMeta.test.ts`. */
test('o LangProvider não escreve o título nem a descrição do documento', () => {
  const fonte = readFileSync(new URL('../i18n.tsx', import.meta.url), 'utf8')
  /* Só código: os comentários explicam justamente o que foi tirado. */
  const codigo = fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  expect(codigo).not.toMatch(/document\.title/)
  expect(codigo).not.toMatch(/meta\[name="description"\]/)
})
