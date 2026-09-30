import { expect, test } from 'vitest'
import { contarArtigos, artigosPublicados, foraDoAmbito, ehBot, MARCA_AVISO, ETIQUETA } from './contador.mjs'

/* O que o `gh pr view --json files` devolve por ficheiro (mais additions e
   deletions, que aqui não interessam). */
const add = path => ({ path, changeType: 'ADDED' })
const com = (path, changeType) => ({ path, changeType })

test('conta um artigo por cada pt.md', () => {
  expect(contarArtigos([
    add('content/blog/um/pt.md'),
    add('content/blog/um/en.md'),
    add('content/blog/dois/pt.md'),
    add('content/blog/dois/en.md'),
  ])).toBe(2)
})

test('não conta o ficheiro de temas nem outras pastas com underscore', () => {
  expect(contarArtigos([
    add('content/blog/_temas.yml'),
    add('content/blog/_rascunho/pt.md'),
    add('content/blog/um/pt.md'),
  ])).toBe(1)
})

test('não conta ficheiros fora do blog', () => {
  expect(contarArtigos([add('src/app/App.tsx'), add('README.md')])).toBe(0)
})

test('não conta um pt.md em subpasta mais funda', () => {
  expect(contarArtigos([add('content/blog/um/dois/pt.md')])).toBe(0)
})

test('sem ficheiros não há artigos (etiqueta ainda sem nenhum PR)', () => {
  expect(contarArtigos([])).toBe(0)
})

test('só conta a partir da raiz do repositório e da pasta do blog', () => {
  expect(contarArtigos([
    add('src/content/blog/um/pt.md'),
    add('content/outro/um/pt.md'),
    add('content/blog/pt.md'),
  ])).toBe(0)
})

test('o nome do ficheiro tem de ser exatamente pt.md', () => {
  expect(contarArtigos([
    add('content/blog/um/pt.md.bak'),
    add('content/blog/um/pt.mdx'),
    add('content/blog/um/xpt.md'),
    add('content/blog/um/ptxmd'),
    add('content/blog/um/PT.md'),
  ])).toBe(0)
})

test('só o underscore no início da pasta a exclui', () => {
  expect(contarArtigos([add('content/blog/um_dois/pt.md')])).toBe(1)
})

test('a etiqueta é a que os workflows usam', () => {
  expect(ETIQUETA).toBe('artigo-automatico')
})

test('a marca do aviso é um comentário HTML, invisível na página', () => {
  expect(MARCA_AVISO).toMatch(/^<!--.*-->$/)
})

/* Só um ficheiro ADDED é um artigo novo. Ler «alterado» como «novo» fazia a
   rampa subir com uma revisão, uma tradução ou um `--expandir`: o PR #18 deste
   repositório alterou 14 `pt.md` e, com a etiqueta, saltava o limiar dos 10 de
   uma vez. Ler alto é o lado perigoso — junta coisas que ninguém aprovou. */
const PT = 'content/blog/um/pt.md'

test('só conta um pt.md ADDED: alterado, apagado e copiado não são artigos novos', () => {
  expect(contarArtigos([com(PT, 'MODIFIED')])).toBe(0)
  expect(contarArtigos([com(PT, 'DELETED')])).toBe(0)
  expect(contarArtigos([com(PT, 'COPIED')])).toBe(0)
  expect(contarArtigos([com(PT, 'CHANGED')])).toBe(0)
  expect(contarArtigos([com(PT, 'ADDED')])).toBe(1)
})

test('um pt.md renomeado para dentro do blog não é um artigo novo', () => {
  expect(contarArtigos([com('content/blog/novo/pt.md', 'RENAMED')])).toBe(0)
})

test('sem changeType não conta: na dúvida lê-se baixo, nunca alto', () => {
  expect(contarArtigos([{ path: PT }])).toBe(0)
  expect(contarArtigos([{ path: PT, changeType: undefined }])).toBe(0)
  expect(contarArtigos([{ path: PT, changeType: null }])).toBe(0)
})

test('o changeType é exatamente ADDED, sem variações de maiúsculas', () => {
  expect(contarArtigos([com(PT, 'added')])).toBe(0)
  expect(contarArtigos([com(PT, 'Added')])).toBe(0)
})

