# Automação do blog (Parte 2) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gerar artigos de blog em PT e EN com a API da Claude, abrir Pull Request com três artigos por lote, e fazer merge automático ao fim de 48 horas a partir do 11.º artigo.

**Architecture:** Módulos Node puros em `scripts/gerar/` e `scripts/prazo/`, cada um testável sem tocar na rede, orquestrados por dois workflows do GitHub Actions. A geração produz Markdown com o mesmo frontmatter que um humano escreveria, e reutiliza o `parsePost` e o `validatePosts` que já existem em `src/lib/blog/` — não há um segundo formato nem um segundo validador.

**Tech Stack:** Node 26, `@anthropic-ai/sdk`, `yaml`, vitest, GitHub Actions, `gh` CLI.

## Global Constraints

Valores copiados do spec `docs/superpowers/specs/2026-09-28-blog-automacao-design.md`. Aplicam-se a todas as tarefas.

- **Modelo:** `claude-opus-5`. Thinking adaptativo (`thinking: { type: 'adaptive' }`). Streaming sempre — as respostas são longas.
- **Dimensão do artigo:** 1200–1800 palavras no corpo, em cada idioma.
- **Idiomas:** `pt` e `en`, ambos na mesma execução. PT primeiro; EN adaptado a partir do PT.
- **Lote:** 3 artigos por Pull Request.
- **Ritmo:** 2 artigos por semana (Fase B, agendada).
- **Sem imagens** nos artigos. Estrutura: subtítulos, listas, destaques.
- **Sem estatísticas sem fonte.** O gerador não pode introduzir números que não consiga atribuir.
- **Português europeu.** «ecrã» não «tela»; «telemóvel» não «celular». Tratamento por **tu**, incluindo nos títulos.
- **«vídeo de marca»**, nunca «filme de marca» nem «vídeo institucional».
- Termos do ofício em inglês quando é isso que se usa em Portugal: *branding*, *storytelling*, *podcast*, *design*.
- **Categorias:** exatamente as seis de `src/lib/blog/categories.ts`. Não inventar.
- **Instalação de dependências nos workflows:** `npm ci`. O repositório **tem** `package-lock.json` versionado. (Acrescentar uma dependência nova continua a ser `npm install --save-dev`.)
- **Comentários e mensagens em português europeu**, como o resto do repositório.
- **Merge automático só com build verde**, garantido pelo próprio workflow: o `main` não tem status checks obrigatórios.

## Estrutura de ficheiros

| Ficheiro | Responsabilidade |
|---|---|
| `content/blog/_temas.yml` | Lista de temas. Editada por humanos |
| `scripts/gerar/temas.mjs` | Ler, validar e escolher temas; marcar como usados |
| `scripts/gerar/palavras.mjs` | Contar palavras do corpo Markdown |
| `scripts/gerar/referencias.mjs` | Escolher os 3 artigos que servem de norma de voz |
| `scripts/gerar/prompt.mjs` | Montar o texto enviado ao modelo. Função pura |
| `scripts/gerar/cliente.mjs` | Chamada à API. O único ficheiro que toca na rede |
| `scripts/gerar/escrever.mjs` | Validar a resposta e escrever os `.md` |
| `scripts/gerar/index.mjs` | CLI que junta tudo |
| `scripts/prazo/contador.mjs` | Quantos artigos a automação já publicou |
| `scripts/prazo/decidir.mjs` | O que fazer a um PR: nada, avisar ou juntar. Função pura |
| `scripts/prazo/index.mjs` | CLI que aplica a decisão via `gh` |
| `.github/workflows/gerar-artigos.yml` | Agendado 2×/semana + disparo manual |
| `.github/workflows/prazo-artigos.yml` | De hora a hora; avisa às 24h, junta às 48h |

Os testes ficam ao lado, como `*.test.mjs`. O `vitest.config.ts` deste repositório
**restringe** o que apanha (`include: ['src/**/*.test.ts']`), por isso a Task 1
alarga-o para `['src/**/*.test.ts', 'scripts/**/*.test.mjs']`. Sem isso o vitest
diz «No test files found» em vez de falhar — um teste que não corre parece um
teste que passa.

---

### Task 1: Lista de temas

**Files:**
- Create: `content/blog/_temas.yml`
- Create: `scripts/gerar/temas.mjs`
- Test: `scripts/gerar/temas.test.mjs`
- Modify: `package.json` (adicionar `yaml` às devDependencies)

**Interfaces:**
- Produces: `lerTemas(caminho) -> Tema[]`, `proximosTemas(temas, quantos) -> Tema[]`, `marcarUsados(caminho, slugs) -> void`, `validarTemas(temas) -> string[]`
- `Tema = { slug, tema, angulo, categoria, prioridade, estado }`, `estado ∈ 'por-escrever' | 'publicado'`

- [ ] **Step 1: Instalar o `yaml`**

```bash
npm install --save-dev yaml
```

- [ ] **Step 2: Escrever o teste, que falha**

Cria `scripts/gerar/temas.test.mjs`:

```js
import { expect, test } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { lerTemas, proximosTemas, marcarUsados, validarTemas } from './temas.mjs'

const YAML_EXEMPLO = `temas:
  - slug: quanto-custa-video-marca
    tema: "Quanto custa um vídeo de marca"
    angulo: "O que faz o preço variar, e porque é que o orçamento mais baixo sai caro"
    categoria: "Video Production"
    prioridade: 1
    estado: por-escrever
  - slug: manual-de-marca-o-que-leva
    tema: "O que leva um manual de marca"
    angulo: "Secção a secção, o que é mesmo preciso e o que é enchimento"
    categoria: "Branding & Visual Identity"
    prioridade: 2
    estado: por-escrever
  - slug: ja-escrito
    tema: "Um tema já usado"
    angulo: "Não deve voltar a sair"
    categoria: "Graphic Design"
    prioridade: 1
    estado: publicado
`

function ficheiroTemporario(conteudo) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'temas-'))
  const ficheiro = path.join(dir, '_temas.yml')
  fs.writeFileSync(ficheiro, conteudo, 'utf-8')
  return ficheiro
}

test('lê os temas do ficheiro', () => {
  const temas = lerTemas(ficheiroTemporario(YAML_EXEMPLO))
  expect(temas).toHaveLength(3)
  expect(temas[0].slug).toBe('quanto-custa-video-marca')
  expect(temas[0].prioridade).toBe(1)
})

test('escolhe por prioridade e ignora os já publicados', () => {
  const temas = lerTemas(ficheiroTemporario(YAML_EXEMPLO))
  const escolhidos = proximosTemas(temas, 3)
  expect(escolhidos.map(t => t.slug)).toEqual([
    'quanto-custa-video-marca',
    'manual-de-marca-o-que-leva',
  ])
})

test('devolve menos do que o pedido quando a lista está a acabar', () => {
  const temas = lerTemas(ficheiroTemporario(YAML_EXEMPLO))
  expect(proximosTemas(temas, 10)).toHaveLength(2)
})

test('marcar como usado sobrevive à releitura', () => {
  const ficheiro = ficheiroTemporario(YAML_EXEMPLO)
  marcarUsados(ficheiro, ['quanto-custa-video-marca'])
  const temas = lerTemas(ficheiro)
  expect(temas.find(t => t.slug === 'quanto-custa-video-marca').estado).toBe('publicado')
  expect(proximosTemas(temas, 3).map(t => t.slug)).toEqual(['manual-de-marca-o-que-leva'])
})

test('marcar como usado preserva os comentários do ficheiro', () => {
  const ficheiro = ficheiroTemporario('# Um comentário que tem de sobreviver\n' + YAML_EXEMPLO)
  marcarUsados(ficheiro, ['quanto-custa-video-marca'])
  expect(fs.readFileSync(ficheiro, 'utf-8')).toContain('# Um comentário que tem de sobreviver')
})

test('acusa uma categoria inválida', () => {
  const temas = [{ slug: 'a', tema: 'A', angulo: 'B', categoria: 'Inventada', prioridade: 1, estado: 'por-escrever' }]
  expect(validarTemas(temas).join(' ')).toContain('Inventada')
})

test('acusa um slug repetido', () => {
  const t = { tema: 'A', angulo: 'B', categoria: 'Graphic Design', prioridade: 1, estado: 'por-escrever' }
  const problemas = validarTemas([{ ...t, slug: 'igual' }, { ...t, slug: 'igual' }])
  expect(problemas.join(' ')).toContain('igual')
})

test('acusa um campo em falta', () => {
  const problemas = validarTemas([{ slug: 'a', tema: '', angulo: 'B', categoria: 'Graphic Design', prioridade: 1, estado: 'por-escrever' }])
  expect(problemas.join(' ')).toContain('tema')
})

test('a lista real do repositório é válida', () => {
  const temas = lerTemas(new URL('../../content/blog/_temas.yml', import.meta.url).pathname)
  expect(validarTemas(temas)).toEqual([])
  expect(temas.length).toBeGreaterThanOrEqual(40)
})
```

- [ ] **Step 3: Correr o teste para o ver falhar**

Run: `npx vitest run scripts/gerar/temas.test.mjs`
Expected: FAIL — `Cannot find module './temas.mjs'`

- [ ] **Step 4: Escrever o `temas.mjs`**

```js
/* ─── A lista de temas ───────────────────────────────────────────────────────
   O gerador não inventa assuntos: tira-os daqui, por ordem de prioridade. É o
   único ficheiro do circuito que é escrito à mão, e por isso o `marcarUsados`
   edita o documento em vez de o reescrever — os comentários que a equipa lá
   puser têm de sobreviver a cada execução. ───────────────────────────────── */
import fs from 'node:fs'
import { parseDocument } from 'yaml'
import { BLOG_CATEGORIES } from '../../src/lib/blog/categories.ts'

const CAMPOS = ['slug', 'tema', 'angulo', 'categoria']
const ESTADOS = ['por-escrever', 'publicado']

export function lerTemas(caminho) {
  const doc = parseDocument(fs.readFileSync(caminho, 'utf-8'))
  const temas = doc.toJS()?.temas
  if (!Array.isArray(temas)) {
    throw new Error(`${caminho}: esperava uma chave "temas" com uma lista`)
  }
  return temas
}

export function validarTemas(temas) {
  const problemas = []
  const vistos = new Set()

  for (const [i, tema] of temas.entries()) {
    const onde = `tema ${i + 1} (${tema.slug || 'sem slug'})`

    for (const campo of CAMPOS) {
      if (!String(tema[campo] ?? '').trim()) problemas.push(`${onde}: falta o campo "${campo}"`)
    }
    if (!/^[a-z0-9-]+$/.test(String(tema.slug ?? ''))) {
      problemas.push(`${onde}: o slug só pode ter minúsculas, números e hífenes`)
    }
    if (vistos.has(tema.slug)) problemas.push(`${onde}: o slug "${tema.slug}" está repetido`)
    vistos.add(tema.slug)

    if (tema.categoria && !BLOG_CATEGORIES.includes(tema.categoria)) {
      problemas.push(`${onde}: a categoria "${tema.categoria}" não existe — usa uma de: ${BLOG_CATEGORIES.join(', ')}`)
    }
    if (!Number.isInteger(tema.prioridade)) {
      problemas.push(`${onde}: a prioridade tem de ser um número inteiro`)
    }
    if (!ESTADOS.includes(tema.estado)) {
      problemas.push(`${onde}: o estado tem de ser ${ESTADOS.join(' ou ')}`)
    }
  }
  return problemas
}

/* Por prioridade, e dentro da mesma prioridade pela ordem do ficheiro: quem
   escreveu a lista pô-los por uma razão. */
export function proximosTemas(temas, quantos) {
  return temas
    .map((tema, ordem) => ({ tema, ordem }))
    .filter(({ tema }) => tema.estado === 'por-escrever')
    .sort((a, b) => a.tema.prioridade - b.tema.prioridade || a.ordem - b.ordem)
    .slice(0, quantos)
    .map(({ tema }) => tema)
}

/* Edita o documento em vez de o reescrever, para não perder comentários. */
export function marcarUsados(caminho, slugs) {
  const doc = parseDocument(fs.readFileSync(caminho, 'utf-8'))
  const lista = doc.get('temas')
  if (!lista) throw new Error(`${caminho}: não tem a chave "temas"`)

  for (const item of lista.items) {
    if (slugs.includes(item.get('slug'))) item.set('estado', 'publicado')
  }
  fs.writeFileSync(caminho, String(doc), 'utf-8')
}
```

- [ ] **Step 5: Escrever a lista de temas**

Cria `content/blog/_temas.yml`. São **45 entradas**, distribuídas pelas seis categorias:

