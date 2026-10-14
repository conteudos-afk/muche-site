import { expect, test } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { legalMarkdown } from './content'
import { grafiasAntigas } from '../../../scripts/gerar/grafia.mjs'

/* ─── O texto das políticas ──────────────────────────────────────────────────
   Estes testes não julgam se o texto é bom — isso é com quem o lê. Prendem as
   coisas que tinham de lá estar e as que não podiam estar. */
const todas = () => (['privacy', 'cookies'] as const).flatMap(page => (['pt', 'en'] as const).map(lang => ({ page, lang, md: legalMarkdown(page, lang) })))
const ficheiro = (page: string, lang: string) => fs.readFileSync(path.resolve(__dirname, `../../../content/legal/${page}.${lang}.md`), 'utf-8')

test('os quatro textos existem e não estão vazios', () => {
  for (const { page, lang, md } of todas()) {
    expect(md.length, `${page}/${lang}`).toBeGreaterThan(2500)
    /* É o ficheiro de `content/legal/` que o site importa, não uma cópia. */
    expect(md).toBe(ficheiro(page, lang))
  }
})

test('a política de privacidade cobre o que a lei pede, nos dois idiomas', () => {
  const pt = legalMarkdown('privacy', 'pt')
  const en = legalMarkdown('privacy', 'en')
  /* Responsável, servidor, e-mail, Teentac, direitos, CNPD, decisões
     automatizadas, conservação. */
  for (const trecho of ['Muche, LDA.', 'NIPC 516400479', 'conteudos@muche.pt', 'Cloudflare', 'interesse legítimo', 'Google Workspace',
    'CRM', 'teentac.pt', 'seus próprios cookies', 'RGPD', 'CNPD', 'www.cnpd.pt', 'decisões automatizadas', 'perfis', 'Conservação']) {
    expect(pt, `pt: ${trecho}`).toContain(trecho)
  }
  for (const trecho of ['Muche, LDA.', 'NIPC 516400479', 'conteudos@muche.pt', 'Cloudflare', 'legitimate interest', 'Google Workspace',
    'CRM', 'teentac.pt', 'its own cookies', 'GDPR', 'CNPD', 'www.cnpd.pt', 'automated decisions', 'profile', 'Retention']) {
    expect(en, `en: ${trecho}`).toContain(trecho)
  }
})

test('a política de cookies diz o que há: nenhum cookie, o idioma no localStorage, o Teentac', () => {
  const pt = legalMarkdown('cookies', 'pt')
  const en = legalMarkdown('cookies', 'en')
  for (const t of ['não define cookies', 'muche-lang', 'localStorage', 'consentimento', 'Lei n.º 41/2004', 'teentac.pt', 'Carregar pré-visualização']) {
    expect(pt, `pt: ${t}`).toContain(t)
  }
  for (const t of ['sets no cookies', 'muche-lang', 'localStorage', 'consent', 'Law 41/2004', 'teentac.pt', 'Load live preview']) {
    expect(en, `en: ${t}`).toContain(t)
  }
})

/* O texto do botão do ecrã do portátil e o da política são o mesmo: se um
   mudar, o outro tem de acompanhar. */
test('a política cita o botão com as palavras que o botão tem', async () => {
  const { COPY } = await import('../i18n')
  expect(legalMarkdown('cookies', 'pt')).toContain(`«${COPY.pt.portfolio.teentac.load}»`)
  expect(legalMarkdown('cookies', 'en')).toContain(`"${COPY.en.portfolio.teentac.load}"`)
})

/* Uma política que lista o que o site não tem é uma promessa falsa. O texto
   só pode falar destas coisas para dizer que não as há. */
test('não se promete o que o site não tem', () => {
  const proibido = [
    /google analytics/i, /facebook pixel|meta pixel/i, /performance cookies|cookies de desempenho/i,
    /marketing cookies|cookies de marketing/i, /remarketing/i, /newsletter/i,
  ]
  for (const { page, lang, md } of todas()) {
    for (const re of proibido) expect(md, `${page}/${lang}: ${re}`).not.toMatch(re)
  }
  /* E a negação do que costuma vir nestas políticas está lá, dita pela
     positiva do que de facto acontece. */
  expect(legalMarkdown('privacy', 'pt')).toContain('não vão para uma lista de correio')
  expect(legalMarkdown('privacy', 'en')).toContain('onto a mailing list')
})

test('não há ligação ao Livro de Reclamações: não se aplica', () => {
  for (const { page, lang, md } of todas()) {
    expect(md, `${page}/${lang}`).not.toMatch(/livro de reclama|complaints book|livroreclamacoes/i)
  }
})

/* ─── Registo ─────────────────────────────────────────────────────────────── */

test('o português está no novo Acordo Ortográfico', () => {
  for (const page of ['privacy', 'cookies'] as const) {
    expect(grafiasAntigas(legalMarkdown(page, 'pt')), page).toEqual([])
  }
})

test('o português trata por tu, como o resto do site', () => {
  for (const page of ['privacy', 'cookies'] as const) {
    const md = legalMarkdown(page, 'pt')
    expect(md, page).not.toMatch(/\bvocê\b|\bvossa?s?\b|\bV\. ?Ex/i)
    /* Imperativos de tu, não de você: «escreve», «recarrega», não «escreva». */
    expect(md, page).not.toMatch(/\b(escreva|recarregue|consulte|contacte|carregue|clique)\b/i)
  }
  expect(legalMarkdown('privacy', 'pt')).toMatch(/\bescreve-nos\b/)
})

test('o inglês é britânico', () => {
  const americano = /\b(?:behavior|color|favorite|center|license|organization|recognize|analyze|program(?!me)|defense)\b|\b\w+(?:ize|izes|ized|izing)\b/i
  for (const page of ['privacy', 'cookies'] as const) {
    expect(legalMarkdown(page, 'en'), page).not.toMatch(americano)
  }
  /* E aparece pelo menos uma forma que só o britânico tem. */
  expect(legalMarkdown('cookies', 'en')).toMatch(/recognise/)
})
