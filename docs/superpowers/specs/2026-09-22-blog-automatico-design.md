# Blog automático — desenho

**Data:** 2026-09-22
**Estado:** aprovado no brainstorming, por rever

## O problema

O objetivo declarado é **SEO e AEO** — ser encontrado em pesquisa e ser citado por motores de resposta (ChatGPT, Perplexity, Claude, AI Overviews). A equipa não tem tempo para escrever.

A investigação revelou que o obstáculo não é a quantidade de conteúdo. É a arquitetura.

Um pedido a `https://muche-site.pages.dev/blog/visual-identity-business-asset` devolve **821 bytes**:

```html
<title>Muche — Agência Criativa</title>   <!-- igual em todos os artigos -->
<div id="root"></div>                     <!-- vazio -->
```

Zero texto do artigo. O conteúdo só existe depois de o JavaScript correr.

Consequências:

| Consumidor | Efeito |
|---|---|
| Google | Executa JS, acaba por indexar — mas em segunda passagem, mais lenta, e vê o mesmo título e descrição em todos os artigos |
| Motores de resposta (AEO) | Na maioria **não executam JavaScript**. Recebem uma página vazia. O blog, para efeitos de citação por IA, não existe |
| Partilhas sociais | Sem título nem imagem próprios por artigo |

**Implicação central:** gerar artigos com IA para dentro desta arquitetura produz zero ganho em AEO. A fundação tem de vir primeiro.

## Decisões

| Questão | Decisão |
|---|---|
| O que automatizar | Geração dos artigos por IA |
| Revisão | Rascunho → Pull Request → aprovação humana → merge publica |
| Alcance da pré-renderização | Apenas o blog |
| Idiomas | Português **e** inglês, com URLs separados |
| Ritmo | **2 artigos por semana**, agendado |
| Temas | Lista inicial de 40–60 temas, construída uma vez; a IA escolhe o próximo |

## Parte 1 — Fundação

### Conteúdo sai do código

Os artigos deixam de viver no array `POSTS` dentro do `App.tsx` e passam a ficheiros:

```
content/blog/<slug>/
  pt.md
  en.md
```

Cabeçalho de cada ficheiro: `title`, `excerpt`, `category`, `date`, `readTime`. Corpo em Markdown.

As categorias mantêm-se as que já existem em `BLOG_CATEGORIES`.

### Extração do blog do App.tsx

`App.tsx` tem 1862 linhas e contém código que só funciona no browser (`window`, `ResizeObserver`, animações). Renderizar isso no servidor falha.

Os componentes do blog — `BlogPage`, `ArticlePage` e o que deles depende — são extraídos para um módulo próprio, livre de dependências do browser.

**Isto é condição para a pré-renderização funcionar, não uma melhoria opcional.**

Requisito de verificação: capturar as páginas do blog antes da extração e comparar depois. Sem diferença visual.

### Pré-renderização

Um passo de build gera HTML estático por artigo e por idioma, contendo:

- `<title>` e `<meta name="description">` próprios de cada artigo
- **o texto completo do artigo dentro do HTML**
- JSON-LD `Article`; `FAQPage` quando o artigo responde a perguntas diretas
- `hreflang` a ligar as duas versões, e `canonical`
- tags `og:` para partilhas

### URLs

```
/blog                → índice, português
/blog/<slug>         → artigo, português
/en/blog             → índice, inglês
/en/blog/<slug>      → artigo, inglês
```

### Ficheiros de apoio

- `sitemap.xml` gerado no build, com todas as páginas e os pares `hreflang`
- `robots.txt` real em `public/` — hoje `/robots.txt` devolve o `index.html` por via do fallback de SPA

O middleware `functions/_middleware.js` já garante que os domínios `.pages.dev` e `.workers.dev` respondem com `X-Robots-Tag: noindex`, pelo que as pré-visualizações não são indexadas.

### Mudança de comportamento assumida

Hoje o site inteiro fica atrás do ecrã de carregamento até o vídeo do hero descarregar. Numa página de artigo pré-renderizada, o texto aparece imediatamente, antes de o JavaScript arrancar.

É deliberado — é o que torna o conteúdo visível a crawlers — mas é uma diferença de experiência face ao que existe hoje.

## Parte 2 — Automação

### Lista de temas

```
content/blog/_temas.yml
```

40–60 entradas, cada uma com tema, ângulo, prioridade e estado. Orientadas a perguntas de pesquisa real ("quanto custa um vídeo institucional", "o que leva um manual de marca").

Primeiro rascunho proposto pela Claude, organizado por serviço e por prioridade; a equipa corta e ajusta.

Quando a lista esgotar, a automação **avisa** em vez de inventar temas.

### Tarefa agendada

Uma GitHub Action corre **duas vezes por semana**:

1. Escolhe o próximo tema por prioridade
2. Escreve as versões PT e EN
3. Escreve os ficheiros em `content/blog/<slug>/`
4. Cria branch e abre Pull Request
5. O Cloudflare Pages gera a pré-visualização automaticamente

Requer `ANTHROPIC_API_KEY` como secret do repositório. Custo por artigo na ordem dos cêntimos.

### Revisão

A equipa lê o artigo **no site de pré-visualização**, não em código. Aprova e faz merge. O merge publica, pelo circuito já montado.

O `main` está protegido: Pull Request obrigatório, uma aprovação.

## Fora de âmbito

- **Os 14 artigos existentes** só têm corpo em inglês. Passam para `/en/blog/<slug>` e continuam a funcionar. As versões portuguesas podem ser geradas depois pela mesma pipeline.
- **Pré-renderização do resto do site** (home, serviços, equipa). Fica como está.
- **Escolha de temas para além da lista.**

## Riscos

**Ritmo e políticas anti-spam.** Dois artigos por semana em dois idiomas são ~200 páginas novas por ano. A política de *scaled content abuse* do Google não penaliza conteúdo por ser gerado por IA — penaliza conteúdo produzido em escala sem valor real. A proteção é a qualidade e a utilidade dos artigos, que só se pode avaliar depois dos primeiros.

Foi recomendado arrancar a 1 por semana durante 4–6 semanas para afinar o estilo, e subir a 2 depois. **A equipa optou por arrancar a 2 por semana.** Fica registado.

**Carga de revisão.** Dois artigos por semana, em dois idiomas, é revisão recorrente. Se os rascunhos se acumularem por rever, o problema deixa de ser técnico.

**Qualidade ainda por demonstrar.** Nenhum artigo foi gerado. O estilo e a utilidade são hipóteses até o primeiro lote existir.

## Critérios de sucesso

1. Um pedido a uma URL de artigo devolve HTML com o texto completo, sem executar JavaScript
2. Cada artigo tem título e descrição próprios
3. `sitemap.xml` e `robots.txt` servidos corretamente em produção
4. Sem diferença visual nas páginas do blog face ao que existe hoje
5. A tarefa agendada abre um PR com pré-visualização funcional