test('num PR misto conta só os pt.md novos', () => {
  expect(contarArtigos([
    com('content/blog/novo/pt.md', 'ADDED'),
    com('content/blog/novo/en.md', 'ADDED'),
    com('content/blog/velho/pt.md', 'MODIFIED'),
    com('content/blog/apagado/pt.md', 'DELETED'),
    com('content/blog/_temas.yml', 'MODIFIED'),
  ])).toBe(1)
})

/* Estes logins são os que o `gh pr view --json comments` devolve mesmo: o da
   Cloudflare vem SEM o sufixo `[bot]` (verificado nos PRs #17 e #18); a API
   REST devolve-o COM. Quem decide se um comentário é humano tem de aceitar as
   duas formas — se não aceitar, todos os PRs (todos têm o comentário de preview
   da Cloudflare) parecem ter comentário humano, o relógio das 48 horas nunca
   corre e o merge automático nunca dispara. */
test('o comentário da Cloudflare não é humano, venha com ou sem [bot]', () => {
  expect(ehBot('cloudflare-workers-and-pages')).toBe(true)
  expect(ehBot('cloudflare-workers-and-pages[bot]')).toBe(true)
})

test('o comentário do GitHub Actions não é humano, venha com ou sem [bot]', () => {
  expect(ehBot('github-actions')).toBe(true)
  expect(ehBot('github-actions[bot]')).toBe(true)
})

test('uma pessoa não é um bot', () => {
  expect(ehBot('fabio')).toBe(false)
  expect(ehBot('conteudos-afk')).toBe(false)
})

test('só o nome inteiro conta: um utilizador com nome parecido continua humano', () => {
  expect(ehBot('github-actions-fan')).toBe(false)
  expect(ehBot('my-github-actions')).toBe(false)
  expect(ehBot('cloudflare-workers-and-pages-x')).toBe(false)
  /* O sufixo só se tira do fim: um `[bot]` a meio não reconstrói um nome de bot. */
  expect(ehBot('github-[bot]actions')).toBe(false)
})

test('sem autor (conta apagada) trata-se como humano: na dúvida o relógio pára', () => {
  expect(ehBot(undefined)).toBe(false)
  expect(ehBot(null)).toBe(false)
  expect(ehBot('')).toBe(false)
})

test('a comparação ignora maiúsculas, como o GitHub', () => {
  expect(ehBot('GitHub-Actions[bot]')).toBe(true)
})

test('âmbito: artigos novos nas duas línguas e a lista de temas passam', () => {
  expect(foraDoAmbito([
    add('content/blog/um/pt.md'),
    add('content/blog/um/en.md'),
    com('content/blog/_temas.yml', 'MODIFIED'),
  ])).toBeNull()
})

test('âmbito: um artigo mais uma alteração a scripts/prazo nomeia o ficheiro', () => {
  const motivo = foraDoAmbito([
    add('content/blog/um/pt.md'),
    com('scripts/prazo/decidir.mjs', 'MODIFIED'),
    com('package.json', 'MODIFIED'),
  ])
  expect(motivo).toContain('scripts/prazo/decidir.mjs')
  expect(motivo).toContain('package.json')
})

test('âmbito: apagar ou renomear mesmo um ficheiro de artigo fica de fora', () => {
  expect(foraDoAmbito([com('content/blog/um/pt.md', 'DELETED')])).toContain('DELETED')
  expect(foraDoAmbito([com('content/blog/um/pt.md', 'RENAMED')])).toContain('RENAMED')
})

test('âmbito: outros ficheiros dentro de content/blog ficam de fora', () => {
  for (const path of [
    'content/blog/um/imagem.png',
    'content/blog/um/fr.md',
    'content/blog/um/sub/pt.md',
    'content/blog/_rascunho/pt.md',
    'content/blog/README.md',
    'content/blog/../../src/x.md',
    'content/blog/um/pt.md.exe',
  ]) {
    expect(foraDoAmbito([add(path)]), path).toContain('fora do âmbito')
  }
})