| Categoria | Entradas |
|---|---|
| Branding & Visual Identity | 10 |
| Video Production | 10 |
| Web Design | 8 |
| Graphic Design | 7 |
| Photography & Events | 5 |
| Podcasts | 5 |

Cada entrada é uma **pergunta que alguém escreve mesmo num motor de pesquisa** antes de contratar uma agência — não um título de artigo. `prioridade: 1` para as perguntas de intenção comercial directa (preço, prazo, o que está incluído), `2` para as de decisão (como escolher, o que correr mal), `3` para as de curiosidade.

Começa assim, e completa com o mesmo critério:

```yaml
# Temas do blog, por ordem de prioridade.
#
# O gerador lê daqui e nunca inventa assuntos. Quando esta lista esgotar, a
# automação abre um issue a avisar em vez de continuar.
#
# prioridade: 1 = intenção de compra (preço, prazo, o que inclui)
#             2 = decisão (como escolher, o que corre mal)
#             3 = curiosidade
#
# estado: por-escrever | publicado — o gerador muda para "publicado" sozinho.
# categorias válidas: Branding & Visual Identity, Graphic Design,
# Video Production, Web Design, Photography & Events, Podcasts

temas:
  - slug: quanto-custa-video-de-marca
    tema: "Quanto custa um vídeo de marca"
    angulo: "O que faz o preço variar — equipa, dias de rodagem, pós-produção — e porque é que o orçamento mais baixo costuma sair caro"
    categoria: "Video Production"
    prioridade: 1
    estado: por-escrever

  - slug: o-que-leva-um-manual-de-marca
    tema: "O que leva um manual de marca"
    angulo: "Secção a secção: o que é mesmo preciso para a marca ser usável por terceiros, e o que é enchimento de apresentação"
    categoria: "Branding & Visual Identity"
    prioridade: 1
    estado: por-escrever

  - slug: quanto-tempo-demora-um-rebranding
    tema: "Quanto tempo demora um rebranding"
    angulo: "As fases reais e onde o calendário costuma escorregar — quase sempre nas decisões do lado do cliente, não no design"
    categoria: "Branding & Visual Identity"
    prioridade: 1
    estado: por-escrever

  - slug: quanto-custa-um-site
    tema: "Quanto custa fazer um site"
    angulo: "Porque é que o mesmo briefing recebe orçamentos que diferem cinco vezes, e o que está a mais ou a menos em cada um"
    categoria: "Web Design"
    prioridade: 1
    estado: por-escrever

  - slug: o-que-e-preciso-antes-de-uma-rodagem
    tema: "O que é preciso ter pronto antes de uma rodagem"
    angulo: "A lista que o cliente tem de fechar — guião, locais, autorizações, pessoas — e o que acontece a cada dia de rodagem quando falta"
    categoria: "Video Production"
    prioridade: 1
    estado: por-escrever

  - slug: como-escolher-agencia-criativa
    tema: "Como escolher uma agência criativa"
    angulo: "O que perguntar numa primeira reunião, e os sinais de que a proposta é boa a vender e fraca a executar"
    categoria: "Branding & Visual Identity"
    prioridade: 2
    estado: por-escrever

  - slug: quanto-custa-um-podcast-de-marca
    tema: "Quanto custa produzir um podcast de marca"
    angulo: "Estúdio, edição, publicação e o custo que quase ninguém orçamenta: manter o ritmo depois do primeiro mês"
    categoria: "Podcasts"
    prioridade: 1
    estado: por-escrever

  - slug: fotografia-de-produto-quantas-imagens
    tema: "Quantas fotografias de produto são precisas para uma loja online"
    angulo: "Por referência, por variante e por contexto de uso — e como isso muda o orçamento de uma sessão"
    categoria: "Photography & Events"
    prioridade: 1
    estado: por-escrever

  - slug: o-que-entregar-a-um-designer
    tema: "O que tens de entregar a um designer para o trabalho arrancar"
    angulo: "Ficheiros, textos, acessos e decisões — e porque é que o briefing incompleto é o que mais atrasa projetos"
    categoria: "Graphic Design"
    prioridade: 2
    estado: por-escrever

  - slug: video-para-redes-vs-institucional
    tema: "Vídeo para redes sociais ou vídeo de marca: qual é que precisas"
    angulo: "Servem objetivos diferentes e têm custos por peça muito diferentes. Como decidir sem fazer os dois mal"
    categoria: "Video Production"
    prioridade: 2
    estado: por-escrever

  - slug: quanto-tempo-dura-um-site
    tema: "Quanto tempo dura um site antes de precisar de ser refeito"
    angulo: "O que envelhece primeiro — tecnologia, conteúdo ou posicionamento — e como adiar o refazer sem o negar"
    categoria: "Web Design"
    prioridade: 2
    estado: por-escrever

  - slug: fotografo-de-evento-o-que-pedir
    tema: "O que pedir a um fotógrafo de evento antes do dia"
    angulo: "Alinhar expectativas sobre momentos obrigatórios, prazos de entrega e direitos de uso, antes e não depois"
    categoria: "Photography & Events"
    prioridade: 2
    estado: por-escrever
```

- [ ] **Step 6: Correr os testes**

Run: `npx vitest run scripts/gerar/temas.test.mjs`
Expected: PASS, 9 testes. O último confirma que a lista real tem 40+ entradas válidas.

- [ ] **Step 7: Commit**

```bash
git add content/blog/_temas.yml scripts/gerar/temas.mjs scripts/gerar/temas.test.mjs package.json
git commit -m "feat: lista de temas do blog e o módulo que a lê"
```

---

### Task 2: Contagem de palavras e escolha das referências de voz

**Files:**
- Create: `scripts/gerar/palavras.mjs`
- Create: `scripts/gerar/referencias.mjs`
- Test: `scripts/gerar/palavras.test.mjs`
- Test: `scripts/gerar/referencias.test.mjs`

**Interfaces:**
- Consumes: `loadPosts(contentDir)` de `src/lib/blog/loadPosts.ts` (devolve `Post[]` com `bodyHtml`, não Markdown)
- Produces: `contarPalavras(markdown) -> number`, `dentroDoIntervalo(n) -> boolean`, `MIN_PALAVRAS = 1200`, `MAX_PALAVRAS = 1800`, `escolherReferencias(artigos, categoria, quantas) -> Artigo[]`, `lerArtigosMarkdown(contentDir, lang) -> Artigo[]` com `Artigo = { slug, lang, categoria, frontmatter, corpo, palavras }`

- [ ] **Step 1: Escrever os testes da contagem**

Cria `scripts/gerar/palavras.test.mjs`:

```js
import { expect, test } from 'vitest'
import { contarPalavras, dentroDoIntervalo, MIN_PALAVRAS, MAX_PALAVRAS } from './palavras.mjs'

test('conta palavras de um parágrafo', () => {
  expect(contarPalavras('Uma frase com cinco palavras.')).toBe(5)
})

test('não conta os marcadores de Markdown', () => {
  expect(contarPalavras('## Um subtítulo\n\n- item um\n- item dois')).toBe(6)
})

test('não conta o frontmatter', () => {
  expect(contarPalavras('---\ntitle: "Isto não conta"\n---\n\nIsto conta.')).toBe(2)
})

test('não conta URLs de ligações, só o texto', () => {
  expect(contarPalavras('Vê [a nossa página](https://www.muche.pt/servicos/) agora.')).toBe(5)
})

test('trata palavras com hífen como uma só', () => {
  expect(contarPalavras('pré-produção é uma palavra')).toBe(4)
})

test('o intervalo é o do spec', () => {
  expect([MIN_PALAVRAS, MAX_PALAVRAS]).toEqual([1200, 1800])
  expect(dentroDoIntervalo(1199)).toBe(false)
  expect(dentroDoIntervalo(1200)).toBe(true)
  expect(dentroDoIntervalo(1800)).toBe(true)
  expect(dentroDoIntervalo(1801)).toBe(false)
})
```

- [ ] **Step 2: Correr para ver falhar**

Run: `npx vitest run scripts/gerar/palavras.test.mjs`
Expected: FAIL — `Cannot find module './palavras.mjs'`

- [ ] **Step 3: Escrever o `palavras.mjs`**

```js
/* ─── Contagem de palavras ───────────────────────────────────────────────────
   O spec fixa o artigo entre 1200 e 1800 palavras, e essa é a única medida
   objectiva que temos sobre o que sai do modelo. Conta-se o que um leitor lê:
   sem frontmatter, sem marcadores de Markdown, sem os endereços das ligações.
   Um `##` a mais não é uma palavra. ──────────────────────────────────────── */

export const MIN_PALAVRAS = 1200
export const MAX_PALAVRAS = 1800

export function contarPalavras(markdown) {
  const texto = String(markdown)
    /* Frontmatter */
    .replace(/^﻿?---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/, '')
    /* Blocos e trechos de código */
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    /* Ligações e imagens: fica o texto, sai o endereço */
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    /* Marcadores de título, citação, lista e ênfase */
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, '')
    .replace(/^[ \t]*>[ \t]?/gm, '')
    .replace(/^[ \t]*(?:[-*+]|\d+\.)[ \t]+/gm, '')
    .replace(/[*_~]/g, '')

  return texto.split(/\s+/).filter(p => /[\p{L}\p{N}]/u.test(p)).length
}

export function dentroDoIntervalo(palavras) {
  return palavras >= MIN_PALAVRAS && palavras <= MAX_PALAVRAS
}
```

- [ ] **Step 4: Correr os testes da contagem**

Run: `npx vitest run scripts/gerar/palavras.test.mjs`
Expected: PASS, 6 testes

- [ ] **Step 5: Escrever os testes das referências**

Cria `scripts/gerar/referencias.test.mjs`:

```js
import { expect, test } from 'vitest'
import { escolherReferencias, lerArtigosMarkdown } from './referencias.mjs'

const artigo = (slug, categoria, palavras) => ({
  slug, lang: 'pt', categoria, frontmatter: {}, corpo: 'palavra '.repeat(palavras), palavras,
})

test('prefere os mais longos, que são os já expandidos', () => {
  const escolhidos = escolherReferencias([
    artigo('curto', 'Podcasts', 300),
    artigo('longo', 'Podcasts', 1500),
    artigo('medio', 'Podcasts', 800),
  ], 'Podcasts', 2)
  expect(escolhidos.map(a => a.slug)).toEqual(['longo', 'medio'])
})

test('põe a mesma categoria à frente, com o mesmo comprimento', () => {
  const escolhidos = escolherReferencias([
    artigo('outra', 'Podcasts', 1500),
    artigo('mesma', 'Web Design', 1500),
  ], 'Web Design', 1)
  expect(escolhidos[0].slug).toBe('mesma')
})

test('mas um artigo longo de outra categoria vale mais do que um curto da mesma', () => {
  const escolhidos = escolherReferencias([
    artigo('longo-outra', 'Podcasts', 1500),
    artigo('curto-mesma', 'Web Design', 300),
  ], 'Web Design', 1)
  expect(escolhidos[0].slug).toBe('longo-outra')
})

test('nunca devolve o próprio artigo', () => {
  const escolhidos = escolherReferencias([
    artigo('eu-proprio', 'Podcasts', 1500),
    artigo('outro', 'Podcasts', 1400),
  ], 'Podcasts', 2, 'eu-proprio')
  expect(escolhidos.map(a => a.slug)).toEqual(['outro'])
})

test('lê os artigos reais do repositório com corpo em Markdown', () => {
  const artigos = lerArtigosMarkdown(new URL('../../content/blog', import.meta.url).pathname, 'pt')
  expect(artigos.length).toBeGreaterThanOrEqual(14)
  expect(artigos[0].corpo).not.toContain('<p>')
  expect(artigos[0].palavras).toBeGreaterThan(100)
})
```

- [ ] **Step 6: Correr para ver falhar**

Run: `npx vitest run scripts/gerar/referencias.test.mjs`
Expected: FAIL — `Cannot find module './referencias.mjs'`

- [ ] **Step 7: Escrever o `referencias.mjs`**

Nota: o `loadPosts` devolve `bodyHtml` já convertido pelo `marked`, e o que o prompt precisa é do Markdown original. Por isso lê-se aqui em cru, com o `splitFrontmatter` que já existe.

```js
/* ─── Os artigos que servem de norma ─────────────────────────────────────────
   A voz não se mantém por descrição — mantém-se por exemplo. O gerador recebe
   três artigos já aprovados e escreve como eles. Este método já foi validado:
   as traduções dos 14 artigos foram feitas com o primeiro artigo aprovado como
   norma, e passaram sem correções de tom.

   O critério de escolha é o comprimento, porque um artigo longo é um artigo já
   expandido — já passou por revisão humana na Fase A. A categoria desempata
   entre artigos de comprimento parecido, mas não manda: um artigo de 1500
   palavras de outra categoria ensina mais sobre a voz do que um de 300 da
   mesma. ────────────────────────────────────────────────────────────────── */
