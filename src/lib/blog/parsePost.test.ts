import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import { parsePost, splitFrontmatter } from './parsePost'

/* O leitor de frontmatter suporta uma fatia pequena de YAML de propósito.
   Estes testes fixam duas coisas: o que ele lê bem, e o que ele faz quando
   encontra algo que não sabe ler — que tem de ser avisar, nunca devolver uma
   string errada em silêncio. */

let warn: ReturnType<typeof vi.spyOn>

beforeEach(() => { warn = vi.spyOn(console, 'warn').mockImplementation(() => {}) })
afterEach(() => { warn.mockRestore() })

const fm = (...lines: string[]) => `---\n${lines.join('\n')}\n---\n\nCorpo.\n`

describe('o que lê bem, sem avisos', () => {
  test('valores entre aspas duplas, aspas simples e sem aspas', () => {
    const { data } = splitFrontmatter(fm(
      'title: "Com aspas duplas"',
      "excerpt: 'Com aspas simples'",
      'category: Sem aspas',
    ))
    expect(data).toEqual({
      title: 'Com aspas duplas',
      excerpt: 'Com aspas simples',
      category: 'Sem aspas',
    })
    expect(warn).not.toHaveBeenCalled()
  })

  test('dois-pontos dentro do valor', () => {
    const { data } = splitFrontmatter(fm('title: "Branding: o ativo esquecido"'))
    expect(data.title).toBe('Branding: o ativo esquecido')
    expect(warn).not.toHaveBeenCalled()
  })

  test('aspas escapadas dentro do valor', () => {
    const { data } = splitFrontmatter(fm('title: "O que é um \\"bom\\" logótipo"'))
    expect(data.title).toBe('O que é um "bom" logótipo')
  })

  test('linhas vazias e comentários de linha inteira são ignorados', () => {
    const { data } = splitFrontmatter(fm(
      '# um comentário',
      '',
      'title: "Um título"',
      '   ',
      '# outro comentário',
      'date: "July 2026"',
    ))
    expect(data).toEqual({ title: 'Um título', date: 'July 2026' })
    expect(warn).not.toHaveBeenCalled()
  })

  test('espaços à volta da chave e do valor não contam', () => {
    const { data } = splitFrontmatter(fm('title   :    "Um título"   '))
    expect(data.title).toBe('Um título')
    expect(warn).not.toHaveBeenCalled()
  })

  test('CRLF', () => {
    const { data, content } = splitFrontmatter('---\r\ntitle: "Um título"\r\n---\r\n\r\nCorpo.\r\n')
    expect(data.title).toBe('Um título')
    expect(content.trim()).toBe('Corpo.')
    expect(warn).not.toHaveBeenCalled()
  })

  test('BOM antes do delimitador de abertura', () => {
    const { data } = splitFrontmatter('﻿' + fm('title: "Um título"'))
    expect(data.title).toBe('Um título')
  })
})

describe('delimitadores e corpo', () => {
  test('um --- dentro do corpo não fecha o cabeçalho outra vez', () => {
    const { data, content } = splitFrontmatter(
      '---\ntitle: "Um título"\n---\n\nAntes.\n\n---\n\nDepois.\n',
    )
    expect(data.title).toBe('Um título')
    expect(content.trim()).toBe('Antes.\n\n---\n\nDepois.')
  })

  test('frontmatter vazio devolve dados vazios e o corpo inteiro', () => {
    const { data, content } = splitFrontmatter('---\n---\n\nSó corpo.\n')
    expect(data).toEqual({})
    expect(content.trim()).toBe('Só corpo.')
    expect(warn).not.toHaveBeenCalled()
  })

  test('frontmatter ausente devolve o ficheiro todo como corpo', () => {
    const raw = '# Um cabeçalho markdown\n\nUm parágrafo.\n'
    const { data, content } = splitFrontmatter(raw)
    expect(data).toEqual({})
    expect(content).toBe(raw)
  })

  test('um cabeçalho que nunca fecha não é tratado como frontmatter', () => {
    const raw = '---\ntitle: "Um título"\n\nCorpo sem fecho.\n'
    const { data, content } = splitFrontmatter(raw)
    expect(data).toEqual({})
    expect(content).toBe(raw)
  })
})

