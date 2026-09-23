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
