import { expect, test, vi } from 'vitest'
import type { MouseEvent } from 'react'
import { matchPath } from 'react-router'
import { blogHref, articleHref, linkProps } from './navigate'

test('cada idioma tem o seu endereço — pt na raiz, en debaixo de /en', () => {
  expect(blogHref('pt')).toBe('/blog/')
  expect(blogHref('en')).toBe('/en/blog/')
  expect(articleHref('um-artigo', 'pt')).toBe('/blog/um-artigo/')
  expect(articleHref('um-artigo', 'en')).toBe('/en/blog/um-artigo/')
})

/* A Cloudflare Pages serve `dist/blog/<slug>/index.html` em `/blog/<slug>/` e
   responde 308 a quem peça a forma sem barra. Se daqui saíssem endereços sem
   barra, cada ligação interna — e cada `canonical` e cada `<loc>`, que usam o
   mesmo mapa — apontava para um redirecionamento. */
test('todos os endereços saem na forma que a Cloudflare serve, com barra final', () => {
  for (const href of [blogHref('pt'), blogHref('en'), articleHref('x', 'pt'), articleHref('x', 'en')]) {
    expect(href.endsWith('/')).toBe(true)
  }
})

/* O outro lado da mesma moeda: com a barra final, as rotas do router têm de
   continuar a casar. Os padrões são os do `createBrowserRouter` no `App.tsx`,
   onde vivem como filhos de `/`. */
test('o router continua a casar com os endereços com barra final', () => {
  expect(matchPath({ path: '/blog' }, blogHref('pt'))).not.toBeNull()
  expect(matchPath({ path: '/en/blog' }, blogHref('en'))).not.toBeNull()

  /* E o `:slug` chega sem a barra — é ele que vai ao `postBySlug`. */
  const pt = matchPath({ path: '/blog/:slug' }, articleHref('um-artigo', 'pt'))
  expect(pt?.params.slug).toBe('um-artigo')
  const en = matchPath({ path: '/en/blog/:slug' }, articleHref('um-artigo', 'en'))
  expect(en?.params.slug).toBe('um-artigo')
})

/* O erro que isto apanha: o `href` e o `onClick` com destinos diferentes — o
   clique ia para um sítio e o "abrir noutro separador" para outro. */
test('o href e o onClick saem sempre com o mesmo destino', () => {
  const onNavigate = vi.fn()
  const props = linkProps(articleHref('um-artigo', 'en'), onNavigate)
  expect(props.href).toBe('/en/blog/um-artigo/')

  const clique = { button: 0, defaultPrevented: false, preventDefault: vi.fn() } as unknown as MouseEvent
  props.onClick?.(clique)
  expect(onNavigate).toHaveBeenCalledWith(props.href)
})

/* Na pré-renderização não há router: o `<a href>` tem de ficar sozinho, sem
   um `onClick` que chame um `onNavigate` que não existe. */
test('sem onNavigate fica só o href, para o HTML estático funcionar', () => {
  const props = linkProps('/en/blog/', undefined)
  expect(props.href).toBe('/en/blog/')
  expect(props.onClick).toBeUndefined()
})