import fs from 'node:fs'
import path from 'node:path'
import { splitFrontmatter } from '../../src/lib/blog/parsePost.ts'
import { contarPalavras } from './palavras.mjs'

export function lerArtigosMarkdown(contentDir, lang) {
  const artigos = []
  const slugs = fs.readdirSync(contentDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('_'))
    .map(e => e.name)

  for (const slug of slugs) {
    const ficheiro = path.join(contentDir, slug, `${lang}.md`)
    if (!fs.existsSync(ficheiro)) continue

    const cru = fs.readFileSync(ficheiro, 'utf-8')
    const { data, content } = splitFrontmatter(cru, `${slug}/${lang}.md`)
    const corpo = content.trim()
    artigos.push({ slug, lang, categoria: data.category ?? '', frontmatter: data, corpo, palavras: contarPalavras(corpo) })
  }
  return artigos
}

/* O peso da categoria — 200 palavras — é deliberadamente pequeno: desempata
   entre artigos parecidos sem deixar um artigo curto passar à frente de um
   longo. */
const BONUS_MESMA_CATEGORIA = 200

export function escolherReferencias(artigos, categoria, quantas, excluirSlug) {
  return artigos
    .filter(a => a.slug !== excluirSlug)
    .map(a => ({ a, peso: a.palavras + (a.categoria === categoria ? BONUS_MESMA_CATEGORIA : 0) }))
    .sort((x, y) => y.peso - x.peso || x.a.slug.localeCompare(y.a.slug))
    .slice(0, quantas)
    .map(({ a }) => a)
}
```

- [ ] **Step 8: Confirmar que isto corre fora do vitest**

Estes módulos importam `.ts` a partir de `.mjs`. O vitest transforma-os e não se
queixa; o `node` puro só o faz a partir da versão 24, e é em `node` puro que
isto vai correr no GitHub Actions. Se este passo falhar, todo o resto passa nos
testes e rebenta em produção.

```bash
node -e "import('./scripts/gerar/referencias.mjs').then(m => console.log('ok:', m.lerArtigosMarkdown('content/blog', 'pt').length, 'artigos'))"
```

Expected: `ok: 14 artigos`. Se disser `Unknown file extension ".ts"`, o Node é
demasiado antigo — confirma com `node -v` que é 24 ou superior.

- [ ] **Step 9: Correr todos os testes**

Run: `npx vitest run`
Expected: PASS — 60 anteriores + 11 novos

- [ ] **Step 10: Commit**

```bash
git add scripts/gerar/palavras.mjs scripts/gerar/palavras.test.mjs scripts/gerar/referencias.mjs scripts/gerar/referencias.test.mjs
git commit -m "feat: contagem de palavras e escolha dos artigos de referência"
```

---

### Task 3: Montagem do prompt

**Files:**
- Create: `scripts/gerar/prompt.mjs`
- Test: `scripts/gerar/prompt.test.mjs`

**Interfaces:**
- Consumes: `Artigo` de `referencias.mjs`, `Tema` de `temas.mjs`, `MIN_PALAVRAS`/`MAX_PALAVRAS` de `palavras.mjs`
- Produces: `SISTEMA` (string), `promptEscrever({ tema, referencias }) -> string`, `promptExpandir({ artigo, referencias }) -> string`, `promptIngles({ artigoPt, referenciaEn }) -> string`

- [ ] **Step 1: Escrever o teste, que falha**

Cria `scripts/gerar/prompt.test.mjs`:

```js
import { expect, test } from 'vitest'
import { SISTEMA, promptEscrever, promptExpandir, promptIngles } from './prompt.mjs'

const REF = {
  slug: 'referencia', lang: 'pt', categoria: 'Podcasts',
  frontmatter: { title: 'Título de referência', excerpt: 'Excerto.', category: 'Podcasts', date: 'July 2026', readTime: '5 min de leitura' },
  corpo: 'O corpo do artigo de referência.', palavras: 6,
}

const TEMA = {
  slug: 'quanto-custa', tema: 'Quanto custa um vídeo de marca',
  angulo: 'O que faz o preço variar', categoria: 'Video Production',
  prioridade: 1, estado: 'por-escrever',
}

test('o sistema fixa as regras de voz do spec', () => {
  expect(SISTEMA).toContain('vídeo de marca')
  expect(SISTEMA).toContain('português europeu')
  expect(SISTEMA).toContain('tu')
  expect(SISTEMA).toContain('ecrã')
})

test('o sistema proíbe estatísticas sem fonte e imagens', () => {
  expect(SISTEMA.toLowerCase()).toContain('estatística')
  expect(SISTEMA.toLowerCase()).toContain('imagens')
})

test('o prompt de escrita leva o tema, o ângulo e a categoria', () => {
  const p = promptEscrever({ tema: TEMA, referencias: [REF] })
  expect(p).toContain('Quanto custa um vídeo de marca')
  expect(p).toContain('O que faz o preço variar')
  expect(p).toContain('Video Production')
  expect(p).toContain('quanto-custa')
})

test('o prompt de escrita leva as referências com corpo', () => {
  const p = promptEscrever({ tema: TEMA, referencias: [REF] })
  expect(p).toContain('O corpo do artigo de referência.')
})

test('o prompt de escrita pede o intervalo de palavras', () => {
  const p = promptEscrever({ tema: TEMA, referencias: [REF] })
  expect(p).toContain('1200')
  expect(p).toContain('1800')
})

test('o prompt de expansão leva o artigo original inteiro', () => {
  const original = { ...REF, slug: 'original', corpo: 'Texto curto a expandir.' }
  const p = promptExpandir({ artigo: original, referencias: [REF] })
  expect(p).toContain('Texto curto a expandir.')
  expect(p).toContain('Título de referência')
})

test('o prompt de expansão manda manter o slug e a categoria', () => {
  const original = { ...REF, slug: 'original' }
  const p = promptExpandir({ artigo: original, referencias: [REF] })
  expect(p).toContain('original')
  expect(p.toLowerCase()).toContain('mantém')
})

test('o prompt inglês leva o artigo português e uma referência inglesa', () => {
  const refEn = { ...REF, lang: 'en', corpo: 'An approved English article.' }
  const p = promptIngles({ artigoPt: 'Artigo em português.', referenciaEn: refEn })
  expect(p).toContain('Artigo em português.')
  expect(p).toContain('An approved English article.')
})
```

- [ ] **Step 2: Correr para ver falhar**

Run: `npx vitest run scripts/gerar/prompt.test.mjs`
Expected: FAIL — `Cannot find module './prompt.mjs'`

- [ ] **Step 3: Escrever o `prompt.mjs`**

```js
/* ─── O prompt ───────────────────────────────────────────────────────────────
   Função pura: recebe temas e artigos, devolve texto. Não toca na rede nem no
   disco, para poder ser lida e testada sem gastar um cêntimo.

   A divisão é deliberada: o `SISTEMA` são as regras que nunca mudam entre
   execuções — a voz, o formato, as proibições — e é por isso o candidato
   natural a prompt caching no dia em que a entrada pesar. Hoje não pesa: são
   $0,05 dos $0,30 por artigo, e o spec rejeitou a complexidade. ──────────── */
import { MIN_PALAVRAS, MAX_PALAVRAS } from './palavras.mjs'

export const SISTEMA = `És o redator do blog da Muche, uma agência criativa portuguesa que faz branding, design, vídeo, web, fotografia e podcasts.

Escreves artigos para o blog da agência. O objetivo é serem encontrados em pesquisa e citados por motores de resposta — por isso respondem a perguntas reais, com utilidade a sério, e não com generalidades.

## Voz

- Tratamento por **tu**, incluindo nos títulos.
- **Português europeu.** «ecrã», nunca «tela». «telemóvel», nunca «celular». «a gravar», nunca «gravando».
- Termos do ofício em inglês quando é isso que se usa em Portugal: branding, storytelling, podcast, design, copy.
- **«vídeo de marca»** — nunca «filme de marca», nunca «vídeo institucional».
- Frases directas. Sem superlativos de brochura, sem «no mundo de hoje», sem «na era digital».
- Afirma o que sabes e assume o que não sabes. Não vendes: explicas.

## Proibições

- **Sem estatísticas, percentagens ou números de estudos.** Se não os podes atribuir a uma fonte concreta, não os escreves. Vale mais uma afirmação qualitativa honesta do que um número inventado.
- **Sem imagens.** A legibilidade resolve-se com estrutura: subtítulos, listas, parágrafos curtos.
- Sem promessas de resultados. Sem chamadas à ação agressivas no fim.

## Formato da resposta

Devolves **um ficheiro Markdown completo e mais nada** — sem preâmbulo, sem explicação, sem blocos de código à volta.

O ficheiro começa por frontmatter entre \`---\`, com exactamente estas cinco chaves, cada uma numa linha, com o valor entre aspas duplas:

\`\`\`
---
title: "…"
excerpt: "…"
category: "…"
date: "…"
readTime: "…"
---
\`\`\`

Regras do frontmatter, sem excepção:

- Nenhum valor pode ter aspas duplas por dentro. Usa aspas angulares «» se precisares de citar.
- Nenhum valor ocupa mais do que uma linha.
- \`category\` é copiada à letra da que te for indicada.
- \`excerpt\` tem uma ou duas frases.

A seguir ao frontmatter vem o corpo, em Markdown: parágrafos, \`##\` para subtítulos, listas com \`-\`. Sem \`#\` de nível 1 — o título já está no frontmatter.`

function blocoReferencias(referencias) {
  return referencias.map((ref, i) => `
### Referência ${i + 1} — ${ref.slug}

\`\`\`
---
title: "${ref.frontmatter.title ?? ''}"
excerpt: "${ref.frontmatter.excerpt ?? ''}"
category: "${ref.frontmatter.category ?? ''}"
date: "${ref.frontmatter.date ?? ''}"
readTime: "${ref.frontmatter.readTime ?? ''}"
---

${ref.corpo}
\`\`\``).join('\n')
}

const DIMENSAO = `O corpo tem de ter entre ${MIN_PALAVRAS} e ${MAX_PALAVRAS} palavras. Não é uma sugestão: um artigo de 900 palavras não serve, e um de 2500 também não.`

export function promptEscrever({ tema, referencias }) {
  return `Escreve um artigo novo para o blog.

**Tema:** ${tema.tema}
**Ângulo:** ${tema.angulo}
**Categoria:** ${tema.categoria}
**Slug (vai ser o endereço):** ${tema.slug}

${DIMENSAO}

No frontmatter:
- \`category\` é exactamente \`${tema.categoria}\`.
- \`date\` é o mês e ano actuais em inglês, no formato \`"September 2026"\`.
- \`readTime\` é \`"N min de leitura"\`, com N = palavras a dividir por 200, arredondado.

Abaixo estão artigos já aprovados deste blog. **Escreve como eles.** Repara no comprimento das frases, em como abrem, em como usam subtítulos e em como acabam sem vender.

${blocoReferencias(referencias)}

Responde só com o ficheiro Markdown.`
}

export function promptExpandir({ artigo, referencias }) {
  return `Este artigo já está publicado, mas é curto de mais para responder bem a quem procura o assunto. Desenvolve-o.

**O que manter:** o slug \`${artigo.slug}\`, a categoria \`${artigo.frontmatter.category ?? ''}\`, a tese e a posição do artigo. Mantém a data. O leitor que já o leu tem de reconhecer o mesmo texto, mais desenvolvido.

**O que mudar:** desenvolve cada ponto que hoje está resumido num parágrafo. Acrescenta subtítulos onde ajudam a percorrer. Dá exemplos concretos do ofício. Podes reescrever o \`title\`, o \`excerpt\` e o \`readTime\` se o artigo mudar de dimensão.

${DIMENSAO}

## Artigo a expandir

\`\`\`
---
title: "${artigo.frontmatter.title ?? ''}"
excerpt: "${artigo.frontmatter.excerpt ?? ''}"
category: "${artigo.frontmatter.category ?? ''}"
date: "${artigo.frontmatter.date ?? ''}"
readTime: "${artigo.frontmatter.readTime ?? ''}"
---

${artigo.corpo}
\`\`\`

## Artigos de referência para a voz

${blocoReferencias(referencias)}

Responde só com o ficheiro Markdown.`
}

