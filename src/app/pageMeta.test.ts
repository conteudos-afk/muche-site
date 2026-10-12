import { expect, test } from 'vitest'
import { pageMeta } from './pageMeta'
import { COPY } from './i18n'
import { POSTS, postBySlug, postsFor } from '@/lib/blog/posts'
import { buildHead, buildListHead } from '../../scripts/head.mjs'

/* Lê o título e a descrição de um `<head>` gerado pelo `head.mjs`. */
const tituloDe = (head: string) => /<title>(.*)<\/title>/.exec(head)![1]
const descricaoDe = (head: string) => /<meta name="description" content="([^"]*)"/.exec(head)![1]
const desfazerEscape = (s: string) => s.replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&amp;/g, '&')

/* O defeito: o separador voltava a «Muche — Agência Criativa» assim que o
   JavaScript carregava, por cima do título que o HTML pré-renderizado trazia.
   A garantia de que isso não regressa é esta: para cada página, o título que o
   cliente escreve é, letra por letra, o que o `prerender.mjs` pôs no HTML. */
test('o título de cada artigo, nos dois idiomas, é o que o HTML pré-renderizado traz', () => {
  expect(POSTS.length).toBeGreaterThan(0)
  for (const lang of ['pt', 'en'] as const) {
    for (const { slug } of postsFor(lang)) {
      const post = postBySlug(slug, lang)!
      const head = buildHead({
        title: post.title, excerpt: post.excerpt, lang, slug, category: post.category,
        date: post.date, bodyLang: post.bodyLang,
      })
      const meta = pageMeta(`/${lang === 'en' ? 'en/' : ''}blog/${slug}/`, lang)
      expect(meta.title, `${lang}/${slug}`).toBe(desfazerEscape(tituloDe(head)))
      expect(meta.description, `${lang}/${slug}`).toBe(desfazerEscape(descricaoDe(head)))
      /* E nunca o título genérico do site. */
      expect(meta.title).not.toBe(COPY[lang].meta.title)
    }
  }
})

test('as duas listas têm o título e a descrição que o HTML pré-renderizado traz', () => {
  for (const lang of ['pt', 'en'] as const) {
    const head = buildListHead({ lang })
    const meta = pageMeta(lang === 'en' ? '/en/blog/' : '/blog/', lang)
    expect(meta.title).toBe(desfazerEscape(tituloDe(head)))
    expect(meta.description).toBe(desfazerEscape(descricaoDe(head)))
  }
})

test('o endereço sem barra final dá o mesmo que com barra', () => {
  expect(pageMeta('/blog', 'pt')).toEqual(pageMeta('/blog/', 'pt'))
  const slug = postsFor('pt')[0].slug
  expect(pageMeta(`/blog/${slug}`, 'pt')).toEqual(pageMeta(`/blog/${slug}/`, 'pt'))
})

/* A navegação por histórico põe o endereço certo um render antes do estado do
   idioma. No blog manda o endereço, senão o título saía uma vez no idioma
   errado. */
test('no blog o idioma é o do endereço, não o do estado', () => {
  const slug = postsFor('pt')[0].slug
  expect(pageMeta(`/en/blog/${slug}/`, 'pt').title).toBe(pageMeta(`/en/blog/${slug}/`, 'en').title)
  expect(pageMeta(`/blog/${slug}/`, 'en').title).toBe(pageMeta(`/blog/${slug}/`, 'pt').title)
  expect(pageMeta(`/en/blog/${slug}/`, 'pt').title).not.toBe(pageMeta(`/blog/${slug}/`, 'pt').title)
})

/* A troca PT/EN fora do blog é o motivo por que o efeito existia: tem de
   continuar a seguir o idioma. */
test('fora do blog o título é o do site e segue o idioma', () => {
  for (const caminho of ['/', '/team', '/services']) {
    expect(pageMeta(caminho, 'pt')).toEqual(COPY.pt.meta)
    expect(pageMeta(caminho, 'en')).toEqual(COPY.en.meta)
  }
  expect(COPY.pt.meta.title).not.toBe(COPY.en.meta.title)
})

test('um artigo que não existe fica com o título do site', () => {
  expect(pageMeta('/blog/nao-existe-de-todo/', 'pt')).toEqual(COPY.pt.meta)
  expect(pageMeta('/en/blog/nao-existe-de-todo/', 'en')).toEqual(COPY.en.meta)
})

test('um endereço com "%" mal formado não rebenta', () => {
  expect(() => pageMeta('/blog/%E0%A4%A/', 'pt')).not.toThrow()
})
