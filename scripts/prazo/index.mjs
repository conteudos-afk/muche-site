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
import { pathToFileURL } from 'node:url'
import { decidir, ARTIGOS_ANTES_DO_AUTOMATICO } from './decidir.mjs'
import { contarArtigos, foraDoAmbito, MARCA_AVISO, ETIQUETA, ehBot } from './contador.mjs'

/* O `gh` não lê `GITHUB_REPOSITORY`: descobre o repositório pelo `git remote`
   da pasta atual. No workflow a pasta é o checkout e daria certo, mas é uma
   coincidência; por isso, com a variável presente, o `--repo` é explícito nos
   comandos `pr`. Já o `gh api` não tem `--repo`: o repositório vai no caminho
   (ou, sem a variável, no `GH_REPO`/remoto da pasta, pelos marcadores).
   À mão, sem a variável, vale o remoto da pasta.

   O stderr do `gh` é capturado para entrar na mensagem do erro: sem isso o
   registo dizia «Command failed: gh …» e perdia a razão. */
const REPO = process.env.GITHUB_REPOSITORY
const BASE = 'main'
const CAMINHO_REPO = REPO ?? '{owner}/{repo}'

function gh(args) {
  const completos = REPO && args[0] === 'pr' ? [...args, '--repo', REPO] : args
  try {
    return execFileSync('gh', completos, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (erro) {
    const razao = String(erro.stderr ?? '').trim() || primeiraLinha(erro)
    throw new Error(`gh ${args.slice(0, 2).join(' ')}: ${razao.replace(/\s+/g, ' ').slice(0, 300)}`)
  }
}
const ghJson = args => JSON.parse(gh(args))

const primeiraLinha = erro => String(erro?.message ?? erro).split('\n')[0]

const humano = quem => !ehBot(quem?.login)

function registar(linha) {
  console.error(`[prazo] ${linha}`)
  const resumo = process.env.GITHUB_STEP_SUMMARY
  if (!resumo) return
  try { appendFileSync(resumo, `- ${linha}\n`) } catch { /* o resumo é um extra; o registo já saiu */ }
}

/* Um `nada` por um dado com a forma errada é igual, à vista, a um `nada`
   normal («só passaram 3 horas»), e a funcionalidade pode ficar calada meses.
   Estes são os que não são normais; sobem à página da execução como aviso.
   (Sai em stderr: o stdout do `--planear` é só o JSON.) */
const ANOMALIA = /inválid|suspeit|erro ao ler|fora do âmbito|sem dados|repetidos/i

function decisao(numero, { acao, motivo }) {
  registar(`PR #${numero}: ${acao} — ${motivo}`)
  if (acao === 'nada' && ANOMALIA.test(motivo)) {
    console.error(`::warning title=Prazo, PR #${numero}::${motivo.replace(/[\r\n]+/g, ' ')}`)
  }
}

/* Dois comentários de bot com o corpo igual, no mesmo PR. O `github-actions`
   e a Cloudflare escrevem um comentário cada e editam-no, não repetem. Se
   aparecerem dois iguais, o mais provável é o aviso das 24 horas a repetir-se
   porque o `jaAvisado` não o reconhece (o marcador foi mudado, ou o GitHub
   normalizou o corpo). Não depende do marcador nem do texto do aviso, de
   propósito: tem de funcionar justamente quando eles falham. */
function temComentariosRepetidosDeBot(comentarios) {
  const corpos = comentarios
    .filter(c => !humano(c.author))
    .map(c => (typeof c.body === 'string' ? normalizarCorpo(c.body) : ''))
    .filter(corpo => corpo !== '')
  return corpos.some((corpo, i) => corpos.indexOf(corpo) !== i)
}

/* Fins de linha `\r\n` e espaços no fim das linhas não contam: o GitHub pode
   guardar o mesmo texto com uns ou com outros. */
const normalizarCorpo = corpo =>
  corpo.replace(/\r\n?/g, '\n').split('\n').map(linha => linha.trimEnd()).join('\n').trim()

/* Devolve o PR já no formato do `decidir`, ou `{ nada }` com o motivo se ele
   nem chega a ser considerado.

   O portão de âmbito vem antes de tudo o resto. Os revisores leem a
   pré-visualização da Cloudflare, não o diff, e a pré-visualização de um
   artigo parece um artigo seja o que for que mais vá no commit. Sem isto, um
   PR com um artigo e uma alteração a `scripts/prazo/decidir.mjs` juntava-se
   sozinho ao fim de 72 horas de silêncio, e mudava as regras de todos os PRs
   seguintes.

   O QUE O PORTÃO GARANTE, e quando. Corre no `--planear` e outra vez no
   `--aplicar`, com uma leitura nova de cada vez. O passo do build vai buscar a
   ponta do PR por sua conta, entre as duas, e constrói (e corre) o que lá
   estiver nesse momento: quem tiver escrita no repositório e empurrar código
   depois do plano faz esse código correr no build antes de o `--aplicar` o
   apanhar. O que o `--aplicar` garante é outra coisa: só junta se a ponta
   atual passar o portão e for exatamente o commit construído. Ou seja, o
   que chega ao `main` é sempre conteúdo de artigos; o que corre no build não
   tem essa garantia contra alguém com escrita.

   O que o portão NÃO vê, e foi considerado (ver `foraDoAmbito`, no
   `contador.mjs`): um `pt.md`/`en.md` já publicado que venha `MODIFIED`, e o
   modo dos ficheiros (um symlink chamado `pt.md`). */
export function lerPr(numero, buildVerde) {
  const pr = ghJson([
    'pr', 'view', String(numero),
    '--json', 'number,state,baseRefName,headRefOid,isCrossRepository,createdAt,isDraft,comments,reviews,files',
  ])

  if (pr.state !== 'OPEN') return { nada: `o PR não está aberto (${String(pr.state)})` }
  if (pr.baseRefName !== BASE) return { nada: `fora do âmbito: o PR não aponta a ${BASE} (${String(pr.baseRefName)})` }
  /* `=== false`: um campo em falta não é «vem deste repositório». */
  if (pr.isCrossRepository !== false) {
    return { nada: 'fora do âmbito: o PR não vem de um ramo deste repositório (fork, ou origem desconhecida)' }
  }
  const fora = foraDoAmbito(pr.files)
  if (fora) return { nada: fora }

  return {
    commit: pr.headRefOid,
    repetidos: temComentariosRepetidosDeBot(pr.comments),
    pr: {
      numero: pr.number,
      criadoEm: pr.createdAt,
      artigos: contarArtigos(pr.files),
      comentariosHumanos: pr.comments.filter(c => humano(c.author)).length,
      revisoes: pr.reviews.filter(r => humano(r.author)).length,
      jaAvisado: pr.comments.some(c => c.body?.includes(MARCA_AVISO)),
      rascunho: pr.isDraft,
      buildVerde,
    },
  }
}

/* ─── Memória entre execuções ────────────────────────────────────────────────
   Um PR com mais de 48 horas de silêncio e um build que não passa (ou um
   merge que o GitHub recusa: conflito, política do ramo) voltava a ser
   construído todas as horas, que é o custo que a divisão em duas fases existe
   para evitar. Não há onde guardar estado no repositório, por isso guarda-se
   no GitHub: um estado de commit (`statuses`) no commit que foi construído.

   Enquanto a ponta do PR for esse commit, não se reconstrói. Expira ao fim de
   um dia: um build vermelho por falha de rede não pode bloquear um PR para
   sempre e em silêncio. */
const CONTEXTO = 'prazo-artigos/build'
const RECUSA_VALE_HORAS = 24

function recusaGuardada(commit, agora) {
  if (!/^[0-9a-f]{40}$/.test(String(commit))) return null
  const estados = ghJson(['api', `repos/${CAMINHO_REPO}/commits/${commit}/statuses`])
  const recusa = estados.find(e => e.context === CONTEXTO)
  if (!recusa || !['failure', 'error'].includes(recusa.state)) return null
  const horas = (agora.getTime() - new Date(recusa.created_at).getTime()) / 3600_000
  if (!(horas >= 0 && horas < RECUSA_VALE_HORAS)) return null
  return recusa
}

function guardarRecusa(commit, estado, descricao) {
  try {
    gh(['api', '-X', 'POST', `repos/${CAMINHO_REPO}/statuses/${commit}`,
      '-f', `state=${estado}`, '-f', `context=${CONTEXTO}`,
      '-f', `description=${descricao.replace(/\s+/g, ' ').slice(0, 130)}`])
  } catch (erro) {
    registar(`não foi possível guardar a recusa do commit ${commit.slice(0, 7)} — ${primeiraLinha(erro)}`)
  }
}

/* Lê, aplica o portão, decide. É o mesmo caminho no `--planear` e no
   `--aplicar`, que volta a decidir em vez de confiar no plano. */
export function avaliar(numero, buildVerde, publicados, agora) {
  const lido = lerPr(numero, buildVerde)
  if (lido.nada) return { acao: 'nada', motivo: lido.nada }

  const resultado = decidir({ pr: lido.pr, artigosPublicados: publicados, agora })

  /* O aviso tem de ficar reconhecível na execução seguinte (`MARCA_AVISO`).
     Se não fica, cada hora escreve outro aviso igual e o PR nunca se junta.
     Depois de um comentário repetido, pára: um PR sem aviso reconhecido nunca
     é juntado de qualquer forma (o `decidir` exige `jaAvisado`), e assim o
     erro deixa de acumular comentários e passa a ser um aviso na execução. */
  if (resultado.acao === 'avisar' && lido.repetidos) {
    return {
      acao: 'nada',
      motivo: 'há comentários de bot repetidos neste PR — o aviso das 24 horas não está a ser reconhecido (o marcador mudou, ou o GitHub alterou o corpo?); não se avisa outra vez até isto ser visto por uma pessoa',
    }
  }

  if (resultado.acao === 'precisa-build') {
    const recusa = recusaGuardada(lido.commit, agora)
    if (recusa) {
      return {
        acao: 'nada',
        motivo: `o commit ${lido.commit.slice(0, 7)} já foi construído e recusado (${recusa.description}) — espera por um commit novo, ou até passarem ${RECUSA_VALE_HORAS} horas`,
      }
    }
  }
  return { ...resultado, commit: lido.commit }
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
    '--base', BASE, '--limit', '50', '--json', 'number',
  ]).map(p => p.number)
}