export function promptIngles({ artigoPt, referenciaEn }) {
  return `Adapta este artigo para inglês.

Não é uma tradução literal: é o mesmo artigo escrito em inglês, com o mesmo argumento, a mesma estrutura e a mesma dimensão. Onde a expressão portuguesa não tiver equivalente, escreve o que ela quer dizer.

- Inglês britânico: \`colour\`, \`organisation\`, \`programme\`.
- Tratamento directo por \`you\`.
- \`category\` e \`date\` ficam **exactamente iguais** às do artigo português — são chaves partilhadas pelas duas versões.
- \`readTime\` fica em inglês: \`"5 min read"\`.

## Artigo português

\`\`\`
${artigoPt}
\`\`\`

## Referência de voz em inglês, já aprovada

\`\`\`
${referenciaEn.corpo}
\`\`\`

Responde só com o ficheiro Markdown em inglês.`
}
```

- [ ] **Step 4: Correr os testes**

Run: `npx vitest run scripts/gerar/prompt.test.mjs`
Expected: PASS, 8 testes

- [ ] **Step 5: Commit**

```bash
git add scripts/gerar/prompt.mjs scripts/gerar/prompt.test.mjs
git commit -m "feat: montagem do prompt de geração de artigos"
```

---

### Task 4: Chamada à API e escrita dos ficheiros

**Files:**
- Create: `scripts/gerar/cliente.mjs`
- Create: `scripts/gerar/escrever.mjs`
- Test: `scripts/gerar/escrever.test.mjs`
- Modify: `package.json` (adicionar `@anthropic-ai/sdk`)

**Interfaces:**
- Consumes: `SISTEMA` de `prompt.mjs`; `contarPalavras`/`dentroDoIntervalo` de `palavras.mjs`; `splitFrontmatter` de `src/lib/blog/parsePost.ts`; `validatePosts` de `src/lib/blog/validate.ts`
- Produces:
  - `criarCliente(apiKey) -> { pedir(prompt) -> Promise<{ texto, custo }> }`
  - `MODELO = 'claude-opus-5'`
  - `limparResposta(texto) -> string`
  - `verificarArtigo({ markdown, slug, lang }) -> string[]`
  - `escreverArtigo({ contentDir, slug, lang, markdown }) -> string` (devolve o caminho escrito)

- [ ] **Step 1: Instalar o SDK**

```bash
npm install --save-dev @anthropic-ai/sdk
```

- [ ] **Step 2: Escrever o teste, que falha**

Cria `scripts/gerar/escrever.test.mjs`:

```js
import { expect, test } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { limparResposta, verificarArtigo, escreverArtigo } from './escrever.mjs'

const CORPO_LONGO = 'palavra '.repeat(1400).trim()
const BOM = `---
title: "Um título"
excerpt: "Um excerto."
category: "Podcasts"
date: "September 2026"
readTime: "7 min de leitura"
---

${CORPO_LONGO}`

test('tira um bloco de código à volta da resposta', () => {
  expect(limparResposta('```markdown\n---\ntitle: "A"\n---\n\nCorpo.\n```')).toBe('---\ntitle: "A"\n---\n\nCorpo.')
})

test('tira um preâmbulo antes do frontmatter', () => {
  expect(limparResposta('Aqui está o artigo:\n\n---\ntitle: "A"\n---\n\nCorpo.')).toBe('---\ntitle: "A"\n---\n\nCorpo.')
})

test('deixa em paz uma resposta já limpa', () => {
  expect(limparResposta(BOM)).toBe(BOM)
})

test('um artigo bom não tem problemas', () => {
  expect(verificarArtigo({ markdown: BOM, slug: 'teste', lang: 'pt' })).toEqual([])
})

test('acusa um campo em falta, pelo validador que já existe', () => {
  const semExcerpt = BOM.replace('excerpt: "Um excerto."\n', '')
  expect(verificarArtigo({ markdown: semExcerpt, slug: 'teste', lang: 'pt' }).join(' ')).toContain('excerpt')
})

test('acusa uma categoria inventada', () => {
  const mau = BOM.replace('Podcasts', 'Categoria Inventada')
  expect(verificarArtigo({ markdown: mau, slug: 'teste', lang: 'pt' }).join(' ')).toContain('Inventada')
})

test('acusa um artigo curto de mais', () => {
  const curto = BOM.replace(CORPO_LONGO, 'palavra '.repeat(400))
  expect(verificarArtigo({ markdown: curto, slug: 'teste', lang: 'pt' }).join(' ')).toContain('400')
})

test('acusa um artigo sem frontmatter nenhum', () => {
  expect(verificarArtigo({ markdown: 'Só corpo.', slug: 'teste', lang: 'pt' }).join(' ')).toContain('frontmatter')
})

test('acusa um título de nível 1 no corpo', () => {
  const comH1 = BOM.replace(CORPO_LONGO, `# Um título repetido\n\n${CORPO_LONGO}`)
  expect(verificarArtigo({ markdown: comH1, slug: 'teste', lang: 'pt' }).join(' ')).toContain('#')
})

test('escreve o ficheiro no sítio certo, com newline final', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'escrever-'))
  const caminho = escreverArtigo({ contentDir: dir, slug: 'teste', lang: 'pt', markdown: BOM })
  expect(caminho).toBe(path.join(dir, 'teste', 'pt.md'))
  expect(fs.readFileSync(caminho, 'utf-8')).toBe(BOM + '\n')
})

test('recusa escrever por cima de um artigo que já existe', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'escrever-'))
  escreverArtigo({ contentDir: dir, slug: 'teste', lang: 'pt', markdown: BOM })
  expect(() => escreverArtigo({ contentDir: dir, slug: 'teste', lang: 'pt', markdown: BOM }))
    .toThrow(/já existe/)
})

test('mas escreve por cima quando lhe dizem que é uma expansão', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'escrever-'))
  escreverArtigo({ contentDir: dir, slug: 'teste', lang: 'pt', markdown: BOM })
  const novo = BOM.replace('Um título', 'Outro título')
  escreverArtigo({ contentDir: dir, slug: 'teste', lang: 'pt', markdown: novo, substituir: true })
  expect(fs.readFileSync(path.join(dir, 'teste', 'pt.md'), 'utf-8')).toContain('Outro título')
})
```

- [ ] **Step 3: Correr para ver falhar**

Run: `npx vitest run scripts/gerar/escrever.test.mjs`
Expected: FAIL — `Cannot find module './escrever.mjs'`

- [ ] **Step 4: Escrever o `escrever.mjs`**

```js
/* ─── Da resposta ao ficheiro ────────────────────────────────────────────────
   Entre o que o modelo devolve e o que fica no repositório há uma porta, e é
   esta. O que passa por aqui vai ser lido pelo mesmo `parsePost` e pelo mesmo
   `validatePosts` que o build usa — de propósito. Um artigo que passe aqui e
   rebente no build seria a pior das combinações: o PR aberto, a revisão feita,
   e o merge a partir o site.

   Por isso o `verificarArtigo` chama o validador que já existe em vez de
   repetir as regras. Só acrescenta o que o validador não sabe: a dimensão, e
   o `#` de nível 1 que duplicaria o título na página. ────────────────────── */
import fs from 'node:fs'
import path from 'node:path'
import { splitFrontmatter } from '../../src/lib/blog/parsePost.ts'
import { validatePosts } from '../../src/lib/blog/validate.ts'
import { contarPalavras, dentroDoIntervalo, MIN_PALAVRAS, MAX_PALAVRAS } from './palavras.mjs'

/* O modelo tem o hábito de embrulhar a resposta ou de a anunciar. Nenhuma das
   duas coisas é um erro do artigo, por isso limpam-se antes de verificar. */
export function limparResposta(texto) {
  let t = String(texto).trim()

  const bloco = t.match(/^```(?:markdown|md)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/)
  if (bloco) t = bloco[1].trim()

  /* Um preâmbulo antes do frontmatter: fica só do `---` para a frente. */
  const inicio = t.indexOf('\n---')
  if (!t.startsWith('---') && inicio !== -1) t = t.slice(inicio + 1).trim()

  return t
}

export function verificarArtigo({ markdown, slug, lang }) {
  const problemas = []

  if (!markdown.trimStart().startsWith('---')) {
    problemas.push(`${slug}/${lang}.md: a resposta não começa por frontmatter`)
    return problemas
  }

  const { data, content } = splitFrontmatter(markdown, `${slug}/${lang}.md`)
  const corpo = content.trim()

  problemas.push(...validatePosts([{ slug, lang, ...data }]))

  const palavras = contarPalavras(corpo)
  if (!dentroDoIntervalo(palavras)) {
    problemas.push(
      `${slug}/${lang}.md: tem ${palavras} palavras, e o intervalo é ${MIN_PALAVRAS}–${MAX_PALAVRAS}`
    )
  }

  if (/^[ \t]*#[ \t]+/m.test(corpo)) {
    problemas.push(`${slug}/${lang}.md: o corpo tem um título de nível 1 (#) — o título já está no frontmatter`)
  }

  return problemas
}

export function escreverArtigo({ contentDir, slug, lang, markdown, substituir = false }) {
  const pasta = path.join(contentDir, slug)
  const ficheiro = path.join(pasta, `${lang}.md`)

  if (!substituir && fs.existsSync(ficheiro)) {
    throw new Error(`${slug}/${lang}.md já existe — o gerador não escreve por cima de um artigo publicado`)
  }

  fs.mkdirSync(pasta, { recursive: true })
  fs.writeFileSync(ficheiro, markdown.trimEnd() + '\n', 'utf-8')
  return ficheiro
}
```

- [ ] **Step 5: Correr os testes**

Run: `npx vitest run scripts/gerar/escrever.test.mjs`
Expected: PASS, 12 testes

- [ ] **Step 6: Escrever o `cliente.mjs`**

Não tem teste próprio: é a única coisa aqui que toca na rede, e um teste dela testaria o SDK. A verificação real é a execução da Task 5.

```js
/* ─── A chamada ao modelo ────────────────────────────────────────────────────
   O único ficheiro do circuito que toca na rede, e por isso o único sem teste
   automático — testá-lo seria testar o SDK. Quem o verifica é a primeira
   execução real, com um artigo só.

   Streaming porque as respostas são longas: 1800 palavras mais thinking passam
   folgadamente o tempo limite de um pedido normal. ───────────────────────── */
import Anthropic from '@anthropic-ai/sdk'
import { SISTEMA } from './prompt.mjs'

export const MODELO = 'claude-opus-5'

/* Preço por milhão de tokens, para a conta sair no fim da execução. */
const POR_MTOK_ENTRADA = 5
const POR_MTOK_SAIDA = 25

export function criarCliente(apiKey) {
  if (!apiKey) throw new Error('falta a ANTHROPIC_API_KEY')
  const anthropic = new Anthropic({ apiKey })

  return {
    async pedir(prompt) {
      const stream = anthropic.messages.stream({
        model: MODELO,
        max_tokens: 16000,
        thinking: { type: 'adaptive' },
        system: SISTEMA,
        messages: [{ role: 'user', content: prompt }],
      })

      const mensagem = await stream.finalMessage()

      if (mensagem.stop_reason === 'max_tokens') {
        throw new Error('a resposta foi cortada no limite de tokens — o artigo ficaria incompleto')
      }
      if (mensagem.stop_reason === 'refusal') {
        throw new Error('o modelo recusou o pedido')
      }

      const texto = mensagem.content
        .filter(bloco => bloco.type === 'text')
        .map(bloco => bloco.text)
        .join('')

      if (!texto.trim()) throw new Error('a resposta não trouxe texto nenhum')

      const custo =
        (mensagem.usage.input_tokens / 1e6) * POR_MTOK_ENTRADA +
        (mensagem.usage.output_tokens / 1e6) * POR_MTOK_SAIDA

      return { texto, custo }
    },
  }
}
```

- [ ] **Step 7: Correr todos os testes**

Run: `npx vitest run`
Expected: PASS — 79 testes de nove ficheiros anteriores mais os novos

- [ ] **Step 8: Commit**

```bash
git add scripts/gerar/cliente.mjs scripts/gerar/escrever.mjs scripts/gerar/escrever.test.mjs package.json
git commit -m "feat: chamada à API e escrita dos artigos gerados"
```

---

### Task 5: CLI de geração, e a primeira execução real

**Files:**
- Create: `scripts/gerar/index.mjs`
- Test: `scripts/gerar/index.test.mjs`
- Modify: `package.json` (script `gerar`)

**Interfaces:**
- Consumes: tudo o que as tarefas 1 a 4 produziram
- Produces: `gerarUm({ cliente, modo, alvo, referenciasPt, referenciasEn, contentDir }) -> { slug, caminhos, custo, avisos }`, `lerArgumentos(argv) -> { modo, lote, slugs }`

- [ ] **Step 1: Escrever o teste, que falha**

O teste usa um cliente falso. Cria `scripts/gerar/index.test.mjs`:

```js
import { expect, test } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { gerarUm, lerArgumentos } from './index.mjs'

const corpo = n => 'palavra '.repeat(n)
const artigo = (titulo, palavras) => `---
title: "${titulo}"
excerpt: "Um excerto."
category: "Podcasts"
date: "September 2026"
readTime: "7 min de leitura"
---

${corpo(palavras)}`

const REF = {
  slug: 'ref', lang: 'pt', categoria: 'Podcasts',
  frontmatter: { title: 'Ref', excerpt: 'E.', category: 'Podcasts', date: 'July 2026', readTime: '5 min de leitura' },
  corpo: 'Corpo.', palavras: 1,
}
const REF_EN = { ...REF, lang: 'en' }

const TEMA = {
  slug: 'tema-novo', tema: 'Um tema', angulo: 'Um ângulo',
  categoria: 'Podcasts', prioridade: 1, estado: 'por-escrever',
}

function clienteFalso(respostas) {
  const dadas = []
  return {
    dadas,
    async pedir(prompt) {
      dadas.push(prompt)
      return { texto: respostas[dadas.length - 1], custo: 0.15 }
    },
  }
}

const dirTemp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'gerar-'))

