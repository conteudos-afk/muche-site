#!/usr/bin/env node
/* Imprime quantos artigos a automação já publicou. Usado pelos dois workflows
   e útil à mão, para perceber onde a rampa vai.

   Se a etiqueta ainda não existir no repositório, o `gh pr list --label` não
   dá erro: devolve uma lista vazia, e o total é 0. É a resposta certa — ainda
   não saiu nenhum artigo. Qualquer outra falha do `gh` (sem sessão, sem rede)
   rebenta de propósito: imprimir 0 por engano seria dizer «a rampa ainda não
   acabou» sem o saber. */
import { execFileSync } from 'node:child_process'
import { artigosPublicados } from './contador.mjs'

const ghJson = args => JSON.parse(execFileSync('gh', args, { encoding: 'utf-8' }))

console.log(artigosPublicados(ghJson))
