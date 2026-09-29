# Como publicar alterações no site

O site é publicado **automaticamente** a partir do branch `main`.

```
cria um branch  →  abre Pull Request  →  merge no main  →  publica sozinho
```

Não é preciso correr nenhum comando de deploy. O Cloudflare Pages trata disso.

## Ver o trabalho antes de publicar

Cada Pull Request gera um endereço de pré-visualização próprio, com o site
completo. O link aparece no próprio PR. É aí que se confirma o trabalho —
não é preciso publicar para ver.

## O que NÃO fazer

**Não corras `wrangler deploy`.** Esse comando publicava num Worker antigo
que já não é o site, de antes de passarmos para Cloudflare Pages. O
`wrangler.jsonc` que o tornava possível foi removido precisamente para
evitar a confusão.

Se alguma vez vires alterações tuas em `muche-site.conteudos.workers.dev`
mas não em `www.muche.pt`, foi isso que aconteceu: falta o merge.

## Onde vive o site

| | |
|---|---|
| Produção | https://www.muche.pt |
| Projeto Cloudflare Pages | `muche-site`, ligado a este repositório |
| Branch de produção | `main` |

## Artigos do blog

Os artigos são escritos pela automação. Não precisas de mexer em código para
publicar um.

**O que acontece sozinho.** À terça e à sexta de manhã, uma tarefa escolhe os
próximos temas de `content/blog/_temas.yml` (por ordem de prioridade), escreve
os artigos em português e em inglês, e abre um Pull Request com três de cada
vez. Se já houver um Pull Request de artigos por juntar, não escreve mais
nenhum: a execução acaba a verde e o resumo dela diz quantos estão abertos e
que juntá-los ou fechá-los deixa a seguinte avançar. Um PR esquecido pausa
assim o circuito, e o resumo repete-o todas as terças e sextas — mas só o vê
quem abrir o separador *Actions* (a execução é verde, não chega nenhum aviso).

**O que te cabe a ti.** Ler. O Pull Request traz um link de pré-visualização do
Cloudflare — abre o artigo lá, como um visitante o vê, não em código. Se estiver
bom, carrega em *Merge*. Se não, escreve num comentário o que está mal.

**O prazo.** Um Pull Request de artigos que fique 48 horas sem resposta é
juntado sozinho, e às 24 horas recebes um aviso no próprio PR. O aviso é
condição: sem ele, nada é juntado. Se um PR já passou das 48 horas sem o ter
recebido, recebe-o primeiro e só é juntado uma hora depois, no mínimo. A
verificação corre de hora a hora, e só junta se o site compilar sem erros.

**Mas só depois dos primeiros artigos.** O prazo automático só começa quando já
houver **mais de 10 artigos publicados por esta via** — e só contam os que uma
pessoa já juntou, não os do PR que está a ser avaliado. Com lotes de três, na
prática são quatro PRs juntados por ti (12 artigos); o quinto é o primeiro que
se junta sozinho. Os artigos que já estavam no site antes da automação não
contam. O corpo de cada PR diz em que número vai.

**O que pára o relógio.**

- Escreveres um comentário no PR, seja qual for. Não é preciso aprovar nem
  pedir alterações formalmente. Os comentários automáticos (Cloudflare,
  GitHub) não contam.
- Deixares uma revisão (aprovar ou pedir alterações).
- Passares o PR a rascunho.

Um comentário ou uma revisão param-no **para sempre**. É de propósito: não há
maneira de o reiniciar, e o PR só sai quando uma pessoa carregar em *Merge* ou o
fechar — não esperes por uma junção automática que não vem. O rascunho pára-o só
enquanto o PR for rascunho.

Mandar uma correção para o PR (um commit) **não** pára o relógio, e as 48 horas
contam desde que o PR foi aberto, não desde a última alteração: quem mandar uma
correção à hora 47 tem uma hora até o PR se juntar. O que compra tempo é
escrever um comentário.

**Um Pull Request de artigos só pode conter artigos.** Isto é, só os ficheiros
`content/blog/<nome-do-artigo>/pt.md` e `en.md`, e a lista de temas
`content/blog/_temas.yml`. Se acrescentares ao PR qualquer outra coisa — uma
imagem, uma correção ao site, um artigo apagado ou renomeado —, ele deixa de
ser juntado sozinho, sem aviso nenhum: fica à espera de ti. O mesmo vale para
PRs que não venham deste repositório. Se alguma vez um PR de artigos não se
juntar e não perceberes porquê, procura no separador *Actions* a execução
*Prazo dos artigos*: cada PR tem lá escrito o motivo.

**Artigos que já estão no site só são republicados por uma pessoa.** O prazo
de 48 horas vale para artigos novos. Um PR que reescreve artigos já
publicados — é o que faz o modo `expandir` — nunca se junta sozinho, por muito
que espere, e, como qualquer PR de artigos aberto, pausa a geração até alguém
o juntar ou fechar.

**Se algo for juntado que não devia.** Reverte o merge: a página do PR já
juntado oferece essa ação, e o GitHub abre outro PR que desfaz tudo, que se
junta à mão (quem usar o terminal pode fazer um `git revert`). Isto desfaz a
publicação, mas o tema volta à lista como `por-escrever`, e um artigo novo
sobre o mesmo assunto vai aparecer numa das próximas rondas. Se o queres fora
para sempre, apaga também o tema de `content/blog/_temas.yml`, nesse mesmo PR.
A contagem dos 10 artigos da rampa não desce com o revert. Para travar tudo
enquanto resolves, desativa o workflow *Prazo dos artigos* na página dele, em
*Actions*: nada é juntado sozinho até o voltares a ativar. Fechar um PR sem o
juntar também devolve os temas dele à fila.

**Sugerir temas.** Acrescenta uma entrada a `content/blog/_temas.yml` com
`estado: por-escrever` (copia uma das que lá estão). Quando a lista esgota, a
automação abre um issue a avisar — nunca inventa assuntos.

**Correr à mão.** No separador *Actions* do GitHub, em *Gerar artigos*, carrega
em *Run workflow*. O modo `escrever` tira temas novos da lista. O modo
`expandir` desenvolve artigos antigos que ficaram curtos, e esses PRs juntam-se
sempre à mão (ver acima).

**Escrever um artigo à mão.** Copia a pasta de um artigo existente em
`content/blog/`, muda-lhe o nome (é o endereço do artigo) e reescreve o
`pt.md` e o `en.md`, cabeçalho incluído. Nesse caso o tempo de leitura
(`readTime`) escreve-se à mão; nos artigos da automação é calculado a partir do
texto. Abre um PR como qualquer outro: esses nunca se juntam sozinhos.

**Passaram semanas e não apareceu nada?** O GitHub desliga as tarefas agendadas
de um repositório sem atividade durante 60 dias. Em *Actions*, procura o aviso
a dizer que o workflow foi desativado e volta a ativá-lo.