describe('o que não sabe ler — avisa, nunca fica calado', () => {
  test('comentário no fim de uma linha sem aspas fica no valor, com aviso', () => {
    const { data } = splitFrontmatter(fm('date: July 2026 # rever'), 'teste/pt.md')
    /* O gray-matter (YAML a sério) daria "July 2026". Aqui o valor fica como
       está escrito, mas o autor é avisado. */
    expect(data.date).toBe('July 2026 # rever')
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0][0]).toContain('teste/pt.md')
    expect(warn.mock.calls[0][0]).toContain('date')
  })

  test('um # dentro de um valor entre aspas não gera aviso nenhum', () => {
    const { data } = splitFrontmatter(fm('title: "A cor #FFAA03"'))
    expect(data.title).toBe('A cor #FFAA03')
    expect(warn).not.toHaveBeenCalled()
  })

  test('lista YAML: a chave fica vazia e cada item é avisado', () => {
    const { data } = splitFrontmatter(fm('tags:', '  - branding', '  - design'), 'teste/pt.md')
    expect(data.tags).toBe('')
    expect(warn).toHaveBeenCalledTimes(3)
    expect(warn.mock.calls[0][0]).toContain('tags')
    expect(warn.mock.calls[1][0]).toContain('branding')
  })

  test('valor multi-linha com > é avisado e a continuação não se perde em silêncio', () => {
    const { data } = splitFrontmatter(fm('excerpt: >', '  primeira linha', '  segunda linha'), 'teste/pt.md')
    expect(data.excerpt).toBe('>')
    expect(warn).toHaveBeenCalledTimes(3)
    expect(warn.mock.calls[0][0]).toContain('bloco YAML')
  })

  test('chave indentada é avisada', () => {
    const { data } = splitFrontmatter(fm('title: "Um título"', '  nested: "valor"'), 'teste/pt.md')
    expect(data).toEqual({ title: 'Um título' })
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0][0]).toContain('nested')
  })

  test('linha solta sem dois-pontos é avisada', () => {
    const { data } = splitFrontmatter(fm('title: "Um título"', 'isto não é nada'), 'teste/pt.md')
    expect(data).toEqual({ title: 'Um título' })
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0][0]).toContain('isto não é nada')
  })
})

describe('parsePost', () => {
  test('identifica o ficheiro no aviso', () => {
    parsePost(fm('title: "Um título"', 'mau'), 'um-slug', 'pt')
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0][0]).toContain('um-slug/pt.md')
  })

  test('campos em falta ficam em string vazia e o corpo vira HTML', () => {
    const post = parsePost(fm('title: "Um título"'), 'um-slug', 'en')
    expect(post).toMatchObject({
      slug: 'um-slug', lang: 'en', title: 'Um título',
      excerpt: '', category: '', date: '', readTime: '',
    })
    expect(post.bodyHtml).toContain('<p>Corpo.</p>')
  })

  test('nenhum dos artigos que existem hoje dispara um aviso', () => {
    const dir = path.resolve(__dirname, '../../../content/blog')
    let n = 0
    for (const slug of fs.readdirSync(dir).filter(d => !d.startsWith('_'))) {
      for (const lang of ['pt', 'en'] as const) {
        const file = path.join(dir, slug, `${lang}.md`)
        if (!fs.existsSync(file)) continue
        parsePost(fs.readFileSync(file, 'utf-8'), slug, lang)
        n++
      }
    }
    expect(n).toBe(28)
    expect(warn).not.toHaveBeenCalled()
  })
})
