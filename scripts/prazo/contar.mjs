#!/usr/bin/env node
/* Imprime quantos artigos a automação já publicou. Usado pelos dois workflows
   e útil à mão, para perceber onde a rampa vai.

   Se a etiqueta ainda não existir no repositório, o `gh pr list --label` não
   dá erro: devolve uma lista vazia, e o total é 0. É a resposta certa — ainda
   não saiu nenhum artigo. Qualquer outra falha do `gh` (sem sessão, sem rede)
   rebenta de propósito: imprimir 0 por engano seria dizer «a rampa ainda não
   acabou» sem o saber. */
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
