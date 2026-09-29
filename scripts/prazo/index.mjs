#!/usr/bin/env node
/* ─── Aplicar o prazo ────────────────────────────────────────────────────────
   Dois modos, e a separação existe por causa do custo. O `--planear` só lê:
   percorre os PRs abertos e diz o que faria a cada um, sem nunca construir
   nada. O workflow olha para esse plano e só corre o build nos PRs que
   devolveram `precisa-build`. Depois volta cá com `--aplicar`, um de cada vez.

   Sem esta divisão, correr o prazo de hora a hora significava construir todos
   os PRs abertos 24 vezes por dia — incluindo os que estão travados por um
   comentário e não vão a lado nenhum.

   O `--aplicar` volta a ler e a decidir em vez de confiar no plano, porque
   entre as duas fases passou tempo (um build demora minutos) e alguém pode
   ter comentado nesse intervalo.

   O que sai em cada execução, para cada PR, é a decisão e o motivo — mesmo
   quando a decisão é `nada`. O `decidir` devolve `nada` perante qualquer dado
   com a forma errada, e é assim que deve ser; mas isso quer dizer que um campo
   que mude de formato faz a funcionalidade calar-se para sempre, e o motivo é
   o único rasto. Vai para o registo (stderr) e para o resumo da execução.
   O stdout do `--planear` é só o JSON: o workflow lê-o. ─────────────────── */
import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { decidir, ARTIGOS_ANTES_DO_AUTOMATICO } from './decidir.mjs'
import { contarArtigos, MARCA_AVISO, ETIQUETA, ehBot } from './contador.mjs'

/* O `gh` não lê `GITHUB_REPOSITORY`: descobre o repositório pelo `git remote`
   da pasta atual. No workflow a pasta é o checkout e daria certo, mas é uma
   coincidência; por isso, com a variável presente, o `--repo` é explícito.
   À mão, sem a variável, vale o remoto da pasta. */
const REPO = process.env.GITHUB_REPOSITORY
const gh = args => execFileSync('gh', REPO ? [...args, '--repo', REPO] : args, { encoding: 'utf-8' })
const ghJson = args => JSON.parse(gh(args))

const humano = quem => !ehBot(quem?.login)

function registar(linha) {
  console.error(`[prazo] ${linha}`)
  const resumo = process.env.GITHUB_STEP_SUMMARY
  if (!resumo) return
  try { appendFileSync(resumo, `- ${linha}\n`) } catch { /* o resumo é um extra; o registo já saiu */ }
}

const primeiraLinha = erro => String(erro?.message ?? erro).split('\n')[0]

function lerPr(numero, buildVerde) {
  const pr = ghJson([
    'pr', 'view', String(numero),
    '--json', 'number,createdAt,isDraft,comments,reviews,files',
  ])

  return {
    numero: pr.number,
    criadoEm: pr.createdAt,
    artigos: contarArtigos(pr.files),
    comentariosHumanos: pr.comments.filter(c => humano(c.author)).length,
    revisoes: pr.reviews.filter(r => humano(r.author)).length,
    jaAvisado: pr.comments.some(c => c.body?.includes(MARCA_AVISO)),
    rascunho: pr.isDraft,
    buildVerde,
  }
}

/* Lê `path` e `changeType`, e conta só os `ADDED` — ver o `contador.mjs`. Se
   isto voltar a pedir só `files` sem o `changeType`, a contagem passa a incluir
   edições e apagamentos, e a rampa avança sem artigos novos. */
function artigosPublicados() {
  const juntados = ghJson([
    'pr', 'list', '--state', 'merged', '--label', ETIQUETA,
    '--limit', '100', '--json', 'number',
  ])
  return juntados.reduce((soma, pr) => {
    const { files } = ghJson(['pr', 'view', String(pr.number), '--json', 'files'])
    return soma + contarArtigos(files)
  }, 0)
}

function abertos() {
  return ghJson([
    'pr', 'list', '--state', 'open', '--label', ETIQUETA,
    '--limit', '50', '--json', 'number',
  ]).map(p => p.number)
}