test('lê os argumentos da linha de comandos', () => {
  expect(lerArgumentos(['--modo', 'escrever', '--lote', '3'])).toEqual({ modo: 'escrever', lote: 3, slugs: [] })
  expect(lerArgumentos(['--modo', 'expandir', '--slugs', 'a,b'])).toEqual({ modo: 'expandir', lote: 3, slugs: ['a', 'b'] })
})

test('recusa um modo que não existe', () => {
  expect(() => lerArgumentos(['--modo', 'inventar'])).toThrow(/inventar/)
})

test('escreve as duas línguas a partir de um tema', async () => {
  const contentDir = dirTemp()
  const cliente = clienteFalso([artigo('Português', 1400), artigo('English', 1400)])

  const r = await gerarUm({ cliente, modo: 'escrever', alvo: TEMA, referenciasPt: [REF], referenciasEn: [REF_EN], contentDir })

  expect(r.slug).toBe('tema-novo')
  expect(fs.readFileSync(path.join(contentDir, 'tema-novo', 'pt.md'), 'utf-8')).toContain('Português')
  expect(fs.readFileSync(path.join(contentDir, 'tema-novo', 'en.md'), 'utf-8')).toContain('English')
  expect(r.custo).toBeCloseTo(0.30)
})

test('o pedido inglês leva o artigo português dentro', async () => {
  const cliente = clienteFalso([artigo('Português', 1400), artigo('English', 1400)])
  await gerarUm({ cliente, modo: 'escrever', alvo: TEMA, referenciasPt: [REF], referenciasEn: [REF_EN], contentDir: dirTemp() })
  expect(cliente.dadas[1]).toContain('Português')
})

test('tenta uma segunda vez quando o artigo sai fora do intervalo', async () => {
  const cliente = clienteFalso([artigo('Curto', 400), artigo('Bom', 1400), artigo('English', 1400)])
  const r = await gerarUm({ cliente, modo: 'escrever', alvo: TEMA, referenciasPt: [REF], referenciasEn: [REF_EN], contentDir: dirTemp() })
  expect(cliente.dadas).toHaveLength(3)
  expect(cliente.dadas[1]).toContain('400')
  expect(r.avisos).toEqual([])
})

test('desiste ao fim de duas tentativas e regista o aviso, sem falhar', async () => {
  const contentDir = dirTemp()
  const cliente = clienteFalso([artigo('Curto', 400), artigo('Curto', 500), artigo('English', 1400)])
  const r = await gerarUm({ cliente, modo: 'escrever', alvo: TEMA, referenciasPt: [REF], referenciasEn: [REF_EN], contentDir })
  expect(r.avisos.join(' ')).toContain('500')
  expect(fs.existsSync(path.join(contentDir, 'tema-novo', 'pt.md'))).toBe(true)
})

test('não escreve nada quando o frontmatter vem estragado das duas vezes', async () => {
  const contentDir = dirTemp()
  const mau = artigo('Mau', 1400).replace('category: "Podcasts"', 'category: "Inventada"')
  const cliente = clienteFalso([mau, mau])
  await expect(gerarUm({ cliente, modo: 'escrever', alvo: TEMA, referenciasPt: [REF], referenciasEn: [REF_EN], contentDir }))
    .rejects.toThrow(/Inventada/)
  expect(fs.existsSync(path.join(contentDir, 'tema-novo'))).toBe(false)
})

test('no modo expandir escreve por cima do artigo que já existe', async () => {
  const contentDir = dirTemp()
  fs.mkdirSync(path.join(contentDir, 'antigo'), { recursive: true })
  fs.writeFileSync(path.join(contentDir, 'antigo', 'pt.md'), artigo('Antigo', 300))
  fs.writeFileSync(path.join(contentDir, 'antigo', 'en.md'), artigo('Old', 300))

  const alvo = { slug: 'antigo', lang: 'pt', categoria: 'Podcasts', frontmatter: { title: 'Antigo', category: 'Podcasts' }, corpo: corpo(300), palavras: 300 }
  const cliente = clienteFalso([artigo('Expandido', 1400), artigo('Expanded', 1400)])

  await gerarUm({ cliente, modo: 'expandir', alvo, referenciasPt: [REF], referenciasEn: [REF_EN], contentDir })
  expect(fs.readFileSync(path.join(contentDir, 'antigo', 'pt.md'), 'utf-8')).toContain('Expandido')
})
```

- [ ] **Step 2: Correr para ver falhar**

Run: `npx vitest run scripts/gerar/index.test.mjs`
Expected: FAIL — `Cannot find module './index.mjs'`

- [ ] **Step 3: Escrever o `index.mjs`**

```js
#!/usr/bin/env node
/* ─── O gerador ──────────────────────────────────────────────────────────────
   Junta as peças: lê o que há para fazer, pede ao modelo, verifica, escreve.

   Duas regras de desenho valem a pena explicar.

   A primeira: uma segunda tentativa quando o artigo sai fora do intervalo de
   palavras, e só por causa disso. Dizer ao modelo «saiu com 400, precisas de
   1200» resolve quase sempre, e é barato. Ao fim da segunda desiste e regista
   um aviso — o PR abre à mesma, com o aviso lá dentro, porque um artigo curto
   é uma decisão editorial e não um erro técnico.

   A segunda: um frontmatter inválido **não** abre PR. Ao contrário da
   dimensão, isso partiria o build, e o spec é explícito em que o merge
   automático só corre com o build verde. Falha alto, não escreve nada. ──── */
import path from 'node:path'
import { appendFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { lerTemas, proximosTemas, marcarUsados, validarTemas } from './temas.mjs'
import { lerArtigosMarkdown, escolherReferencias } from './referencias.mjs'
import { promptEscrever, promptExpandir, promptIngles } from './prompt.mjs'
import { limparResposta, verificarArtigo, escreverArtigo } from './escrever.mjs'
import { criarCliente } from './cliente.mjs'
import { contarPalavras, MIN_PALAVRAS, MAX_PALAVRAS } from './palavras.mjs'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const CONTENT_DIR = path.join(RAIZ, 'content', 'blog')
const TEMAS = path.join(CONTENT_DIR, '_temas.yml')
const MODOS = ['escrever', 'expandir']
const REFERENCIAS = 3

export function lerArgumentos(argv) {
  const valor = nome => {
    const i = argv.indexOf(`--${nome}`)
    return i === -1 ? undefined : argv[i + 1]
  }

  const modo = valor('modo') ?? 'escrever'
  if (!MODOS.includes(modo)) {
    throw new Error(`modo "${modo}" não existe — usa ${MODOS.join(' ou ')}`)
  }

  return {
    modo,
    lote: Number(valor('lote') ?? 3),
    slugs: (valor('slugs') ?? '').split(',').map(s => s.trim()).filter(Boolean),
  }
}

/* Uma tentativa: pede, limpa, verifica. Devolve o Markdown ou os problemas. */
async function tentar(cliente, prompt, slug, lang) {
  const { texto, custo } = await cliente.pedir(prompt)
  const markdown = limparResposta(texto)
  return { markdown, custo, problemas: verificarArtigo({ markdown, slug, lang }) }
}

/* Separa o que é dimensão do que é frontmatter: só a primeira dá segunda
   tentativa, e só a segunda é fatal. */
const ehDimensao = p => p.includes('palavras, e o intervalo é')

async function pedirComRetentativa(cliente, prompt, slug, lang) {
  let total = 0
  let ultimo = null

  for (const tentativa of [1, 2]) {
    const pedido = tentativa === 1
      ? prompt
      : `${prompt}\n\n---\n\nA versão anterior saiu com ${contarPalavras(ultimo.markdown)} palavras, e o intervalo é ${MIN_PALAVRAS}–${MAX_PALAVRAS}. Escreve outra vez, com a dimensão certa. Desenvolve os pontos, não os repitas.`

    const r = await tentar(cliente, pedido, slug, lang)
    total += r.custo
    ultimo = r

    if (r.problemas.length === 0) return { markdown: r.markdown, custo: total, avisos: [] }

    const fatais = r.problemas.filter(p => !ehDimensao(p))
    if (fatais.length) throw new Error(`${slug}/${lang}.md não passou a verificação:\n  ${r.problemas.join('\n  ')}`)
  }

  /* Só sobra a dimensão: escreve à mesma e avisa. */
  return { markdown: ultimo.markdown, custo: total, avisos: ultimo.problemas }
}

export async function gerarUm({ cliente, modo, alvo, referenciasPt, referenciasEn, contentDir }) {
  const slug = alvo.slug
  const substituir = modo === 'expandir'

  const promptPt = modo === 'escrever'
    ? promptEscrever({ tema: alvo, referencias: referenciasPt })
    : promptExpandir({ artigo: alvo, referencias: referenciasPt })

  const pt = await pedirComRetentativa(cliente, promptPt, slug, 'pt')
  const en = await pedirComRetentativa(
    cliente,
    promptIngles({ artigoPt: pt.markdown, referenciaEn: referenciasEn[0] }),
    slug,
    'en',
  )

  const caminhos = [
    escreverArtigo({ contentDir, slug, lang: 'pt', markdown: pt.markdown, substituir }),
    escreverArtigo({ contentDir, slug, lang: 'en', markdown: en.markdown, substituir }),
  ]

  return { slug, caminhos, custo: pt.custo + en.custo, avisos: [...pt.avisos, ...en.avisos] }
}

async function principal() {
  const { modo, lote, slugs } = lerArgumentos(process.argv.slice(2))
  const cliente = criarCliente(process.env.ANTHROPIC_API_KEY)

  const artigosPt = lerArtigosMarkdown(CONTENT_DIR, 'pt')
  const artigosEn = lerArtigosMarkdown(CONTENT_DIR, 'en')

  let alvos
  if (modo === 'escrever') {
    const temas = lerTemas(TEMAS)
    const problemas = validarTemas(temas)
    if (problemas.length) {
      console.error(`[gerar] a lista de temas tem problemas:\n  ${problemas.join('\n  ')}`)
      process.exit(1)
    }

    alvos = slugs.length ? temas.filter(t => slugs.includes(t.slug)) : proximosTemas(temas, lote)
    if (alvos.length === 0) {
      console.error('[gerar] LISTA_ESGOTADA')
      process.exit(2)
    }
  } else {
    const curtos = artigosPt
      .filter(a => a.palavras < MIN_PALAVRAS)
      .sort((a, b) => a.slug.localeCompare(b.slug))
    alvos = slugs.length ? curtos.filter(a => slugs.includes(a.slug)) : curtos.slice(0, lote)
    if (alvos.length === 0) {
      console.error('[gerar] não há artigos curtos por expandir')
      process.exit(2)
    }
  }

  const feitos = []
  let custo = 0

  for (const alvo of alvos) {
    const categoria = modo === 'escrever' ? alvo.categoria : alvo.frontmatter.category
    console.log(`[gerar] ${modo}: ${alvo.slug}`)

    const r = await gerarUm({
      cliente,
      modo,
      alvo,
      referenciasPt: escolherReferencias(artigosPt, categoria, REFERENCIAS, alvo.slug),
      referenciasEn: escolherReferencias(artigosEn, categoria, REFERENCIAS, alvo.slug),
      contentDir: CONTENT_DIR,
    })

    custo += r.custo
    feitos.push(r)
    for (const aviso of r.avisos) console.warn(`[gerar] aviso: ${aviso}`)
  }

  if (modo === 'escrever') marcarUsados(TEMAS, feitos.map(f => f.slug))

  const avisos = feitos.flatMap(f => f.avisos)
  console.log(`[gerar] ${feitos.length} artigos, $${custo.toFixed(2)}`)

  /* Consumido pelo workflow para montar o corpo do PR. */
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, [
      `slugs=${feitos.map(f => f.slug).join(',')}`,
      `custo=${custo.toFixed(2)}`,
      `avisos<<FIM\n${avisos.join('\n')}\nFIM`,
    ].join('\n') + '\n')
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch(erro => {
    console.error(`[gerar] ${erro.message}`)
    process.exit(1)
  })
}
```

- [ ] **Step 4: Correr os testes**

Run: `npx vitest run scripts/gerar/index.test.mjs`
Expected: PASS, 8 testes

- [ ] **Step 5: Acrescentar o script ao `package.json`**

Na secção `scripts`, entre `"dev"` e `"test"`:

```json
"gerar": "node scripts/gerar/index.mjs",
```

- [ ] **Step 6: Primeira execução real — PARAR e pedir autorização**

**Esta é a primeira chamada que gasta dinheiro.** Custo estimado: **$0,30** por um artigo.

Pergunta ao utilizador antes de correr, e mostra-lhe este comando:

```bash
ANTHROPIC_API_KEY=... npm run gerar -- --modo expandir --lote 1
```

Depois de correr, verifica **e mostra ao utilizador**:
- `git diff --stat` — devem ser dois ficheiros, `pt.md` e `en.md` do mesmo slug
- a contagem de palavras dos dois: `node -e "import('./scripts/gerar/palavras.mjs').then(m=>console.log(m.contarPalavras(require('fs').readFileSync(process.argv[1],'utf-8'))))" content/blog/<slug>/pt.md`
- `npm run build` passa
- o texto do artigo, lido de ponta a ponta, contra as regras de voz das Global Constraints

**Não avances sem o utilizador ler o artigo e aprovar.** É este o momento em que se descobre se o prompt está bom, e é muito mais barato corrigir o `prompt.mjs` agora do que depois de a Action estar a correr sozinha.

- [ ] **Step 7: Commit**

```bash
git add scripts/gerar/index.mjs scripts/gerar/index.test.mjs package.json content/blog/
git commit -m "feat: CLI de geração de artigos, e o primeiro artigo expandido"
```

---


### Task 6: Contador de artigos publicados

**Files:**
- Create: `scripts/prazo/contador.mjs`
- Create: `scripts/prazo/contar.mjs`
- Test: `scripts/prazo/contador.test.mjs`

**Interfaces:**
- Produces: `contarArtigos(ficheiros) -> number`, `MARCA_AVISO` (string), `ETIQUETA = 'artigo-automatico'`, `BOTS` (string[]), e um CLI `node scripts/prazo/contar.mjs` que imprime o total

Este módulo vem antes dos workflows porque os dois precisam dele: o de geração
para escrever no PR em que número vai, e o do prazo para saber se a rampa já
terminou.

- [ ] **Step 1: Escrever o teste, que falha**

Cria `scripts/prazo/contador.test.mjs`:

```js
import { expect, test } from 'vitest'
import { contarArtigos, MARCA_AVISO, ETIQUETA, ehBot } from './contador.mjs'

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