test('âmbito: sem changeType, sem path, ou sem lista, não passa', () => {
  expect(foraDoAmbito([{ path: 'content/blog/um/pt.md' }])).not.toBeNull()
  expect(foraDoAmbito([{ changeType: 'ADDED' }])).not.toBeNull()
  expect(foraDoAmbito(undefined)).not.toBeNull()
  expect(foraDoAmbito(null)).not.toBeNull()
})

test('âmbito: uma lista de 100 ficheiros pode estar cortada e não passa', () => {
  const cem = Array.from({ length: 100 }, (_, i) => add(`content/blog/a${i}/pt.md`))
  expect(foraDoAmbito(cem)).toContain('cortada')
  expect(foraDoAmbito(cem.slice(1))).toBeNull()
})

test('âmbito e contagem partilham a definição de artigo', () => {
  /* Tudo o que a contagem toma por artigo tem de passar o portão. */
  for (const path of ['content/blog/x/pt.md', 'content/blog/a-b_c/pt.md']) {
    expect(contarArtigos([add(path)])).toBe(1)
    expect(foraDoAmbito([add(path)])).toBeNull()
  }
})

test('âmbito: nomeia até três caminhos e conta os restantes', () => {
  const motivo = foraDoAmbito(['a', 'b', 'c', 'd', 'e'].map(n => com(`src/${n}.ts`, 'MODIFIED')))
  expect(motivo).toContain('src/a.ts')
  expect(motivo).toContain('src/c.ts')
  expect(motivo).not.toContain('src/d.ts')
  expect(motivo).toContain('e mais 2')
})

test('âmbito: um PR de expandir (tudo MODIFIED) fica de fora, com a razão', () => {
  const motivo = foraDoAmbito([
    com('content/blog/um/pt.md', 'MODIFIED'),
    com('content/blog/um/en.md', 'MODIFIED'),
    com('content/blog/_temas.yml', 'MODIFIED'),
  ])
  expect(motivo).toContain('fora do âmbito')
  expect(motivo).toContain('content/blog/um/pt.md [MODIFIED]')
  expect(motivo).toContain('alterar um que já existe é com uma pessoa')
})

test('âmbito: um artigo novo com a edição de um publicado ao lado fica de fora', () => {
  const motivo = foraDoAmbito([
    add('content/blog/novo/pt.md'),
    add('content/blog/novo/en.md'),
    com('content/blog/publicado/pt.md', 'MODIFIED'),
  ])
  expect(motivo).toContain('content/blog/publicado/pt.md [MODIFIED]')
  expect(motivo).not.toContain('content/blog/novo/')
})

test('âmbito: a lista de temas pode ser editada mas não apagada nem renomeada', () => {
  expect(foraDoAmbito([com('content/blog/_temas.yml', 'MODIFIED')])).toBeNull()
  expect(foraDoAmbito([com('content/blog/_temas.yml', 'DELETED')])).toContain('DELETED')
  expect(foraDoAmbito([com('content/blog/_temas.yml', 'RENAMED')])).toContain('RENAMED')
})

test('âmbito: uma alteração de artigo que não seja edição não leva a dica do expandir', () => {
  expect(foraDoAmbito([com('src/a.ts', 'MODIFIED')])).not.toContain('com uma pessoa')
})

test('artigosPublicados: uma só chamada, ficheiros incluídos, só conta os ADDED', () => {
  const chamadas = []
  const ghJson = args => {
    chamadas.push(args)
    return [
      { number: 1, files: [add('content/blog/a/pt.md'), add('content/blog/a/en.md')] },
      { number: 2, files: [com('content/blog/b/pt.md', 'MODIFIED'), add('content/blog/c/pt.md')] },
    ]
  }
  expect(artigosPublicados(ghJson)).toBe(2)
  expect(chamadas).toHaveLength(1)
  expect(chamadas[0].join(' ')).toContain('--state merged')
  expect(chamadas[0].join(' ')).toContain(`--label ${ETIQUETA}`)
  expect(chamadas[0][chamadas[0].length - 1]).toBe('number,files')
})

test('artigosPublicados: sem lista de ficheiros rebenta em vez de contar zero', () => {
  expect(() => artigosPublicados(() => [{ number: 1 }])).toThrow()
})
