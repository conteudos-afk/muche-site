import { expect, test } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/* ─── O que o site não faz ───────────────────────────────────────────────────
   A política de privacidade e a de cookies (`content/legal/`) afirmam coisas
   que o código tem de continuar a cumprir: o site não escreve cookies, não
   carrega nada de domínios de fora ao abrir e só guarda no browser o idioma
   escolhido. Estes testes são a ligação entre o texto e o código — se um
   deles falhar, ou se corrige o código ou se corrige a política, mas não se
   deixa a política a dizer uma coisa e o site a fazer outra. ─────────────── */
const RAIZ = path.resolve(__dirname, '../..')
const ler = (...p: string[]) => fs.readFileSync(path.join(RAIZ, ...p), 'utf-8')

function ficheiros(dir: string, ext: RegExp): string[] {
  return fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true }).flatMap(e => {
    const rel = path.join(dir, e.name)
    if (e.isDirectory()) return ficheiros(rel, ext)
    return ext.test(e.name) && !/\.test\./.test(e.name) ? [rel] : []
  })
}

const CODIGO = ficheiros('src', /\.(tsx?|css)$/)

test('os estilos e o index.html não vão buscar nada a outro domínio', () => {
  /* Um `@import url(https://fonts.googleapis.com/…)` era exatamente isto: o
     browser contactava a Google, e dava-lhe o IP, só por abrir o site. */
  const fontes = [...ficheiros('src/styles', /\.css$/), 'index.html']
  expect(fontes.length).toBeGreaterThan(3)
  for (const f of fontes) {
    /* Só o código: os comentários podem falar de endereços. */
    const codigo = ler(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '')
    expect(codigo, f).not.toMatch(/https?:\/\//)
    expect(codigo, f).not.toMatch(/url\(\s*['"]?\/\//)
  }
})

/* ─── O mesmo, para o que é servido tal e qual ───────────────────────────────
   O `public/` não passa pelo build: o que lá está é copiado para o `dist/` sem
   ninguém lhe tocar. O jogo em `public/jogo/` é um ficheiro só, com o HTML, o
   CSS e o JavaScript todos lá dentro, e veio a pedir dois tipos de letra à
   Google. Os testes acima não olham para aqui — olhavam só para o `src/` e
   para o `index.html` da raiz —, por isso aquilo passaria sem um aviso.
   Estes dois fecham essa porta. ──────────────────────────────────────────── */
const PUBLICO = ficheiros('public', /\.(html?|css|m?js)$/)

test('nada em public/ vai buscar seja o que for a outro domínio', () => {
  expect(PUBLICO.length).toBeGreaterThan(0)
  for (const f of PUBLICO) {
    const codigo = ler(f)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/^\s*\/\/.*$/gm, '')
    /* O `www.muche.pt` é o próprio site — canonical e og:url têm de ser
       absolutos. Qualquer outro domínio é um terceiro. */
    const externos = [...codigo.matchAll(/https?:\/\/([^/"'\s)]+)/g)]
      .map(m => m[1])
      .filter(h => h !== 'www.muche.pt')
    expect(externos, f).toEqual([])
    expect(codigo, f).not.toMatch(/url\(\s*['"]?\/\//)
  }
})

test('o jogo só guarda as chaves que a política de cookies declara', () => {
  const jogo = ler('public/jogo/index.html')
  const chaves = [...jogo.matchAll(/store\.(?:get|set)\(\s*'([^']+)'/g)].map(m => m[1])
  expect([...new Set(chaves)].sort()).toEqual(['muche.prog', 'muche.sound'])
  /* E que não há outra porta para o armazenamento além do `store`. */
  expect(jogo.match(/localStorage/g)).toHaveLength(2)
  expect(jogo).not.toMatch(/sessionStorage|indexedDB|document\s*\.\s*cookie/)
  /* Política de cookies: as duas chaves e a página do jogo têm de lá estar. */
  for (const pol of ['content/legal/cookies.pt.md', 'content/legal/cookies.en.md']) {
    for (const k of ['muche.prog', 'muche.sound', '/jogo/']) {
      expect(ler(pol), `${pol} — falta ${k}`).toContain(k)
    }
  }
})

test('o site não escreve cookies', () => {
  expect(CODIGO.length).toBeGreaterThan(10)
  for (const f of CODIGO) expect(ler(f), f).not.toMatch(/document\s*\.\s*cookie/)
})

test('o localStorage só guarda o idioma, e só o i18n lhe toca', () => {
  const quemUsa = CODIGO.filter(f => /localStorage|sessionStorage|indexedDB/.test(ler(f)))
  expect(quemUsa).toEqual([path.join('src', 'app', 'i18n.tsx')])
  const chaves = [...ler('src/app/i18n.tsx').matchAll(/localStorage\.(?:get|set)Item\(\s*([^,)]+)/g)].map(m => m[1])
  expect(chaves.length).toBeGreaterThan(0)
  for (const c of chaves) expect(c).toBe('STORAGE_KEY')
  expect(ler('src/app/i18n.tsx')).toMatch(/const STORAGE_KEY = "muche-lang"/)
})

test('nenhum <script> nem <iframe> de fora: o único iframe é o do Teentac', () => {
  const comIframe = CODIGO.filter(f => /<iframe/.test(ler(f)))
  expect(comIframe).toEqual([path.join('src', 'app', 'TeentacMockup.tsx')])
  for (const f of CODIGO) expect(ler(f), f).not.toMatch(/<script/)
  expect(ler('index.html').match(/<script/g)).toHaveLength(1)
})