test('a etiqueta é a que os workflows usam', () => {
  expect(ETIQUETA).toBe('artigo-automatico')
})

test('a marca do aviso é um comentário HTML, invisível na página', () => {
  expect(MARCA_AVISO).toMatch(/^<!--.*-->$/)
})

test('a lista de bots inclui o do GitHub Actions', () => {
  expect(BOTS).toContain('github-actions[bot]')
})
```

- [ ] **Step 2: Correr para ver falhar**

Run: `npx vitest run scripts/prazo/contador.test.mjs`
Expected: FAIL — `Cannot find module './contador.mjs'`

- [ ] **Step 3: Escrever o `contador.mjs`**

```js
/* ─── Quantos artigos já saíram ──────────────────────────────────────────────
   A rampa precisa de um número, e a tentação é guardá-lo num ficheiro. Não se
   guarda: um contador em ficheiro desalinha-se do que aconteceu mesmo, e o que
   ele controla é merge automático — é o pior sítio do sistema para ter um
   número em que não se pode confiar.

   Conta-se a partir do que o GitHub sabe: os PRs já juntados com a etiqueta, e
   dentro de cada um os `pt.md` que ele mexeu. Um artigo = um `pt.md`, porque
   todos os artigos têm as duas línguas. ─────────────────────────────────── */

/* Um nível de pasta, sem underscore no início — é o mesmo critério que o
   `loadPosts` usa para decidir o que é um artigo. */
const ARTIGO = /^content\/blog\/[^_/][^/]*\/pt\.md$/

export const ETIQUETA = 'artigo-automatico'
export const MARCA_AVISO = '<!-- prazo-artigos: aviso-24h -->'
export const BOTS = [
  'github-actions[bot]',
  'cloudflare-workers-and-pages[bot]',
  'cloudflare-pages[bot]',
]

export function contarArtigos(ficheiros) {
  return ficheiros.filter(f => ARTIGO.test(f.path)).length
}
```

- [ ] **Step 4: Escrever o CLI**

Cria `scripts/prazo/contar.mjs`. É separado do módulo para o módulo continuar
testável sem processo nem rede.

```js
#!/usr/bin/env node
/* Imprime quantos artigos a automação já publicou. Usado pelos dois workflows
   e útil à mão, para perceber onde a rampa vai. */
import { execFileSync } from 'node:child_process'
import { contarArtigos, ETIQUETA } from './contador.mjs'

const ghJson = args => JSON.parse(execFileSync('gh', args, { encoding: 'utf-8' }))

const juntados = ghJson([
  'pr', 'list', '--state', 'merged', '--label', ETIQUETA,
  '--limit', '100', '--json', 'number',
])

const total = juntados.reduce((soma, pr) => {
  const { files } = ghJson(['pr', 'view', String(pr.number), '--json', 'files'])
  return soma + contarArtigos(files)
}, 0)

console.log(total)
```

- [ ] **Step 5: Correr os testes e experimentar o CLI**

```bash
npx vitest run scripts/prazo/contador.test.mjs
node scripts/prazo/contar.mjs
```

Expected: 7 testes passam; o CLI imprime `0` — ainda não há PRs com a etiqueta.

- [ ] **Step 6: Commit**

```bash
git add scripts/prazo/contador.mjs scripts/prazo/contador.test.mjs scripts/prazo/contar.mjs
git commit -m "feat: contagem dos artigos já publicados pela automação"
```

---

### Task 7: Workflow de geração

**Files:**
- Create: `.github/workflows/gerar-artigos.yml`

**Interfaces:**
- Consumes: `npm run gerar` (escreve `slugs`, `custo`, `avisos` no `GITHUB_OUTPUT`; sai com 2 quando não há nada por fazer); `node scripts/prazo/contar.mjs`
- Produces: PRs com a etiqueta `artigo-automatico` e o contador da rampa no corpo

- [ ] **Step 1: Criar a etiqueta**

Sem ela nada do prazo funciona — é por ela que os dois workflows reconhecem os
seus próprios PRs.

```bash
gh label create artigo-automatico --color 0E8A16 --description "Artigo gerado pela automação do blog"
```

- [ ] **Step 2: Pedir ao utilizador para criar o secret**

Tem de ser o dono do repositório, na interface do GitHub. **Não peças a chave
por chat, não a escrevas em ficheiro nenhum, não a ponhas num comando.**

> Settings → Secrets and variables → Actions → New repository secret
> Nome: `ANTHROPIC_API_KEY`

Confirma depois que existe, sem a ler:

```bash
gh secret list
```

- [ ] **Step 3: Escrever o workflow**

Cria `.github/workflows/gerar-artigos.yml`:

```yaml
name: Gerar artigos

on:
  schedule:
    # Terça e sexta às 07:00 UTC. O cron do GitHub não tem fuso: em Portugal
    # são 08:00 no inverno e 09:00 no verão, e não faz diferença nenhuma —
    # o que sai daqui é um PR à espera de revisão, não uma publicação.
    - cron: '0 7 * * 2,5'
  workflow_dispatch:
    inputs:
      modo:
        description: 'escrever (temas novos) ou expandir (artigos curtos)'
        type: choice
        options: [escrever, expandir]
        default: escrever
      lote:
        description: 'Quantos artigos'
        default: '3'

permissions:
  contents: write
  pull-requests: write
  issues: write

concurrency:
  group: gerar-artigos
  cancel-in-progress: false

jobs:
  gerar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Versão 24 e não 22: os módulos do gerador importam `.ts` a partir de
      # `.mjs`, e o Node só o faz sozinho a partir da 24. Na 22 isto falha com
      # `Unknown file extension ".ts"`.
      - uses: actions/setup-node@v4
        with:
          node-version: '24'

      - run: npm ci

      # Um `expandir` disparado à mão dentro da janela das 48 horas voltaria a
      # escolher um artigo que já está num PR por juntar — o `main` ainda o vê
      # curto. A automação não deve gastar dinheiro a reescrever o que já está
      # à espera de revisão.
      - name: Recusar se já houver um PR de artigos por juntar
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          abertos=$(gh pr list --state open --label artigo-automatico --limit 50 --json number --jq 'length')
          if [ "$abertos" != "0" ]; then
            echo "::error::há $abertos PR(s) de artigos por juntar — junta ou fecha antes de gerar mais"
            exit 1
          fi

      - name: Gerar
        id: gerar
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          set +e
          npm run gerar -- --modo "${{ inputs.modo || 'escrever' }}" --lote "${{ inputs.lote || 3 }}"
          codigo=$?
          echo "codigo=$codigo" >> "$GITHUB_OUTPUT"
          # 2 = não há nada por fazer. Não é falha: é tratado a seguir.
          if [ $codigo -eq 2 ]; then exit 0; fi
          exit $codigo

      - name: Avisar que a lista de temas esgotou
        if: steps.gerar.outputs.codigo == '2'
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          abertos=$(gh issue list --label artigo-automatico --state open \
            --search "Lista de temas esgotada in:title" --json number --jq 'length')
          if [ "$abertos" = "0" ]; then
            gh issue create \
              --title "Lista de temas esgotada" \
              --label artigo-automatico \
              --body 'A automação chegou ao fim de `content/blog/_temas.yml`. Não inventa temas: fica à espera.

          Para a destravar, acrescenta entradas novas ao ficheiro com `estado: por-escrever`. A próxima execução agendada apanha-as sozinha.'
          fi

      # O `main` não tem status checks obrigatórios, e um PR aberto pelo
      # GITHUB_TOKEN não dispara outros workflows. Se o build não correr aqui,
      # não corre em lado nenhum antes do merge.
      - name: Confirmar que o build passa
        if: steps.gerar.outputs.codigo == '0'
        run: npm run build

      - name: Abrir o Pull Request
        if: steps.gerar.outputs.codigo == '0'
        env:
          GH_TOKEN: ${{ github.token }}
          SLUGS: ${{ steps.gerar.outputs.slugs }}
          CUSTO: ${{ steps.gerar.outputs.custo }}
          AVISOS: ${{ steps.gerar.outputs.avisos }}
        run: |
          set -euo pipefail

          # NÃO limpar nada aqui. Uma versão anterior deste plano fazia
          # `git checkout -- .` para arrumar o que o build deixasse — e isso
          # revertia as alterações do próprio gerador a ficheiros versionados:
          # o `_temas.yml` nunca ficava marcado, e no modo expandir os artigos
          # reescritos desapareciam antes do commit. O `dist/` e o `dist-ssr/`
          # estão no .gitignore e o `git add content/blog/` só apanha esse
          # caminho, por isso não há nada para limpar.
          ramo="artigos/$(date -u +%Y-%m-%d-%H%M)"
          git config user.name  "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git checkout -b "$ramo"
          git add content/blog/
          git commit -m "conteúdo: $(echo "$SLUGS" | tr ',' ' ')"
          git push -u origin "$ramo"

          publicados=$(node scripts/prazo/contar.mjs)
          neste=$(echo "$SLUGS" | tr ',' '\n' | grep -c . || true)
          depois=$((publicados + neste))

          if [ "$depois" -le 10 ]; then
            rampa="Este PR leva o blog a **$depois de 10 artigos** antes de o prazo automático entrar. Até lá, nada é publicado sem alguém carregar em *Merge*."
          else
            rampa="A rampa já terminou ($publicados artigos publicados). **Este PR é juntado automaticamente ao fim de 48 horas** se ninguém escrever nada aqui. Recebes um aviso às 24 horas."
          fi

          lista=$(echo "$SLUGS" | tr ',' '\n' | sed 's|^|- `content/blog/|; s|$|/`|')

          avisos=""
          if [ -n "$AVISOS" ]; then
            avisos=$(printf '\n## Avisos\n\n%s\n\n_O PR abre à mesma: a dimensão é uma decisão editorial, não um erro técnico._\n' \
              "$(echo "$AVISOS" | sed 's|^|- |')")
          fi

          # A etiqueta só entra em PRs que a automação abre. Se alguém a puser à
          # mão num PR que apenas edita um artigo já publicado, o contador
          # conta-o como artigo novo e a rampa avança mais depressa do que devia.
          gh pr create \
            --label artigo-automatico \
            --title "Artigos: $(echo "$SLUGS" | tr ',' ' ')" \
            --body "$(printf 'Artigos gerados pela automação, em português e inglês.\n\n%s\n\nLê-os na **pré-visualização do Cloudflare** — o link aparece aqui em baixo daqui a um minuto. Não é preciso ler código.\n\n%s\n%s\nCusto desta execução: $%s\n' \
              "$lista" "$rampa" "$avisos" "$CUSTO")"
