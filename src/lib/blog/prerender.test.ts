import { expect, test } from 'vitest'
import { buildHead, revealInitialState } from '../../../scripts/head.mjs'

test('gera metadados próprios por artigo', () => {
  const head = buildHead({
    title: 'Um título', excerpt: 'Um excerto', lang: 'pt',
    slug: 'teste', category: 'Branding & Visual Identity', date: 'September 2026',
  })
  expect(head).toContain('<title>Um título — Muche</title>')
  expect(head).toContain('name="description" content="Um excerto"')
  expect(head).toContain('rel="canonical" href="https://www.muche.pt/blog/teste"')
  expect(head).toContain('hreflang="en" href="https://www.muche.pt/en/blog/teste"')
  expect(head).toContain('"@type":"Article"')
})

test('o HTML estático mostra o texto sem esperar pelo JavaScript', () => {
  const html = revealInitialState(
    '<h1 style="color:#FFAA03;opacity:0;transform:translateY(24px)">Um título</h1>' +
    '<span style="opacity:0.5;text-transform:uppercase">Meta</span>'
  )
  /* O estado inicial da animação desaparece… */
  expect(html).toContain('opacity:1;transform:none')
  /* …mas as opacidades a sério e o `text-transform` ficam como estão. */
  expect(html).toContain('opacity:0.5;text-transform:uppercase')
})
