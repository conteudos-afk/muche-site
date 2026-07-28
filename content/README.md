# Como acrescentar conteúdo ao site

Esta pasta é o "inbox" de conteúdo novo. Cria uma subpasta por cada item novo,
copia o `info.md` do `_template` correspondente, preenche os campos, e junta
os ficheiros de imagem/vídeo ao lado. Depois pede à Claude para "processar
a pasta content/..." — ela trata do resto (código, traduções, verificação).

Não uses o Google Drive como pasta de trabalho — tem de estar aqui, localmente,
fora de qualquer pasta sincronizada na cloud (Drive/Dropbox/iCloud).

## Trabalhos (portfólio) — `content/work/<slug>/`
- `info.md` (copiar de `_template`)
- 1 imagem ou vídeo de capa (qualquer nome, ex: `cover.jpg` ou `cover.mp4`)

## Equipa — `content/team/<slug>/`
- `info.md` (copiar de `_template`)
- 1 fotografia (`photo.png` ou `.jpg`). Se quiseres o efeito de recorte em
  camadas como os membros atuais, envia as camadas separadas (base + recortes)
  e eu adapto — senão uso a foto normal.

## Blog — `content/blog/<slug>/`
- `info.md` (copiar de `_template`)
- `body.md` (o texto do artigo, em inglês — a versão em português dos artigos
  ainda não está feita, ver nota no `info.md`)

## Depois de preencher
Diz-me algo como: "processa a pasta content/work/nome-do-cliente" e eu:
1. Copio os ficheiros para o sítio certo no projeto
2. Escrevo o código (imports + entradas nos arrays)
3. Traduzo para PT/EN
4. Verifico no browser que aparece bem
5. Aviso-te quando estiver pronto
