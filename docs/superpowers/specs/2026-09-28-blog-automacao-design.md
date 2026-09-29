# Blog automático — Parte 2: automação — desenho

**Data:** 2026-09-28
**Estado:** aprovado no brainstorming, por rever
**Depende de:** [fundação](2026-09-22-blog-automatico-design.md), em produção desde 2026-09-28

## O que já existe

A fundação está no ar. Os artigos são servidos como HTML estático com título, descrição, `canonical`, `hreflang` e JSON-LD próprios; há `sitemap.xml` com 30 entradas e `robots.txt`; os 14 artigos existem em português e inglês, em `content/blog/<slug>/{pt,en}.md`.

O `npm run build` valida os artigos e **falha** se algum tiver campo vazio, categoria fora da lista, ou frontmatter que o leitor não entenda. Essa validação é a rede por baixo de tudo o que se segue.

## O problema desta parte

Escrever artigos consome tempo que a equipa não tem. O objetivo é que o blog cresça sem isso — mantendo revisão humana antes de qualquer coisa ser publicada.

## Decisões

| Questão | Decisão |
|---|---|
| Dimensão dos artigos | **1200–1800 palavras** |
| Imagens | **Nenhuma.** Estrutura — subtítulos, listas, destaques |
| Artigos existentes (~380 palavras) | **Expandir todos** antes de o blog crescer |
| Lote de revisão | **3 artigos por Pull Request** |
| Ritmo dos artigos novos | **2 por semana**, agendado |
| Arranque | **Fase A e Fase B em paralelo**, desde o início |
| Modelo | **Claude Opus 5** |
| Merge | Humano nos primeiros 10 artigos; **prazo de 48h** a partir do 11.º |
| Idiomas | Português e inglês, ambos gerados na mesma execução |

## Arquitetura

### Um gerador, dois modos

A diferença entre expandir e escrever é apenas de onde vem a matéria-prima:

```
modo expandir  →  lê content/blog/<slug>/{pt,en}.md  →  desenvolve para 1200–1800 palavras
modo escrever  →  lê o próximo tema de _temas.yml    →  escreve de raiz
```

Tudo o resto é partilhado: a mesma voz, o mesmo formato, a mesma validação, o mesmo mecanismo de Pull Request. Isto não é economia de código — é o que garante que os artigos novos saem com a mesma voz dos antigos, porque a máquina é a mesma.

### Como a voz se mantém

O gerador lê **três artigos já aprovados do próprio repositório** e usa-os como referência de estilo, em vez de seguir uma descrição abstrata de tom.

Este método já foi validado: as traduções dos 14 artigos foram feitas com o primeiro artigo aprovado como norma, e o resultado foi aceite sem correções de tom.

As regras explícitas, validadas na revisão dessas traduções:

- Tratamento por **tu**, incluindo nos títulos
- **Português europeu** — «ecrã», não «tela»; «telemóvel», não «celular»
- **Novo Acordo Ortográfico** — «diretor», não «director»; «objetivo», não «objectivo». O primeiro artigo gerado saiu no antigo, e misturado, porque a regra não existia em lado nenhum — e porque o próprio prompt estava escrito no antigo
- Termos do ofício em inglês quando é isso que se usa em Portugal: *branding*, *storytelling*, *podcast*, *design*
- **«vídeo de marca»**, nunca «filme de marca» nem «vídeo institucional»
- **Sem estatísticas sem fonte.** Dois artigos tinham-nas e foram corrigidos; o gerador não as deve introduzir

### O que o modelo não decide

O `readTime` é calculado em código, a partir da contagem real de palavras. Era
pedido ao modelo, e o primeiro artigo saiu com «5 min read» para 1543 palavras —
contar palavras que acabou de escrever e dividir por 200 não é o que um modelo de
linguagem faz bem, e não há razão para lho pedir.

O mesmo princípio vale para o resto: ao modelo pede-se o que só ele sabe fazer.

### A lista de temas

```
content/blog/_temas.yml
```

40 a 60 entradas, cada uma com tema, ângulo, prioridade e estado. Orientadas a perguntas de pesquisa real: «quanto custa um vídeo institucional», «o que leva um manual de marca».

Primeiro rascunho proposto pela Claude, a partir dos serviços da agência; a equipa corta e ajusta. É o único trabalho da equipa que não é rever.

Quando a lista esgotar, a automação **abre um issue a avisar**. Não inventa temas.

### O que corre, e quando

**Fase A — expandir os 14.** Sem agendamento. Dispara-se à mão, um lote de três de cada vez. Cinco lotes.

**Fase B — escrever novos.** GitHub Action agendada, duas vezes por semana:

1. Lê `_temas.yml`, escolhe o tema seguinte por prioridade
2. Escreve as versões PT e EN
3. Escreve os ficheiros, marca o tema como usado
4. Abre Pull Request

Em ambos os modos, o `CODEOWNERS` pede revisão automaticamente e o Cloudflare Pages gera a pré-visualização.

### Revisão, e o prazo de 48 horas

A equipa lê o artigo **no site de pré-visualização**, não em código. Aprova e faz merge. O merge publica, pelo circuito já montado.

