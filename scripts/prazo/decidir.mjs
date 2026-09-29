/* ─── O prazo ────────────────────────────────────────────────────────────────
   Isto é uma função pura de propósito. É a peça do sistema que junta código ao
   `main` sem ninguém carregar em nada, e a única forma de ter confiança nela é
   poder escrever todos os casos num teste sem tocar no GitHub. Não lê ficheiros,
   não chama o `gh`, não pergunta as horas: recebe tudo, devolve uma decisão.

   Quatro decisões que valem a pena explicar.

   **A rampa vem primeiro.** Até 10 artigos publicados, nada acontece sozinho,
   aconteça o que acontecer. É a travagem que não depende de nenhuma das
   outras estar bem.

   **A contagem inclui os artigos deste PR.** Sem isso o 10.º artigo cairia num
   limbo: o PR que o traz ainda conta 7 publicados, e o seguinte já conta 13. O
   critério tem de ser o estado do blog depois deste merge, não antes.

   **O `buildVerde` pode ser `null`.** Correr um build custa três minutos, e
   esta função é chamada de hora a hora sobre todos os PRs abertos. Devolver
   `precisa-build` deixa quem chama correr o build só nos PRs em que ele é a
   única coisa que falta — o que evita construir 50 vezes por dia um PR que
   está travado por um comentário de qualquer maneira.

   **Na dúvida, não junta.** Um PR que fica parado custa uma hora; um PR
   juntado por engano vai para o site sem ninguém ter olhado. Por isso um dado
   que falta, que não é número, ou que não faz sentido (uma contagem negativa,
   uma data no futuro) devolve `nada` com o motivo escrito — nunca é lido como
   «zero» nem como «tudo bem». O caso que motivou isto é `undefined > 0`, que dá
   `false`: sem esta guarda, um PR sem o campo dos comentários passava como se
   ninguém tivesse comentado. ───────────────────────────────────────────── */

export const ARTIGOS_ANTES_DO_AUTOMATICO = 10
export const HORAS_AVISO = 24
export const HORAS_MERGE = 48

const nada = motivo => ({ acao: 'nada', motivo })

/* `Number.isInteger` já rejeita texto, `null`, `undefined`, `NaN` e infinitos:
   é por isso que `'20' + 3` nunca chega a concatenar. */
const contagemValida = n => Number.isInteger(n) && n >= 0

export function decidir({ pr, artigosPublicados, agora } = {}) {
  if (!pr) return nada('sem dados do PR — entrada inválida')
  if (!contagemValida(artigosPublicados)) {
    return nada(`número de artigos publicados inválido (${String(artigosPublicados)})`)
  }
  if (!contagemValida(pr.artigos)) {
    return nada(`número de artigos do PR inválido (${String(pr.artigos)})`)
  }

  /* Um PR com a etiqueta mas sem nenhum `pt.md` novo (só alterou artigos que
     já existiam, por exemplo) não é um artigo a publicar. Nada o aprovou. */
  if (pr.artigos === 0) return nada('o PR não traz nenhum artigo novo')

  const depoisDeste = artigosPublicados + pr.artigos
  if (depoisDeste <= ARTIGOS_ANTES_DO_AUTOMATICO) {
    return nada(
      `rampa: ficariam ${depoisDeste} artigos publicados, e o prazo só corre acima de ${ARTIGOS_ANTES_DO_AUTOMATICO}`
    )
  }

  /* `=== false` e não `!pr.rascunho`: um campo em falta não é «não é rascunho». */
  if (pr.rascunho === true) return nada('o PR está em rascunho')
  if (pr.rascunho !== false) return nada('estado de rascunho inválido — não se sabe se o PR está pronto')

  if (!contagemValida(pr.comentariosHumanos)) {
    return nada(`número de comentários humanos inválido (${String(pr.comentariosHumanos)})`)
  }
  if (!contagemValida(pr.revisoes)) {
    return nada(`número de revisões inválido (${String(pr.revisoes)})`)
  }
  if (pr.comentariosHumanos > 0) return nada('alguém deixou um comentário — o relógio está parado')
  if (pr.revisoes > 0) return nada('o PR tem uma revisão — o relógio está parado')

  if (!(agora instanceof Date) || Number.isNaN(agora.getTime())) {
    return nada('hora atual inválida')
  }

  /* Só texto. `new Date(null)` é 1970 e `new Date(0)` também: um PR sem data
     passaria por ter meio século, e seria juntado. */
  const criado = typeof pr.criadoEm === 'string' ? new Date(pr.criadoEm).getTime() : NaN
  if (Number.isNaN(criado)) return nada('data de criação inválida')

  const horas = (agora.getTime() - criado) / 3600_000
  if (horas < 0) return nada('o PR diz ter sido criado no futuro — data suspeita')

  if (horas >= HORAS_MERGE) {
    if (pr.buildVerde === null || pr.buildVerde === undefined) {
      return { acao: 'precisa-build', motivo: `${Math.floor(horas)} horas sem resposta — falta saber do build` }
    }
    /* `=== true`: só o booleano verdadeiro autoriza. `1` ou `'true'` não. */
    if (pr.buildVerde !== true) return nada('passaram as 48 horas, mas o build não está verde')
    return { acao: 'juntar', motivo: `${Math.floor(horas)} horas sem resposta, e o build está verde` }
  }

  if (horas >= HORAS_AVISO) {
    /* Só avisa com a certeza de que ainda não avisou. */
    if (pr.jaAvisado !== false) return nada('já foi avisado, ou não se sabe se foi')
    return { acao: 'avisar', motivo: `${Math.floor(horas)} horas sem resposta` }
  }

  return nada(`só passaram ${Math.floor(horas)} horas`)
}
