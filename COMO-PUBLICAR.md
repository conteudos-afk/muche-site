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
nenhum — fica calada e a execução aparece a verde. Junta ou fecha esse, e a
execução seguinte avança.

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
- Deixares uma revisão (*Review*).
- Passares o PR a rascunho (*Draft*).

Um comentário ou uma revisão param-no **para sempre**: o relógio não recomeça, e
o PR só sai quando alguém carregar em *Merge* ou o fechar. O rascunho pára-o só
enquanto o PR for rascunho.

Corrigir um ficheiro no próprio PR **não** pára o relógio. Se o fizeres, escreve
também um comentário.

**Um Pull Request de artigos só pode conter artigos.** Isto é, só os ficheiros
`content/blog/<nome-do-artigo>/pt.md` e `en.md`, e a lista de temas
`content/blog/_temas.yml`. Se acrescentares ao PR qualquer outra coisa — uma
imagem, uma correção ao site, um artigo apagado ou renomeado —, ele deixa de
ser juntado sozinho, sem aviso nenhum: fica à espera de ti. O mesmo vale para
PRs de outra pessoa (não vindos deste repositório) e para PRs que só alteram
artigos que já existiam, como os do modo `expandir` (ver abaixo). Se alguma
vez um PR de artigos não se juntar e não perceberes porquê, procura no
separador *Actions* a execução *Prazo dos artigos*: cada PR tem lá escrito o
motivo.

**Se algo for juntado que não devia.** Abre o PR já juntado e carrega em
*Revert*: o GitHub abre outro PR que desfaz tudo, e esse junta-se à mão. (Quem
usar o terminal pode fazer um `git revert` do merge.) O tema volta à lista
como `por-escrever`, por isso a automação vai escrevê-lo outra vez — se não o
quiseres, apaga-o de `content/blog/_temas.yml` nesse mesmo PR. Se quiseres
travar tudo enquanto resolves, em *Actions* desativa o *Prazo dos artigos*
(menu `…`, *Disable workflow*): nada é juntado sozinho até o voltares a ativar.
Fechar um PR sem o juntar também devolve os temas dele à fila.

**Sugerir temas.** Acrescenta uma entrada a `content/blog/_temas.yml` com
`estado: por-escrever` (copia uma das que lá estão). Quando a lista esgota, a
automação abre um issue a avisar — nunca inventa assuntos.

**Correr à mão.** No separador *Actions* do GitHub, em *Gerar artigos*, carrega
em *Run workflow*. O modo `escrever` tira temas novos da lista. O modo
`expandir` desenvolve artigos antigos que ficaram curtos, e esses PRs nunca se
juntam sozinhos: são sempre à mão.

**Escrever um artigo à mão.** Copia a pasta de um artigo existente em
`content/blog/`, muda-lhe o nome (é o endereço do artigo) e reescreve o
`pt.md` e o `en.md`, cabeçalho incluído. Nesse caso o tempo de leitura
(`readTime`) escreve-se à mão; nos artigos da automação é calculado a partir do
texto. Abre um PR como qualquer outro: esses nunca se juntam sozinhos.

**Passaram semanas e não apareceu nada?** O GitHub desliga as tarefas agendadas
de um repositório sem atividade durante 60 dias. Em *Actions*, procura o aviso
a dizer que o workflow foi desativado e volta a ativá-lo.