Para os Pull Requests não se acumularem por rever — o risco principal deste desenho — há um **prazo de 48 horas**, introduzido por etapas:

| Etapa | Comportamento |
|---|---|
| **Artigos 1 a 10** | Merge só por humano. Sem prazo, sem automático |
| **Artigo 11 em diante** | Aviso às 24h; merge automático às 48h se ninguém tiver reagido |

Qualquer comentário no Pull Request **trava o relógio**. Não é preciso aprovar formalmente nem pedir alterações: escrever qualquer coisa basta.

O Pull Request mostra sempre em que ponto está — «artigo 4 de 10 antes do prazo automático» — para a transição não acontecer sem ninguém reparar.

**Porquê a rampa.** O prazo faz «sem resposta» significar «aprovado», e as duas situações em que ninguém responde — férias, semana cheia — são exatamente aquelas em que ninguém está a olhar para o que sai em nome da agência. Os primeiros 10 artigos são onde se descobre o que o gerador faz mal, e é onde vale a pena estar a olhar. Passada essa fase, o prazo deixa de ser um salto de fé.

Foi uma decisão consciente da equipa, depois de discutida a alternativa de aplicar o prazo desde o primeiro artigo.

**Correção ao spec da fundação:** esse documento afirma que o `main` exige uma aprovação. Já não exige — a proteção foi baixada para zero aprovações a 2026-09-25, mantendo o Pull Request obrigatório. Nos primeiros 10 artigos a automação abre PR mas não faz merge, por isso continua a ser preciso um humano; o que mudou é que já não é preciso um segundo humano. A partir do 11.º, o prazo de 48 horas acima substitui esse humano quando ninguém reage.

## Quando algo corre mal

| Situação | O que acontece |
|---|---|
| Lista de temas esgotada | Abre um issue a avisar. Não inventa temas |
| Erro da API | A tarefa falha e há notificação |
| Campo em falta ou categoria inválida | O build falha — validação já existente |
| Slug repetido | O gerador recusa antes de escrever |
| Artigo fora do intervalo de palavras | O gerador tenta uma vez; se falhar, abre o PR com aviso |
| Build falha no PR | O prazo não corre. Merge automático só com o build verde |

## Custo

| | |
|---|---|
| Por artigo (PT + EN, Opus 5) | **$0,37** — medido, não estimado |
| Fase A, uma vez | ~$5,20 |
| Fase B, um ano a 2/semana (104 artigos × $0,37) | ~$38 |
| GitHub Actions | $0 — repositório público, minutos ilimitados |
| Cloudflare Pages | $0 — dentro do plano gratuito |

O primeiro artigo real custou $0,37, contra os $0,30 estimados. Os valores acima
já são os corrigidos. O gerador calcula o custo a partir dos tokens que a API
devolve, por isso cada execução diz o que gastou.

Requer `ANTHROPIC_API_KEY` como secret do repositório, criada pelo dono do site.

*Prompt caching* foi considerado e rejeitado: cortaria ~90% da entrada, mas a entrada são $0,05 dos $0,37. Poupava cêntimos e acrescentava complexidade.

## Fora de âmbito

- **Imagens nos artigos.** Decisão explícita: estrutura resolve a legibilidade, e imagens de stock genéricas num site de agência criativa contradizem o que a agência vende.
- **Escolha automática de temas para além da lista.**
- **Publicação sem revisão possível.** Mesmo com o prazo de 48 horas, o artigo fica sempre visível em pré-visualização e travável por qualquer comentário. O que o prazo automatiza é o silêncio, não a revisão.
- **Promoção do conteúdo** — redes sociais, newsletter.

## Riscos

**Carga de revisão.** Dois artigos novos por semana, mais os lotes de expansão a correr em paralelo, é bastante leitura numa equipa que declarou falta de tempo. Os 14 artigos da Fase A são cerca de 42 mil palavras, umas sete horas de leitura atenta. Os lotes de três existem para tornar isso gerível, não para o eliminar. O prazo de 48 horas, a partir do 11.º artigo, impede que a acumulação pare o blog — mas em troca faz «sem resposta» valer como aprovação, que é um risco diferente e não menor.

**Ritmo e políticas anti-spam.** ~100 artigos por ano em dois idiomas são ~200 páginas novas. A política de *scaled content abuse* do Google não penaliza conteúdo por ser gerado por IA — penaliza conteúdo em escala sem valor real. A proteção é a qualidade e a utilidade, avaliáveis só depois dos primeiros.

**Qualidade por demonstrar.** Nenhum artigo foi gerado de raiz. As traduções saíram boas, mas traduzir é uma tarefa muito mais restrita do que escrever. A Fase A serve também de calibração: expandir material existente é mais restrito do que escrever do zero, e dá para afinar o estilo antes de a Fase B produzir.

## Critérios de sucesso

1. Um artigo gerado passa a validação do build sem intervenção
2. O artigo sai entre 1200 e 1800 palavras, nas duas línguas
3. O PR abre com pré-visualização funcional e revisão pedida automaticamente
4. A voz é indistinguível dos artigos aprovados — avaliado por leitura, não por métrica
5. Com a lista esgotada, a automação avisa em vez de inventar
6. O prazo de 48h não corre antes do 11.º artigo, e um comentário trava-o
