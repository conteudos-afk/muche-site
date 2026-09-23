import { expect, test, vi } from 'vitest'
import type { MouseEvent } from 'react'
import { blogHref, articleHref, linkProps } from './navigate'

test('cada idioma tem o seu endereço — pt na raiz, en debaixo de /en', () => {
  expect(blogHref('pt')).toBe('/blog')
  expect(blogHref('en')).toBe('/en/blog')
  expect(articleHref('um-artigo', 'pt')).toBe('/blog/um-artigo')
  expect(articleHref('um-artigo', 'en')).toBe('/en/blog/um-artigo')
})

/* O erro que isto apanha: o `href` e o `onClick` com destinos diferentes — o
   clique ia para um sítio e o "abrir noutro separador" para outro. */
test('o href e o onClick saem sempre com o mesmo destino', () => {
  const onNavigate = vi.fn()
  const props = linkProps(articleHref('um-artigo', 'en'), onNavigate)
  expect(props.href).toBe('/en/blog/um-artigo')

  const clique = { button: 0, defaultPrevented: false, preventDefault: vi.fn() } as unknown as MouseEvent
  props.onClick?.(clique)
  expect(onNavigate).toHaveBeenCalledWith(props.href)
})

/* Na pré-renderização não há router: o `<a href>` tem de ficar sozinho, sem
   um `onClick` que chame um `onNavigate` que não existe. */
test('sem onNavigate fica só o href, para o HTML estático funcionar', () => {
  const props = linkProps('/en/blog', undefined)
  expect(props.href).toBe('/en/blog')
  expect(props.onClick).toBeUndefined()
})
