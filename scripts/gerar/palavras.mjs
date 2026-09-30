/* ─── Contagem de palavras ───────────────────────────────────────────────────
   O spec fixa o artigo entre 1200 e 1800 palavras, e essa é a única medida
   objectiva que temos sobre o que sai do modelo. Conta-se o que um leitor lê:
   sem frontmatter, sem marcadores de Markdown, sem os endereços das ligações.
   Um `##` a mais não é uma palavra.

   Um comentário HTML (`<!-- ... -->`) também não é: não aparece na página
   renderizada, por isso não pode servir para almofadar um artigo curto até
   ao mínimo.

   Um `<!--` sem `-->` a fechar — uma resposta cortada ou malformada a meio
   do comentário — não pode reabrir a mesma fuga: sem isto, tudo o que vem
   depois do `<!--` por fechar contava como prosa. Por isso, depois de tirar
   os comentários fechados, tira-se também um `<!--` solto até ao fim do
   texto.

   A ORDEM AQUI IMPORTA e já rebentou uma vez: os comentários têm de ser
   tirados DEPOIS dos blocos de código, nunca antes. Um `<!--` por fechar
   dentro de uma vedação de código (` ``` `) é, à letra, um comentário sem
   `-->` até ao fim da resposta — e se a limpeza de comentários corresse
   primeiro, essa fuga "comia" a vedação inteira e todo o texto a seguir a
   ela, incluindo prosa real depois do bloco de código. Um artigo bom podia
   assim cair abaixo do mínimo e ser rejeitado sem razão — o espelho do erro
   original, e mais difícil de notar: um artigo bom rejeitado parece o
   gerador a ser rigoroso, não um bug. Com os blocos de código já fora do
   texto primeiro, um `<!--` que sobra só pode ser mesmo prosa do artigo. ── */

export const MIN_PALAVRAS = 1200
export const MAX_PALAVRAS = 1800

export function contarPalavras(markdown) {
  const texto = String(markdown)
    /* Frontmatter */
    .replace(/^﻿?---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/, '')
    /* Blocos e trechos de código — antes dos comentários, ver nota acima */
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    /* Comentários HTML, de uma linha ou de várias, fechados */
    .replace(/<!--[\s\S]*?-->/g, ' ')
    /* Um `<!--` que nunca fecha: tira-se até ao fim do texto */
    .replace(/<!--[\s\S]*$/, ' ')
    /* Ligações e imagens: as imagens têm de ser tiradas antes das
       ligações, não depois — `![alt](url)` também coincide com o padrão
       de ligação `[texto](url)` a partir do `[`. Se a ligação corresse
       primeiro, "comia" só o `[alt](url)` e deixava o `!` solto, com o
       texto alternativo da imagem a contar como palavras a mais. */
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    /* Marcadores de título, citação, lista e ênfase. Estes quatro não
       dependem uns dos outros: um marcador que uma regra revele só depois
       de outra já ter corrido (por exemplo um `#` dentro de uma citação)
       fica sem letras nem números, e o filtro de palavras abaixo já o
       ignora — por isso a ordem entre eles não muda a contagem final. */
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, '')
    .replace(/^[ \t]*>[ \t]?/gm, '')
    .replace(/^[ \t]*(?:[-*+]|\d+\.)[ \t]+/gm, '')
    .replace(/[*_~]/g, '')

  return texto.split(/\s+/).filter(p => /[\p{L}\p{N}]/u.test(p)).length
}

export function dentroDoIntervalo(palavras) {
  return palavras >= MIN_PALAVRAS && palavras <= MAX_PALAVRAS
}
