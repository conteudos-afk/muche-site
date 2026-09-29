/* ─── O prazo ────────────────────────────────────────────────────────────────
   Isto é uma função pura de propósito. É a peça do sistema que junta código ao
   `main` sem ninguém carregar em nada, e a única forma de ter confiança nela é
   poder escrever todos os casos num teste sem tocar no GitHub. Não lê ficheiros,
   não chama o `gh`, não pergunta as horas: recebe tudo, devolve uma decisão.

   Quatro decisões que valem a pena explicar.

   **A rampa vem primeiro.** Até 10 artigos publicados, nada acontece sozinho,
   aconteça o que acontecer. É a travagem que não depende de nenhuma das
   outras estar bem.

   **A rampa conta só o que já foi publicado, nunca o que o PR traz.** O
   portão abre quando uma pessoa já juntou mais de 10 artigos, e nada do que
   está dentro de um PR o pode abrir para si próprio. A tentação é somar os
   artigos do PR («o estado do blog depois deste merge»), e é um erro: com 9
   publicados, um PR de 3 artigos somaria 12 e juntava-se sozinho, e os
   artigos 10, 11 e 12 chegavam ao site sem ninguém os ter visto; e um único
   PR de 11 artigos passava a rampa partindo de zero. A rampa existe para que
   os primeiros artigos tenham olhos humanos, e essa soma deixava-a ser
   ultrapassada pelos próprios artigos que devia proteger.

   Também não há nenhum vazio a preencher. Com lotes de 3 e 9 publicados, o PR
   seguinte não se junta sozinho (9 não é maior que 10), uma pessoa junta-o, e
   passam a ser 12: o PR depois desse já é automático. A rampa acaba nos 12 em
   vez de exatamente nos 10, o que não custa nada. Quem for tentado a «acertar»
   isto somando `pr.artigos` está a repor o buraco descrito acima.

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

/* ─── Datas ──────────────────────────────────────────────────────────────────
   `new Date(texto)` é demasiado generoso para se confiar nele aqui. Lê `"1"`
   como o ano 2001 e `"2026"` como 1 de janeiro, e um campo truncado ou
   estragado passaria por uma data antiga — e um PR antigo junta-se. Lê
   `2026-02-30` como 2 de março (as datas impossíveis «passam ao mês
   seguinte»). Lê uma hora sem fuso como hora local, pelo que o mesmo texto
   dava `avisar` num relógio em UTC e `juntar` em Lisboa. E lê `2026-10-01`
   como meia-noite UTC, o que faz o PR parecer mais velho do que é.

   O `gh` manda sempre um instante ISO 8601 completo com `Z`, portanto nada
   disto acontece hoje. Mas esta função não confia em quem a chama, e uma
   guarda que só está certa porque o chamador se porta bem não é uma guarda.

   Por isso: (1) o texto tem de ter o formato completo, com fuso; (2) o dia
   tem de existir no calendário, conferido contra o texto; (3) a hora não
   pode ser 24, que o `Date` aceita como meia-noite do dia seguinte. O resto
   (minuto 60, fuso `+24:00`, mês 13…) o `Date` já recusa, e os testes fixam
   isso: se um motor novo passar a perdoar, falham. */
const INSTANTE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/

/* Nenhum PR é anterior à GitHub. Um ano como `0000` é um campo estragado, e lido
   como data verdadeira daria um PR com dois mil anos — que se juntava. */
const ANO_MINIMO = 2000

/* Devolve os milissegundos, ou `NaN` se o texto não for um instante válido. */
function lerInstante(texto) {
  if (typeof texto !== 'string') return NaN
  const m = INSTANTE.exec(texto)
  if (!m) return NaN
  const [ano, mes, dia, hora] = m.slice(1, 5).map(Number)
  if (ano < ANO_MINIMO || hora > 23) return NaN

  /* Escreve-se de volta a data a partir dos números e compara-se com o texto:
     30 de fevereiro volta como 2 de março e não coincide. */
  const calendario = new Date(0)
  calendario.setUTCFullYear(ano, mes - 1, dia)
  if (calendario.toISOString().slice(0, 10) !== texto.slice(0, 10)) return NaN

  return new Date(texto).getTime()
}

export function decidir(entrada) {
  /* `entrada ?? {}` e não um valor por omissão: o valor por omissão só cobre
     `undefined`, e `null` rebentava. Quem varre vários PRs num ciclo não pode
     abortar a varredura porque um veio mal formado. */
  const { pr, artigosPublicados, agora } = entrada ?? {}
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

  /* Só `artigosPublicados`, nunca `pr.artigos` — ver o cabeçalho. */
  if (artigosPublicados <= ARTIGOS_ANTES_DO_AUTOMATICO) {
    return nada(
      `rampa: só há ${artigosPublicados} artigos publicados, e o prazo só corre acima de ${ARTIGOS_ANTES_DO_AUTOMATICO}`
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

  /* Só um instante ISO completo (ver `lerInstante`). `new Date(null)` e
     `new Date(0)` são 1970: um PR sem data passaria por ter meio século, e
     seria juntado. */
  const criado = lerInstante(pr.criadoEm)
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
