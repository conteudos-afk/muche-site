import { expect, test } from 'vitest'
import { validatePosts } from './validate'
import { loadPosts } from './loadPosts'
import path from 'path'

const bom = {
  slug: 'teste', lang: 'pt' as const,
  title: 'Um título', excerpt: 'Um excerto',
  category: 'Branding & Visual Identity', date: 'July 2026', readTime: '5 min read',
}

test('um artigo completo não tem nada a apontar', () => {
  expect(validatePosts([bom])).toEqual([])
})

/* O erro mais provável de todos: uma chave mal escrita. O `parsePost`
   resolve-a com `?? ''` e o que sai publicado é um `<title> — Muche</title>`
   com descrição vazia. */
test('um campo em falta é apanhado, com o ficheiro e o campo no aviso', () => {
  const problemas = validatePosts([{ ...bom, title: '' }])
  expect(problemas).toHaveLength(1)
  expect(problemas[0]).toContain('teste/pt.md')
  expect(problemas[0]).toContain('title')
})

test('todos os campos obrigatórios são exigidos', () => {
  for (const campo of ['title', 'excerpt', 'category', 'date', 'readTime'] as const) {
    const problemas = validatePosts([{ ...bom, [campo]: '' }])
    expect(problemas.some(p => p.includes(`"${campo}"`))).toBe(true)
  }
})

/* Espaços não contam como valor: `title: "  "` é um título vazio. */
test('um campo só com espaços conta como vazio', () => {
  expect(validatePosts([{ ...bom, excerpt: '   ' }])).toHaveLength(1)
})

test('uma categoria fora da lista é apanhada', () => {
  const problemas = validatePosts([{ ...bom, category: 'Branding' }])
  expect(problemas).toHaveLength(1)
  expect(problemas[0]).toContain('Branding')
  expect(problemas[0]).toContain('Podcasts')
})

/* Uma categoria em falta já foi contada como campo obrigatório; contá-la
   outra vez como categoria desconhecida só faria barulho. */
test('uma categoria vazia dá um problema, não dois', () => {
  expect(validatePosts([{ ...bom, category: '' }])).toHaveLength(1)
})

test('os problemas de vários artigos aparecem todos de uma vez', () => {
  const problemas = validatePosts([
    { ...bom, slug: 'um', title: '' },
    { ...bom, slug: 'dois', lang: 'en', date: '' },
  ])
  expect(problemas).toHaveLength(2)
  expect(problemas[0]).toContain('um/pt.md')
  expect(problemas[1]).toContain('dois/en.md')
})

/* A rede a valer: é isto que o `prerender.mjs` corre no build, e o conteúdo
   que está no repositório tem de passar. */
test('os artigos do repositório passam a validação', () => {
  const posts = loadPosts(path.resolve(__dirname, '../../../content/blog'))
  expect(posts.length).toBeGreaterThan(0)
  expect(validatePosts(posts)).toEqual([])
})