/* O corpo do aviso é sempre o mesmo, palavra por palavra: não leva o número
   de artigos publicados, nem a hora, nem nada que varie de uma execução para
   a seguinte. É de propósito. A deteção de avisos repetidos compara corpos, e
   existe para quando o marcador não é legível, que é quando o sistema já está
   confuso; com um número no corpo, dois avisos enviados a 12 e a 13 artigos
   já não seriam iguais e a deteção calava-se. O número não faz falta a quem
   lê o PR (interessa à automação, e está no registo e no resumo da execução). */
export function avisar(numero) {
  gh(['pr', 'comment', String(numero), '--body', `${MARCA_AVISO}
Faltam **24 horas** para este PR ser juntado automaticamente.

Para travar o relógio basta escrever aqui qualquer coisa — não é preciso aprovar nem pedir alterações.

_O prazo automático só corre depois de ${ARTIGOS_ANTES_DO_AUTOMATICO} artigos publicados por esta via._`])
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

export function planear() {
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
    let resultado
    try {
      /* `null` no build: o plano é feito sem construir nada. */
      resultado = avaliar(numero, null, publicados, agora)
    } catch (erro) {
      /* Um PR que não se consegue ler não pode impedir os outros, nem ser
         juntado: fica em `nada`, com a razão escrita. */
      resultado = { acao: 'nada', motivo: `erro ao ler o PR — ${primeiraLinha(erro)}` }
    }
    decisao(numero, resultado)
    return { numero, acao: resultado.acao, motivo: resultado.motivo }
  })

  console.log(JSON.stringify({ publicados, prs }))
}

