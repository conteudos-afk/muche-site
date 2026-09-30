import { expect, test } from 'vitest'
import { validatePosts } from './validate'
import { loadPosts } from './loadPosts'
import path from 'path'

const bom = {
  slug: 'teste', lang: 'pt' as const,
  title: 'Um título', excerpt: 'Um excerto',
  category: 'Branding & Visual Identity', date: '2026-07-15', readTime: '5 min read',
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

/* O blog ordena por `date`, por isso o formato é uma regra e não um gosto:
   `July 2026` ordenava-se como texto, e `2026-07` empatava com o mês inteiro. */
test('uma data que não é AAAA-MM-DD é apanhada, com o ficheiro e o valor no aviso', () => {
  for (const errada of ['July 2026', '2026-07', '2026-7-5', '15-07-2026', '2026/07/15', '2026-07-15T10:00:00Z', 'brevemente']) {
    const problemas = validatePosts([{ ...bom, date: errada }])
    expect(problemas, errada).toHaveLength(1)
    expect(problemas[0]).toContain('teste/pt.md')
    expect(problemas[0]).toContain(errada)
    expect(problemas[0]).toContain('AAAA-MM-DD')
  }
})

/* `2026-02-30` tem o feitio certo e não existe: escrita de volta, a data sai
   como 2 de março. */
test('uma data com o feitio certo mas impossível no calendário é apanhada', () => {
  for (const impossivel of ['2026-02-30', '2026-02-29', '2026-13-01', '2026-00-10', '2026-04-31', '2026-07-00']) {
    expect(validatePosts([{ ...bom, date: impossivel }]), impossivel).toHaveLength(1)
  }
})

test('as datas possíveis passam, o 29 de fevereiro só em ano bissexto', () => {
  for (const boa of ['2026-01-01', '2026-12-31', '2028-02-29', '2026-07-15']) {
    expect(validatePosts([{ ...bom, date: boa }]), boa).toEqual([])
  }
})

/* O mesmo limite do `lerInstante`: um ano de três dígitos escrito com zeros
   à frente é um erro de escrita, não uma data. */
test('um ano anterior a 2000 é apanhado', () => {
  for (const antiga of ['1999-12-31', '0026-07-15']) {
    expect(validatePosts([{ ...bom, date: antiga }]), antiga).toHaveLength(1)
  }
})

/* Uma data em falta já foi contada como campo obrigatório. */
test('uma data vazia dá um problema, não dois', () => {
  expect(validatePosts([{ ...bom, date: '' }])).toHaveLength(1)
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
