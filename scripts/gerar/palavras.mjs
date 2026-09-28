/* ─── Contagem de palavras ───────────────────────────────────────────────────
   O spec fixa o artigo entre 1200 e 1800 palavras, e essa é a única medida
   objectiva que temos sobre o que sai do modelo. Conta-se o que um leitor lê:
   sem frontmatter, sem marcadores de Markdown, sem os endereços das ligações.
   Um `##` a mais não é uma palavra.

   Um comentário HTML (`<!-- ... -->`) também não é: não aparece na página
   renderizada, por isso não pode servir para almofadar um artigo curto até
   ao mínimo. Tira-se antes do resto, para que o texto lá dentro não escape
   às outras limpezas (por exemplo, se tiver a sua própria vedação de
   código). ─────────────────────────────────────────────────────────────── */

export const MIN_PALAVRAS = 1200
export const MAX_PALAVRAS = 1800

export function contarPalavras(markdown) {
  const texto = String(markdown)
    /* Frontmatter */
    .replace(/^﻿?---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/, '')
    /* Comentários HTML, de uma linha ou de várias */
    .replace(/<!--[\s\S]*?-->/g, ' ')
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