export function aplicar(numero) {
  const publicados = artigosPublicados()
  const verde = process.env.BUILD_VERDE === 'true' ? true
    : process.env.BUILD_VERDE === 'false' ? false
    : null
  const construido = process.env.COMMIT_CONSTRUIDO ?? ''
  const commitValido = /^[0-9a-f]{40}$/.test(construido)

  const resultado = avaliar(numero, verde, publicados, new Date())
  decisao(numero, resultado)

  /* Build vermelho: guarda-se no commit que foi construído, para as próximas
     horas não o reconstruírem. */
  if (verde === false && commitValido) guardarRecusa(construido, 'failure', 'build vermelho')

  if (resultado.acao === 'avisar') {
    avisar(numero)
  } else if (resultado.acao === 'juntar') {
    /* O `avaliar` acabou de ler e de passar o portão de âmbito na ponta atual
       do PR (`resultado.commit`). Só se junta se essa ponta for exatamente o
       commit que foi construído: senão, o que passou o portão e o que passou
       o build são coisas diferentes. Não é um erro, é um PR que mexeu: a
       próxima execução volta a olhar, e reconstrói. */
    if (commitValido && resultado.commit !== construido) {
      registar(`PR #${numero}: nada — a ponta do PR mudou desde o build (construído ${construido.slice(0, 7)}, agora ${String(resultado.commit).slice(0, 7)}); não se junta`)
      return
    }
    if (!commitValido) {
      throw new Error(`COMMIT_CONSTRUIDO em falta ou inválido (${JSON.stringify(construido)}) — não se junta um PR sem saber que commit foi construído`)
    }
    try {
      juntar(numero, resultado.motivo, construido)
    } catch (erro) {
      guardarRecusa(construido, 'error', `merge recusado: ${primeiraLinha(erro)}`)
      throw erro
    }
  }
}

function principal(argv) {
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
}

/* Só corre quando é chamado como programa: o teste do aviso importa este
   ficheiro para exercitar `avisar` e `lerPr` a sério. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal(process.argv.slice(2))
}