```

- [ ] **Step 4: Confirmar que a falha chega a alguém**

Quando a API falhar, o workflow falha — e o spec diz que tem de haver
notificação. O GitHub só avisa por omissão o autor de uma execução agendada,
que num `schedule` é quem fez o último commit no workflow. Confirma com o
utilizador que ele recebe:

> GitHub → Settings → Notifications → Actions → **Send notifications for failed workflows only**

Se ele preferir não depender disso, diz-lho agora: a alternativa é um passo
`if: failure()` que abre um issue, e fica registado como trabalho por fazer.

- [ ] **Step 5: Validar a sintaxe**

```bash
npx --yes @action-validator/cli .github/workflows/gerar-artigos.yml
```

Expected: sem erros

- [ ] **Step 6: Commit, PR, e PARAR**

```bash
git checkout -b feat/workflow-gerar-artigos
git add .github/workflows/gerar-artigos.yml
git commit -m "feat: workflow que gera artigos e abre PR"
git push -u origin feat/workflow-gerar-artigos
gh pr create --title "Workflow de geração de artigos" --body "Ver docs/superpowers/plans/2026-09-28-blog-automacao.md"
```

Um workflow só corre depois de estar no `main`. Pede ao utilizador que junte, e
só depois dispara à mão, com um artigo:

```bash
gh workflow run "Gerar artigos" -f modo=expandir -f lote=1
gh run watch
```

Confirma e mostra ao utilizador: o PR abriu, tem a etiqueta, o corpo diz
«2 de 10 artigos», e o Cloudflare deixou lá o link de pré-visualização.

---

### Task 8: A decisão do prazo

**Files:**
- Create: `scripts/prazo/decidir.mjs`
- Test: `scripts/prazo/decidir.test.mjs`

**Interfaces:**
- Produces: `ARTIGOS_ANTES_DO_AUTOMATICO = 10`, `HORAS_AVISO = 24`, `HORAS_MERGE = 48`, `decidir({ pr, artigosPublicados, agora }) -> { acao, motivo }` com `acao ∈ 'nada' | 'avisar' | 'juntar' | 'precisa-build'`
- `pr` é `{ numero, criadoEm, artigos, comentariosHumanos, revisoes, buildVerde, jaAvisado, rascunho }`; `buildVerde` pode ser `null` para dizer «ainda não sei»

- [ ] **Step 1: Escrever o teste, que falha**

Cria `scripts/prazo/decidir.test.mjs`:

```js
import { expect, test } from 'vitest'
import { decidir, ARTIGOS_ANTES_DO_AUTOMATICO, HORAS_AVISO, HORAS_MERGE } from './decidir.mjs'

const AGORA = new Date('2026-10-05T12:00:00Z')
const haHoras = h => new Date(AGORA.getTime() - h * 3600_000).toISOString()

const pr = (extra = {}) => ({
  numero: 42,
  criadoEm: haHoras(50),
  artigos: 3,
  comentariosHumanos: 0,
  revisoes: 0,
  buildVerde: true,
  jaAvisado: false,
  rascunho: false,
  ...extra,
})

const acao = (extra, publicados = 20) =>
  decidir({ pr: pr(extra), artigosPublicados: publicados, agora: AGORA }).acao

test('os números são os do spec', () => {
  expect([ARTIGOS_ANTES_DO_AUTOMATICO, HORAS_AVISO, HORAS_MERGE]).toEqual([10, 24, 48])
})

test('não faz nada enquanto a rampa não tiver terminado', () => {
  const d = decidir({ pr: pr(), artigosPublicados: 6, agora: AGORA })
  expect(d.acao).toBe('nada')
  expect(d.motivo).toContain('9')
  expect(d.motivo).toContain('10')
})

test('a rampa conta com os artigos deste PR', () => {
  // 8 publicados + 3 neste PR = 11, passa dos 10
  expect(acao({}, 8)).toBe('juntar')
})

test('exactamente 10 ainda não chega', () => {
  expect(acao({}, 7)).toBe('nada')
})

test('não faz nada antes das 24 horas', () => {
  expect(acao({ criadoEm: haHoras(3) })).toBe('nada')
})

test('avisa às 24 horas', () => {
  expect(acao({ criadoEm: haHoras(25) })).toBe('avisar')
})

test('não avisa duas vezes', () => {
  expect(acao({ criadoEm: haHoras(25), jaAvisado: true })).toBe('nada')
})

test('junta às 48 horas', () => {
  expect(acao({ criadoEm: haHoras(49) })).toBe('juntar')
})

test('um comentário humano trava o relógio, mesmo passadas as 48 horas', () => {
  const d = decidir({ pr: pr({ comentariosHumanos: 1 }), artigosPublicados: 20, agora: AGORA })
  expect(d.acao).toBe('nada')
  expect(d.motivo).toContain('comentário')
})

test('uma revisão também trava, mesmo que seja uma aprovação', () => {
  expect(acao({ revisoes: 1 })).toBe('nada')
})

test('um comentário trava também a fase do aviso', () => {
  expect(acao({ criadoEm: haHoras(25), comentariosHumanos: 1 })).toBe('nada')
})

test('um rascunho nunca é juntado', () => {
  expect(acao({ rascunho: true })).toBe('nada')
})

test('build vermelho não junta, e diz porquê', () => {
  const d = decidir({ pr: pr({ buildVerde: false }), artigosPublicados: 20, agora: AGORA })
  expect(d.acao).toBe('nada')
  expect(d.motivo).toContain('build')
})

test('pede o build quando ainda não sabe se está verde', () => {
  expect(acao({ buildVerde: null })).toBe('precisa-build')
})

test('não pede o build a quem ainda não chegou às 48 horas', () => {
  expect(acao({ criadoEm: haHoras(3), buildVerde: null })).toBe('nada')
})

test('nem a quem já tem um comentário', () => {
  expect(acao({ buildVerde: null, comentariosHumanos: 1 })).toBe('nada')
})
```

- [ ] **Step 2: Correr para ver falhar**

Run: `npx vitest run scripts/prazo/decidir.test.mjs`
Expected: FAIL — `Cannot find module './decidir.mjs'`

- [ ] **Step 3: Escrever o `decidir.mjs`**

```js
/* ─── O prazo ────────────────────────────────────────────────────────────────
   Isto é uma função pura de propósito. É a peça do sistema que junta código ao
   `main` sem ninguém carregar em nada, e a única forma de ter confiança nela é
   poder escrever todos os casos num teste sem tocar no GitHub.

   Três decisões que valem a pena explicar.

   **A rampa vem primeiro.** Até 10 artigos publicados, nada acontece sozinho,
   aconteça o que acontecer. É a travagem que não depende de nenhuma das
   outras estar bem.

   **A contagem inclui os artigos deste PR.** Sem isso o 10.º artigo cairia num
   limbo: o PR que o traz ainda conta 7 publicados, e o seguinte já conta 13. O
   critério tem de ser o estado do blog depois deste merge, não antes.

   **O `buildVerde` pode ser `null`.** Correr um build custa três minutos, e
   esta função é chamada de hora a hora sobre todos os PRs abertos. Devolver
   `precisa-build` deixa quem chama correr o build só nos PRs em que ele é a
   única coisa que falta — o que evita construir 50 vezes por dia um PR que
   está travado por um comentário de qualquer maneira. ───────────────────── */

export const ARTIGOS_ANTES_DO_AUTOMATICO = 10
export const HORAS_AVISO = 24
export const HORAS_MERGE = 48

const nada = motivo => ({ acao: 'nada', motivo })

export function decidir({ pr, artigosPublicados, agora }) {
  const depoisDeste = artigosPublicados + pr.artigos
  if (depoisDeste <= ARTIGOS_ANTES_DO_AUTOMATICO) {
    return nada(
      `rampa: ficariam ${depoisDeste} artigos publicados, e o prazo só corre acima de ${ARTIGOS_ANTES_DO_AUTOMATICO}`
    )
  }

  if (pr.rascunho) return nada('o PR está em rascunho')
  if (pr.comentariosHumanos > 0) return nada('alguém deixou um comentário — o relógio está parado')
  if (pr.revisoes > 0) return nada('o PR tem uma revisão — o relógio está parado')

  const horas = (agora.getTime() - new Date(pr.criadoEm).getTime()) / 3600_000

  if (horas >= HORAS_MERGE) {
    if (pr.buildVerde === null || pr.buildVerde === undefined) {
      return { acao: 'precisa-build', motivo: `${Math.floor(horas)} horas sem resposta — falta saber do build` }
    }
    if (!pr.buildVerde) return nada('passaram as 48 horas, mas o build não está verde')
    return { acao: 'juntar', motivo: `${Math.floor(horas)} horas sem resposta, e o build está verde` }
  }

  if (horas >= HORAS_AVISO) {
    if (pr.jaAvisado) return nada('já foi avisado')
    return { acao: 'avisar', motivo: `${Math.floor(horas)} horas sem resposta` }
  }

  return nada(`só passaram ${Math.floor(horas)} horas`)
}
```

- [ ] **Step 4: Correr os testes**

Run: `npx vitest run scripts/prazo/decidir.test.mjs`
Expected: PASS, 16 testes

- [ ] **Step 5: Commit**

```bash
git add scripts/prazo/decidir.mjs scripts/prazo/decidir.test.mjs
git commit -m "feat: decisão do prazo de 48 horas, com a rampa de 10 artigos"
```

---

### Task 9: Workflow do prazo

**Files:**
- Create: `scripts/prazo/index.mjs`
- Create: `.github/workflows/prazo-artigos.yml`

**Interfaces:**
- Consumes: `decidir` de `decidir.mjs`; `contarArtigos`, `MARCA_AVISO`, `ETIQUETA`, `ehBot` de `contador.mjs`

**Duas coisas que a Task 6 descobriu e que esta tarefa tem de respeitar:**

1. `gh pr view --json comments` devolve o login do Cloudflare como
   `cloudflare-workers-and-pages`, **sem** o sufixo `[bot]` — a API REST usa a
   outra forma. Por isso não se compara com uma lista: usa-se o `ehBot`, que
   normaliza. Com uma lista, o comentário de pré-visualização do Cloudflare
   contava como comentário humano, o relógio parava em todos os PRs e o merge
   automático nunca corria — sem sintoma visível.
2. `contarArtigos` exige `path` **e** `changeType`, e conta só `ADDED`, em
   maiúsculas como o `gh` devolve. Um objeto só com `path` conta zero. A API
   REST usa `status: 'added'` em minúsculas, que contaria zero para sempre.
- Produces: CLI com dois modos — `--planear` imprime JSON com o que fazer a cada PR e não muda nada; `--aplicar <numero>` executa a decisão de um PR, com `BUILD_VERDE` no ambiente

- [ ] **Step 1: Escrever o `index.mjs`**

Não tem teste próprio: toda a lógica está no `decidir`, que está testado. Aqui
só há leitura do GitHub e execução.

```js
#!/usr/bin/env node
/* ─── Aplicar o prazo ────────────────────────────────────────────────────────
   Dois modos, e a separação existe por causa do custo. O `--planear` só lê:
   percorre os PRs abertos e diz o que faria a cada um, sem nunca construir
   nada. O workflow olha para esse plano e só corre o build nos PRs que
   devolveram `precisa-build`. Depois volta cá com `--aplicar`, um de cada vez.

   Sem esta divisão, correr o prazo de hora a hora significava construir todos
   os PRs abertos 24 vezes por dia — incluindo os que estão travados por um
   comentário e não vão a lado nenhum. ───────────────────────────────────── */
import { execFileSync } from 'node:child_process'
import { decidir, ARTIGOS_ANTES_DO_AUTOMATICO } from './decidir.mjs'
import { contarArtigos, MARCA_AVISO, ETIQUETA, ehBot } from './contador.mjs'

