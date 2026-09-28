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
- **português europeu.** «ecrã», nunca «tela». «telemóvel», nunca «celular». «a gravar», nunca «gravando».
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