function avisar(numero, publicados) {
  gh(['pr', 'comment', String(numero), '--body', `${MARCA_AVISO}
Faltam **24 horas** para este PR ser juntado automaticamente.

Para travar o relógio basta escrever aqui qualquer coisa — não é preciso aprovar nem pedir alterações.

_Artigos publicados por esta via: ${publicados}. O prazo automático corre acima de ${ARTIGOS_ANTES_DO_AUTOMATICO}._`])
}

/* `--match-head-commit`: o merge só acontece se a ponta do PR for exatamente o
   commit que foi construído. Se alguém empurrar código novo entre o build e
   aqui, o `gh` recusa, e o que foi para o `main` nunca é algo que não passou
   pelo build.

   O merge vem antes do comentário. Ao contrário, um merge que falhe (conflito,
   ramo protegido) deixava um «a juntar» por cima do PR a cada hora. */
function juntar(numero, motivo, commit) {
  gh(['pr', 'merge', String(numero), '--squash', '--delete-branch', '--match-head-commit', commit])
  try {
    gh(['pr', 'comment', String(numero), '--body',
      `Juntado automaticamente: ${motivo}.\n\nSe isto não devia ter acontecido, um \`git revert\` deste merge repõe o blog como estava.`])
  } catch (erro) {
    registar(`PR #${numero}: juntado, mas o comentário falhou — ${primeiraLinha(erro)}`)
  }
}

function planear() {
  const numeros = abertos()
  if (numeros.length === 0) {
    registar('nenhum PR aberto com a etiqueta — nada a decidir')
    /* `null` e não 0: com nada para decidir não se contou coisa nenhuma. */
    console.log(JSON.stringify({ publicados: null, prs: [] }))
    return
  }

  const publicados = artigosPublicados()
  registar(`${publicados} artigos publicados por esta via; ${numeros.length} PR(s) abertos`)

  const agora = new Date()
  const prs = numeros.map(numero => {
    let decisao
    try {
      /* `null` no build: o plano é feito sem construir nada. */
      decisao = decidir({ pr: lerPr(numero, null), artigosPublicados: publicados, agora })
    } catch (erro) {
      /* Um PR que não se consegue ler não pode impedir os outros, nem ser
         juntado: fica em `nada`, com a razão escrita. */
      decisao = { acao: 'nada', motivo: `erro ao ler o PR — ${primeiraLinha(erro)}` }
    }
    registar(`PR #${numero}: ${decisao.acao} — ${decisao.motivo}`)
    return { numero, acao: decisao.acao, motivo: decisao.motivo }
  })

  console.log(JSON.stringify({ publicados, prs }))
}

function aplicar(numero) {
  const publicados = artigosPublicados()
  const verde = process.env.BUILD_VERDE === 'true' ? true
    : process.env.BUILD_VERDE === 'false' ? false
    : null

  const { acao, motivo } = decidir({ pr: lerPr(numero, verde), artigosPublicados: publicados, agora: new Date() })
  registar(`PR #${numero}: ${acao} — ${motivo}`)

  if (acao === 'avisar') {
    avisar(numero, publicados)
  } else if (acao === 'juntar') {
    const commit = process.env.COMMIT_CONSTRUIDO ?? ''
    if (!/^[0-9a-f]{40}$/.test(commit)) {
      throw new Error(`COMMIT_CONSTRUIDO em falta ou inválido (${JSON.stringify(commit)}) — não se junta um PR sem saber que commit foi construído`)
    }
    juntar(numero, motivo, commit)
  }
}

const argv = process.argv.slice(2)
try {
  if (argv[0] === '--planear') {
    planear()
  } else if (argv[0] === '--aplicar' && Number.isInteger(Number(argv[1])) && Number(argv[1]) > 0) {
    aplicar(Number(argv[1]))
  } else {
    console.error('uso: index.mjs --planear | --aplicar <numero>')
    process.exit(1)
  }
} catch (erro) {
  registar(`erro — ${primeiraLinha(erro)}`)
  process.exit(1)
}