const gh = args => execFileSync('gh', args, { encoding: 'utf-8' })
const ghJson = args => JSON.parse(gh(args))

const humano = quem => !ehBot(quem?.login)

function lerPr(numero, buildVerde) {
  const pr = ghJson([
    'pr', 'view', String(numero),
    '--json', 'number,createdAt,isDraft,comments,reviews,files',
  ])

  return {
    numero: pr.number,
    criadoEm: pr.createdAt,
    artigos: contarArtigos(pr.files),
    comentariosHumanos: pr.comments.filter(c => humano(c.author)).length,
    revisoes: pr.reviews.filter(r => humano(r.author)).length,
    jaAvisado: pr.comments.some(c => c.body?.includes(MARCA_AVISO)),
    rascunho: pr.isDraft,
    buildVerde,
  }
}

/* Lê `path` e `changeType`, e conta só os `ADDED` — ver o `contador.mjs`. Se
   isto voltar a pedir só `files` sem o `changeType`, a contagem passa a incluir
   edições e apagamentos, e a rampa avança sem artigos novos. */
function artigosPublicados() {
  const juntados = ghJson([
    'pr', 'list', '--state', 'merged', '--label', ETIQUETA,
    '--limit', '100', '--json', 'number',
  ])
  return juntados.reduce((soma, pr) => {
    const { files } = ghJson(['pr', 'view', String(pr.number), '--json', 'files'])
    return soma + contarArtigos(files)
  }, 0)
}

function abertos() {
  return ghJson([
    'pr', 'list', '--state', 'open', '--label', ETIQUETA,
    '--limit', '50', '--json', 'number',
  ]).map(p => p.number)
}

function avisar(numero, publicados) {
  gh(['pr', 'comment', String(numero), '--body', `${MARCA_AVISO}
Faltam **24 horas** para este PR ser juntado automaticamente.

Para travar o relógio basta escrever aqui qualquer coisa — não é preciso aprovar nem pedir alterações.

_Artigos publicados por esta via: ${publicados}. O prazo automático corre acima de ${ARTIGOS_ANTES_DO_AUTOMATICO}._`])
}

function juntar(numero, motivo) {
  gh(['pr', 'comment', String(numero), '--body',
    `A juntar automaticamente: ${motivo}.\n\nSe isto não devia ter acontecido, um \`git revert\` deste merge repõe o blog como estava.`])
  gh(['pr', 'merge', String(numero), '--squash', '--delete-branch'])
}

function planear() {
  const numeros = abertos()
  if (numeros.length === 0) {
    console.log(JSON.stringify({ publicados: 0, prs: [] }))
    return
  }

  const publicados = artigosPublicados()
  const prs = numeros.map(numero => {
    /* `null` no build: o plano é feito sem construir nada. */
    const { acao, motivo } = decidir({ pr: lerPr(numero, null), artigosPublicados: publicados, agora: new Date() })
    return { numero, acao, motivo }
  })

  console.log(JSON.stringify({ publicados, prs }))
}

function aplicar(numero) {
  const publicados = artigosPublicados()
  const verde = process.env.BUILD_VERDE === 'true' ? true
    : process.env.BUILD_VERDE === 'false' ? false
    : null

  const { acao, motivo } = decidir({ pr: lerPr(numero, verde), artigosPublicados: publicados, agora: new Date() })
  console.error(`[prazo] PR #${numero}: ${acao} — ${motivo}`)

  if (acao === 'avisar') avisar(numero, publicados)
  else if (acao === 'juntar') juntar(numero, motivo)
}

const argv = process.argv.slice(2)
if (argv[0] === '--planear') planear()
else if (argv[0] === '--aplicar') aplicar(Number(argv[1]))
else {
  console.error('uso: index.mjs --planear | --aplicar <numero>')
  process.exit(1)
}
```

- [ ] **Step 2: Experimentar o `--planear` à mão**

É seguro: não muda nada.

```bash
node scripts/prazo/index.mjs --planear | python3 -m json.tool
```

Expected: JSON com `publicados` e uma lista de PRs. Com a rampa por terminar,
todos os `acao` têm de ser `nada` e todos os `motivo` têm de começar por
`rampa:`. Se algum disser `juntar`, **pára e investiga** antes de continuar.

- [ ] **Step 3: Escrever o workflow**

Cria `.github/workflows/prazo-artigos.yml`:

```yaml
name: Prazo dos artigos

on:
  schedule:
    # Aos 17 de cada hora — fora do minuto zero, onde o GitHub tem fila.
    - cron: '17 * * * *'
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

concurrency:
  group: prazo-artigos
  cancel-in-progress: false

jobs:
  prazo:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '24'

      - name: Planear
        id: plano
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          plano=$(node scripts/prazo/index.mjs --planear)
          echo "$plano" | python3 -m json.tool
          echo "avisar=$(echo "$plano" | jq -r '[.prs[] | select(.acao=="avisar") | .numero] | join(" ")')" >> "$GITHUB_OUTPUT"
          echo "construir=$(echo "$plano" | jq -r '[.prs[] | select(.acao=="precisa-build") | .numero] | join(" ")')" >> "$GITHUB_OUTPUT"

      - name: Avisar às 24 horas
        if: steps.plano.outputs.avisar != ''
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          for numero in ${{ steps.plano.outputs.avisar }}; do
            node scripts/prazo/index.mjs --aplicar "$numero"
          done

      # Só os PRs a quem falta mesmo o build. Cada um é construído numa árvore
      # de trabalho à parte, para o `scripts/prazo/` que corre ser sempre o do
      # `main` e não o que vem dentro do PR — um PR não deve poder mudar as
      # regras pelas quais é juntado.
      - name: Construir e juntar
        if: steps.plano.outputs.construir != ''
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          set -uo pipefail
          for numero in ${{ steps.plano.outputs.construir }}; do
            echo "::group::PR #$numero"
            git fetch origin "pull/$numero/head:pr-$numero"
            git worktree add "../pr-$numero" "pr-$numero"

            verde=false
            if (cd "../pr-$numero" && npm ci && npm run build); then verde=true; fi
            echo "build do PR #$numero: verde=$verde"

            git worktree remove --force "../pr-$numero"
            BUILD_VERDE=$verde node scripts/prazo/index.mjs --aplicar "$numero"
            echo "::endgroup::"
          done
```

- [ ] **Step 4: Validar e correr os testes todos**

```bash
npx --yes @action-validator/cli .github/workflows/prazo-artigos.yml
npx vitest run
```

Expected: workflow válido; todos os testes passam

- [ ] **Step 5: Commit e PR**

```bash
git checkout -b feat/prazo-artigos
git add scripts/prazo/index.mjs .github/workflows/prazo-artigos.yml
git commit -m "feat: prazo de 48 horas com merge automático a partir do 11.º artigo"
git push -u origin feat/prazo-artigos
gh pr create --title "Prazo de 48 horas nos artigos automáticos" \
  --body "Ver docs/superpowers/specs/2026-09-28-blog-automacao-design.md"
```

- [ ] **Step 6: PARAR — confirmar que não junta nada**

Depois do merge, dispara à mão:

```bash
gh workflow run "Prazo dos artigos"
gh run watch
gh run view --log | grep -A3 'Planear'
```

Com menos de 10 artigos publicados, **todas** as linhas do plano têm de dizer
`rampa:`, e nenhum PR pode ter sido juntado. Mostra o registo ao utilizador.

Confirma também que nenhum PR foi fechado:

```bash
gh pr list --label artigo-automatico --state merged
```

Expected: vazio, ou só os que um humano juntou.

---

### Task 10: Fase A — expandir os 14 artigos

**Files:**
- Modify: `content/blog/*/pt.md`, `content/blog/*/en.md`

Esta tarefa não escreve código. É a execução da Fase A do spec, e é onde se
descobre se o gerador presta — por isso vem antes de o agendamento ficar a
correr sozinho semana após semana.

Os 14 artigos estão entre 240 e 437 palavras. Vão a 1200–1800.

- [ ] **Step 1: Confirmar o que falta**

```bash
for f in content/blog/*/pt.md; do
  printf "%-45s %s\n" "$(basename "$(dirname "$f")")" \
    "$(node -e "
      const fs=require('fs');
      import('./scripts/gerar/palavras.mjs').then(m=>console.log(m.contarPalavras(fs.readFileSync(process.argv[1],'utf-8'))))
    " "$f")"
done
```

- [ ] **Step 2: Correr o primeiro lote e PARAR**

```bash
gh workflow run "Gerar artigos" -f modo=expandir -f lote=3
gh run watch
```

Custo: cerca de **$0,90**.

O PR abre. **Não o juntes tu.** Diz ao utilizador que está pronto, dá-lhe o
link da pré-visualização, e espera que ele leia os três artigos. É este lote
que decide se o `prompt.mjs` precisa de mudar.

Se a voz não estiver bem, volta ao `scripts/gerar/prompt.mjs`, fecha o PR sem
juntar, e corre outra vez. É mais barato agora do que depois.

- [ ] **Step 3: Os restantes lotes**

Com o primeiro lote aprovado e junto, repete até não sobrarem artigos curtos.
São mais quatro lotes, cerca de **$3** no total.

```bash
gh workflow run "Gerar artigos" -f modo=expandir -f lote=3
```

Entre lotes, confirma que a contagem sobe:

```bash
node scripts/prazo/contar.mjs
```

Ao 4.º lote o contador passa dos 10 e a rampa termina — a partir daí os PRs
passam a dizer no corpo que são juntados em 48 horas. Confirma que o corpo do
PR mudou de texto. É a primeira vez que o prazo fica activo, e vale a pena
olhar.

- [ ] **Step 4: Confirmar que não sobrou nenhum curto**

```bash
gh workflow run "Gerar artigos" -f modo=expandir -f lote=3
gh run watch
```

Expected: a execução acaba sem abrir PR, com `não há artigos curtos por
expandir` no registo.

---

### Task 11: Limpeza e documentação

**Files:**
- Delete: `content/blog/_template/`
- Modify: `COMO-PUBLICAR.md`

- [ ] **Step 1: Remover o molde antigo**

O `content/blog/_template/` é do tempo da migração e já está errado: diz que o
corpo do artigo fica só em inglês, o que deixou de ser verdade quando os 14
artigos foram traduzidos. Quem quiser escrever à mão copia um artigo existente;
quem não quiser usa o gerador.

```bash
git rm -r content/blog/_template
```

- [ ] **Step 2: Documentar o circuito**

Acrescenta ao fim de `COMO-PUBLICAR.md`:

```markdown
## Artigos do blog

Os artigos são escritos pela automação. Não precisas de mexer em código para
publicar um.

**O que acontece sozinho.** Terça e sexta de manhã, uma tarefa escolhe os
próximos temas de `content/blog/_temas.yml`, escreve os artigos em português e
inglês, e abre um Pull Request com três de cada vez.

**O que te cabe a ti.** Ler. O Pull Request traz um link de pré-visualização do
Cloudflare — abre o artigo lá, como um visitante o vê, não em código. Se estiver
bom, carrega em *Merge*. Se não, escreve num comentário o que está mal.

**O prazo.** A partir do 11.º artigo publicado por esta via, um Pull Request que
fique 48 horas sem resposta é juntado sozinho. Às 24 horas recebes um aviso no
próprio PR. **Escrever qualquer coisa no PR pára o relógio** — não é preciso
aprovar nem pedir alterações formalmente, basta comentar.

Antes disso, nos primeiros 10 artigos, nada é publicado sem alguém carregar em
*Merge*. O corpo de cada PR diz em que número vai.

**Se algo for juntado que não devia.** Um `git revert` do merge repõe o blog
como estava. A mensagem que a automação deixa no PR tem a instrução.

**Sugerir temas.** Acrescenta uma entrada a `content/blog/_temas.yml` com
`estado: por-escrever`. Quando a lista esgota, a automação abre um issue a
avisar — nunca inventa assuntos.

**Correr à mão.** No separador *Actions* do GitHub, em *Gerar artigos*, carrega
em *Run workflow*. O modo `expandir` desenvolve artigos antigos que ficaram
curtos; o modo `escrever` tira temas novos da lista.
```

- [ ] **Step 3: Correr os testes e o build**

```bash
npx vitest run && npm run build
```

Expected: tudo passa. O build continua a gerar 30 páginas — o `_template` nunca
contou, porque o `loadPosts` ignora pastas que começam por `_`.

- [ ] **Step 4: Commit e PR**

```bash
git checkout -b docs/como-publicar-artigos
git add -A
git commit -m "docs: como publicar artigos, e remoção do molde obsoleto"
git push -u origin docs/como-publicar-artigos
gh pr create --title "Documentar o circuito dos artigos" --body "Fecha a Parte 2."
```
