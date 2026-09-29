import { expect, test } from 'vitest'
import { contarArtigos, MARCA_AVISO, ETIQUETA, BOTS } from './contador.mjs'

test('conta um artigo por cada pt.md', () => {
  expect(contarArtigos([
    { path: 'content/blog/um/pt.md' },
    { path: 'content/blog/um/en.md' },
    { path: 'content/blog/dois/pt.md' },
    { path: 'content/blog/dois/en.md' },
  ])).toBe(2)
})

test('não conta o ficheiro de temas nem outras pastas com underscore', () => {
  expect(contarArtigos([
    { path: 'content/blog/_temas.yml' },
    { path: 'content/blog/_rascunho/pt.md' },
    { path: 'content/blog/um/pt.md' },
  ])).toBe(1)
})

test('não conta ficheiros fora do blog', () => {
  expect(contarArtigos([{ path: 'src/app/App.tsx' }, { path: 'README.md' }])).toBe(0)
})

test('não conta um pt.md em subpasta mais funda', () => {
  expect(contarArtigos([{ path: 'content/blog/um/dois/pt.md' }])).toBe(0)
})

test('sem ficheiros não há artigos (etiqueta ainda sem nenhum PR)', () => {
  expect(contarArtigos([])).toBe(0)
})

test('só conta a partir da raiz do repositório e da pasta do blog', () => {
  expect(contarArtigos([
    { path: 'src/content/blog/um/pt.md' },
    { path: 'content/outro/um/pt.md' },
    { path: 'content/blog/pt.md' },
  ])).toBe(0)
})

test('o nome do ficheiro tem de ser exatamente pt.md', () => {
  expect(contarArtigos([
    { path: 'content/blog/um/pt.md.bak' },
    { path: 'content/blog/um/pt.mdx' },
    { path: 'content/blog/um/xpt.md' },
    { path: 'content/blog/um/ptxmd' },
    { path: 'content/blog/um/PT.md' },
  ])).toBe(0)
})

test('só o underscore no início da pasta a exclui', () => {
  expect(contarArtigos([{ path: 'content/blog/um_dois/pt.md' }])).toBe(1)
})

test('a etiqueta é a que os workflows usam', () => {
  expect(ETIQUETA).toBe('artigo-automatico')
})

test('a marca do aviso é um comentário HTML, invisível na página', () => {
  expect(MARCA_AVISO).toMatch(/^<!--.*-->$/)
})

test('a lista de bots inclui o do GitHub Actions', () => {
  expect(BOTS).toContain('github-actions[bot]')
})
