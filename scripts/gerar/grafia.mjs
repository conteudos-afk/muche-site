/* ─── Detector de grafia anterior ao Acordo Ortográfico ─────────────────────
   O `SISTEMA` manda escrever no novo Acordo; se ele próprio estiver escrito
   no antigo, contradiz-se, e o modelo tende a copiar o que vê mais do que o
   que lhe mandam. Este módulo apanha as sequências que o Acordo tirou —
   consoante muda antes de outra (`c` ou `p` antes de `c`, `ç`, `t`) — e os
   nomes dos meses com maiúscula.

   Hoje só os testes o usam (sobre os prompts e sobre texto de agência); mora
   fora do ficheiro de testes para poder ser corrido também sobre os artigos
   reais.

   A REGRA DE OURO: nada legítimo pode disparar. Um detector que dispara numa
   palavra certa é apagado pelo primeiro que tropeça nele, e a partir daí não
   protege nada. Por isso tudo o que é correcto sai por uma de três portas, e
   a ordem importa:

   1. Inglês, por uma REGRA e não por uma lista (mais o mês `September`). As palavras inglesas com
      estas sequências são inumeráveis (action, project, concept, prompt,
      Accenture…), mas terminam de maneiras que nenhuma palavra portuguesa
      termina: em `-t`/`-ts` depois de consoante (`project`, `prompts`), em
      `-tion(s)`, `-ive(s)`, `-ure(s)`, `-ity`, `-ly`, `-ic(al)`, `-ing`,
      `-ous`, `-able`, `-rs`. A grafia antiga que nos interessa acaba sempre
      numa terminação portuguesa (`-o`, `-a`, `-or`, `-ores`, `-ção`,
      `-ente`, `-ais`…). Limite conhecido e aceite: `director`, `actor`,
      `detector`, `sector` acabam em `-or` nas duas línguas e por isso
      disparam mesmo num «Creative Director» em texto português.
   2. `LEGITIMAS`: palavras portuguesas em que a consoante se pronuncia e por
      isso se mantém no Acordo — facto, contacto, características,
      expectativa, convicção, conectar, secção… Estão por RAÍZES, não por
      palavras inteiras: uma lista de palavras inteiras deixa sempre de fora
      a próxima flexão. Onde a raiz também serve a forma antiga (`factura` →
      `fatura`, `fractura` → `fratura`, `espectáculo` → `espetáculo`),
      a entrada é mais estreita de propósito.
   3. O que vem depois de «nunca» entre «», até 40 caracteres e numa só
      linha: o `SISTEMA` cita a grafia antiga para a proibir.

   Meses: só se apanha a maiúscula em português, e não depois de «<número>
   de» — «25 de Abril», «1.º de Maio» e «5 de Outubro» são nomes de feriados
   e levam maiúscula. O preço aceite: «até 15 de Outubro» também passa. ───── */

const LEGITIMAS = [
  /^fact(o|os|ual|uais)$/, /^artefact/, /^fractal/, /^fractais$/,
  /^contact/, /^impact/, /^pact/, /^compact/, /^intact/, /^tact(o|os)$/, /^cact/,
  /^caract/, /^expect/, /^convic/, /^dicç/, /^conect/,
  /^espectador/, /^espectr/, /^pict/, /^intelect/, /^oct[oó]/,
  /^(inter|dis)?secç/, /^cript/, /^recept/, /^conceptual/,
  /^adapt/, /^apt(o|a|os|as|idão|idões)$/, /^adept/, /^capt/,
  /^opç/, /^opt(ar|ou|am|a|e|ei|amos|ando|ado|ados)/,
  /^(ab|cor)?rupt/, /^ruptur/, /^(cor|er|inter)?rupç/, /^erupt/, /^disrupt/, /^inept/,
  /^eucalipt/, /^helic[oó]pter/,
  /^ficç/, /^ficc/, /^fricç/, /^succ/, /^sucç/, /^occip/,
]

const TERMINACAO_INGLESA = /(?:[cp]ts?|tions?|ives?|ures?|ity|ities|ly|ic|ical|ing|ous|able|rs)$/

/* O único mês inglês com estas sequências, e o único que os prompts usam
   (`"September 2026"`). Não é a forma portuguesa «Setembro». */
const MES_INGLES = /^september$/

const MES = 'Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro'
const MESES = new RegExp(`\\b(?:${MES})\\b`, 'g')
const DATA_FERIADO = new RegExp(`\\d+(?:\\.?º)?[ \\t]+de[ \\t]+(?:${MES})\\b`, 'g')

/* Ver ponto 3 acima. Sem `\s` nem `[^»]*`: um «nunca «» por fechar não pode
   engolir linhas seguintes até ao próximo `»` e esconder erros de verdade. */
const PROIBIDA_CITADA = /nunca[ \t]+«[^»«\n]{1,40}»/g

export function grafiasAntigas(texto) {
  const limpo = String(texto).replace(PROIBIDA_CITADA, ' ').replace(DATA_FERIADO, ' ')
  const palavras = limpo.match(/\p{L}+/gu) ?? []
  const suspeitas = palavras.filter(pal => {
    const p = pal.toLowerCase()
    return /c[cçt]|p[tç]/.test(p) && !TERMINACAO_INGLESA.test(p) && !MES_INGLES.test(p) && !LEGITIMAS.some(re => re.test(p))
  })
  return [...suspeitas, ...(limpo.match(MESES) ?? [])]
}
