import { expect, test } from 'vitest'
import { decidir, ARTIGOS_ANTES_DO_AUTOMATICO, HORAS_AVISO, HORAS_MERGE } from './decidir.mjs'

const AGORA = new Date('2026-10-05T12:00:00Z')
const haHoras = h => new Date(AGORA.getTime() - h * 3600_000).toISOString()

const pr = (extra = {}) => ({
  numero: 42,
  criadoEm: haHoras(50),
  artigos: 3,
  comentariosHumanos: 0,
  revisoes: 0,
  buildVerde: true,
  // Por omissão o aviso já foi enviado: é o estado normal de quem chega às 48 horas
  jaAvisado: true,
  rascunho: false,
  ...extra,
})

const acao = (extra, publicados = 20) =>
  decidir({ pr: pr(extra), artigosPublicados: publicados, agora: AGORA }).acao

test('os números são os do spec', () => {
  expect([ARTIGOS_ANTES_DO_AUTOMATICO, HORAS_AVISO, HORAS_MERGE]).toEqual([10, 24, 48])
})

test('não faz nada enquanto a rampa não tiver terminado', () => {
  const d = decidir({ pr: pr(), artigosPublicados: 6, agora: AGORA })
  expect(d.acao).toBe('nada')
  expect(d.motivo).toContain('6')
  expect(d.motivo).toContain('10')
})

test('a rampa não conta com os artigos deste PR', () => {
  // 8 publicados + 3 neste PR seriam 11, mas o que abre o portão é o que já está publicado
  expect(acao({}, 8)).toBe('nada')
})

test('exatamente 10 publicados ainda não chega, 11 já chega', () => {
  expect(acao({}, 10)).toBe('nada')
  expect(acao({}, 11)).toBe('juntar')
})

test('não faz nada antes das 24 horas', () => {
  expect(acao({ criadoEm: haHoras(3) })).toBe('nada')
})

test('avisa às 24 horas', () => {
  expect(acao({ criadoEm: haHoras(25), jaAvisado: false })).toBe('avisar')
})

test('não avisa duas vezes', () => {
  expect(acao({ criadoEm: haHoras(25), jaAvisado: true })).toBe('nada')
})

test('junta às 48 horas', () => {
  expect(acao({ criadoEm: haHoras(49) })).toBe('juntar')
})

test('um comentário humano trava o relógio, mesmo passadas as 48 horas', () => {
  const d = decidir({ pr: pr({ comentariosHumanos: 1 }), artigosPublicados: 20, agora: AGORA })
  expect(d.acao).toBe('nada')
  expect(d.motivo).toContain('comentário')
})

test('uma revisão também trava, mesmo que seja uma aprovação', () => {
  expect(acao({ revisoes: 1 })).toBe('nada')
})

test('um comentário trava também a fase do aviso', () => {
  expect(acao({ criadoEm: haHoras(25), jaAvisado: false, comentariosHumanos: 1 })).toBe('nada')
})

test('um rascunho nunca é juntado', () => {
  expect(acao({ rascunho: true })).toBe('nada')
})

test('um rascunho diz que é rascunho, e não que o estado é inválido', () => {
  const d = decidir({ pr: pr({ rascunho: true }), artigosPublicados: 20, agora: AGORA })
  expect(d.motivo).toContain('rascunho')
  expect(d.motivo).not.toContain('inválid')
})

test('build vermelho não junta, e diz porquê', () => {
  const d = decidir({ pr: pr({ buildVerde: false }), artigosPublicados: 20, agora: AGORA })
  expect(d.acao).toBe('nada')
  expect(d.motivo).toContain('build')
})

test('pede o build quando ainda não sabe se está verde', () => {
  expect(acao({ buildVerde: null })).toBe('precisa-build')
})

test('não pede o build a quem ainda não chegou às 48 horas', () => {
  expect(acao({ criadoEm: haHoras(3), buildVerde: null })).toBe('nada')
})

test('nem a quem já tem um comentário', () => {
  expect(acao({ buildVerde: null, comentariosHumanos: 1 })).toBe('nada')
})

/* ─── Para além do brief ─────────────────────────────────────────────────────
   Tudo o que se segue é o que o brief deixa implícito. Onde não diz o que fazer,
   a escolha é sempre a que não junta: um PR que fica parado custa uma hora, um
   PR juntado por engano vai para o site sem ninguém ter olhado. */

/* Os limites */

test('às 24 horas em ponto já avisa', () => {
  expect(acao({ criadoEm: haHoras(24), jaAvisado: false })).toBe('avisar')
})

test('um segundo antes das 24 horas ainda não avisa', () => {
  const criadoEm = new Date(AGORA.getTime() - 24 * 3600_000 + 1000).toISOString()
  expect(acao({ criadoEm })).toBe('nada')
})

test('às 48 horas em ponto já junta', () => {
  expect(acao({ criadoEm: haHoras(48) })).toBe('juntar')
})

test('um segundo antes das 48 horas ainda só avisa', () => {
  const criadoEm = new Date(AGORA.getTime() - 48 * 3600_000 + 1000).toISOString()
  expect(acao({ criadoEm, jaAvisado: false })).toBe('avisar')
})

test('entre as 24 e as 48 horas o build não é pedido: só se avisa', () => {
  expect(acao({ criadoEm: haHoras(30), jaAvisado: false, buildVerde: null })).toBe('avisar')
})

test('passadas as 48 horas, quem já foi avisado é juntado na mesma', () => {
  expect(acao({ criadoEm: haHoras(60), jaAvisado: true })).toBe('juntar')
})

/* O aviso das 24 horas é condição para juntar. Um PR que passou as 48 horas sem
   nunca o ter recebido (etiquetado tarde, ou o workflow esteve parado — o GitHub
   desliga os agendados ao fim de 60 dias sem atividade) é avisado agora e
   juntado numa execução seguinte. */

test('48 horas sem aviso enviado: avisa, não junta', () => {
  const d = decidir({ pr: pr({ criadoEm: haHoras(49), jaAvisado: false }), artigosPublicados: 20, agora: AGORA })
  expect(d.acao).toBe('avisar')
  expect(d.motivo).toContain('nunca foi enviado')
})

test('48 horas com o aviso enviado: junta', () => {
  expect(acao({ criadoEm: haHoras(49), jaAvisado: true })).toBe('juntar')
})

test('72 horas sem aviso enviado: avisa, não junta', () => {
  expect(acao({ criadoEm: haHoras(72), jaAvisado: false })).toBe('avisar')
})

test('muito tempo depois (o workflow esteve parado), sem aviso: continua a avisar primeiro', () => {
  expect(acao({ criadoEm: haHoras(24 * 90), jaAvisado: false })).toBe('avisar')
})

test('às 48 horas em ponto sem aviso: avisa, não junta, e diz que o aviso nunca foi enviado', () => {
  const d = decidir({ pr: pr({ criadoEm: haHoras(48), jaAvisado: false }), artigosPublicados: 20, agora: AGORA })
  expect(d.acao).toBe('avisar')
  expect(d.motivo).toContain('nunca foi enviado')
})

test('entre as 24 e as 48 horas o aviso é o normal e não diz que «nunca foi enviado»', () => {
  const d = decidir({ pr: pr({ criadoEm: haHoras(30), jaAvisado: false }), artigosPublicados: 20, agora: AGORA })
  expect(d.acao).toBe('avisar')
  expect(d.motivo).not.toContain('nunca foi enviado')
})

test('passadas as 48 horas sem aviso, avisa mesmo que o build seja vermelho ou desconhecido', () => {
  // O aviso não depende do build, e não se gasta um build num PR que ainda não pode ser juntado
  expect(acao({ criadoEm: haHoras(72), jaAvisado: false, buildVerde: false })).toBe('avisar')
  expect(acao({ criadoEm: haHoras(72), jaAvisado: false, buildVerde: null })).toBe('avisar')
  expect(acao({ criadoEm: haHoras(72), jaAvisado: false, buildVerde: true })).toBe('avisar')
})

test('sequência: avisa numa execução e junta na seguinte', () => {
  // Execução 1: 72 horas, nunca avisado, build ainda por saber
  const um = decidir({ pr: pr({ criadoEm: haHoras(72), jaAvisado: false, buildVerde: null }), artigosPublicados: 20, agora: AGORA })
  expect(um.acao).toBe('avisar')
  // Execução 2: uma hora depois o chamador vê o aviso, `jaAvisado` é true; pede o build
  const depois = new Date(AGORA.getTime() + 3600_000)
  const dois = decidir({ pr: pr({ criadoEm: haHoras(72), jaAvisado: true, buildVerde: null }), artigosPublicados: 20, agora: depois })
  expect(dois.acao).toBe('precisa-build')
  // Execução 3: o build está verde; junta
  const tres = decidir({ pr: pr({ criadoEm: haHoras(72), jaAvisado: true, buildVerde: true }), artigosPublicados: 20, agora: depois })
  expect(tres.acao).toBe('juntar')
})

test('não há estado em que avisa para sempre: com o aviso enviado, nunca devolve `avisar`', () => {
  for (let h = 0; h <= 24 * 120; h += 0.5) {
    for (const buildVerde of [true, false, null]) {
      const d = decidir({ pr: pr({ criadoEm: haHoras(h), jaAvisado: true, buildVerde }), artigosPublicados: 20, agora: AGORA })
      expect(d.acao).not.toBe('avisar')
    }
  }
})

test('sem o aviso enviado, a partir das 24 horas nunca junta nem pede build', () => {
  for (let h = 24; h <= 24 * 120; h += 0.5) {
    for (const buildVerde of [true, false, null]) {
      const d = decidir({ pr: pr({ criadoEm: haHoras(h), jaAvisado: false, buildVerde }), artigosPublicados: 20, agora: AGORA })
      expect(d.acao).toBe('avisar')
    }
  }
})

test.each([
  ['comentário', { comentariosHumanos: 1 }],
  ['revisão', { revisoes: 1 }],
  ['rascunho', { rascunho: true }],
])('passadas as 48 horas sem aviso, um PR com %s não é avisado: quem lá está já reagiu', (_, extra) => {
  expect(acao({ criadoEm: haHoras(72), jaAvisado: false, ...extra })).toBe('nada')
})

test('passadas as 48 horas sem aviso, a rampa continua a mandar', () => {
  expect(acao({ criadoEm: haHoras(72), jaAvisado: false }, 5)).toBe('nada')
})

test.each([
  ['ausente', undefined],
  ['nulo', null],
  ['texto «true»', 'true'],
  ['texto «false»', 'false'],
  ['1', 1],
  ['0', 0],
  ['objeto', {}],
])('passadas as 48 horas, jaAvisado %s não é nem verdadeiro nem falso: nada', (_, jaAvisado) => {
  const d = decidir({ pr: pr({ criadoEm: haHoras(72), jaAvisado }), artigosPublicados: 20, agora: AGORA })
  expect(d.acao).toBe('nada')
  expect(d.motivo).toContain('não se sabe')
})

/* A rampa */

test('a rampa: com 0 publicados e 3 neste PR ainda não chega', () => {
  const d = decidir({ pr: pr({ criadoEm: haHoras(500) }), artigosPublicados: 0, agora: AGORA })
  expect(d.acao).toBe('nada')
  expect(d.motivo).toContain('rampa')
})

test('a rampa: com 9 publicados, um PR de 3 artigos não se junta sozinho (era o buraco da soma)', () => {
  // 9 + 3 = 12 passaria se se somasse: os artigos 10, 11 e 12 chegariam ao site sem ninguém os ver
  expect(acao({ artigos: 3, criadoEm: haHoras(500) }, 9)).toBe('nada')
})

test('a rampa: um PR grande não abre o portão para si próprio', () => {
  // 0 + 11 passaria se se somasse
  const d = decidir({ pr: pr({ artigos: 11, criadoEm: haHoras(500) }), artigosPublicados: 0, agora: AGORA })
  expect(d.acao).toBe('nada')
  expect(d.motivo).toContain('rampa')
  expect(acao({ artigos: 50, criadoEm: haHoras(500) }, 10)).toBe('nada')
})

test('a rampa: 12 publicados e o PR seguinte já é automático (a rampa acaba nos 12, não nos 10)', () => {
  expect(acao({ artigos: 3, criadoEm: haHoras(500) }, 12)).toBe('juntar')
})

test('a rampa manda mesmo quando tudo o resto está pronto para juntar', () => {
  expect(acao({ criadoEm: haHoras(500), buildVerde: true }, 0)).toBe('nada')
})

test('a rampa trava também o aviso e o pedido de build', () => {
  expect(acao({ criadoEm: haHoras(30), jaAvisado: false }, 0)).toBe('nada')
  expect(acao({ criadoEm: haHoras(60), buildVerde: null }, 0)).toBe('nada')
})

test('a rampa depende só dos publicados: com 11 publicados, 1 artigo no PR basta', () => {
  expect(acao({ artigos: 1 }, 10)).toBe('nada')
  expect(acao({ artigos: 1 }, 11)).toBe('juntar')
})

/* Um PR que não traz artigos novos */

test('um PR sem nenhum artigo novo nunca é juntado, mesmo com a rampa cumprida', () => {
  const d = decidir({ pr: pr({ artigos: 0 }), artigosPublicados: 20, agora: AGORA })
  expect(d.acao).toBe('nada')
  expect(d.motivo).toContain('nenhum artigo')
})

/* O tempo */

test('um PR criado no futuro não avança nada', () => {
  const d = decidir({ pr: pr({ criadoEm: haHoras(-5) }), artigosPublicados: 20, agora: AGORA })
  expect(d.acao).toBe('nada')
  expect(d.motivo).toContain('futuro')
})

test('um PR criado no futuro não é tratado como antigo por o módulo da diferença ser grande', () => {
  expect(acao({ criadoEm: haHoras(-500) })).toBe('nada')
})

test.each([
  ['ausente', undefined],
  ['nulo', null],
  ['vazio', ''],
  ['texto que não é data', 'ontem à tarde'],
  ['data impossível', '2026-13-45T00:00:00Z'],
  ['número (o zero da época passaria por muito antigo)', 0],
  ['um objeto Date em vez de texto', new Date(0)],
])('criadoEm %s: não faz nada e diz que a data é inválida', (_, criadoEm) => {
  const d = decidir({ pr: pr({ criadoEm }), artigosPublicados: 20, agora: AGORA })
  expect(d.acao).toBe('nada')
  expect(d.motivo).toContain('inválida')
})

/* O `new Date(texto)` do JavaScript perdoa demasiado. Cada uma destas entradas
   é lida por ele como uma data válida, quase sempre antiga, e portanto juntava.
   O relógio (`AGORA`) está a 2026-10-05, por isso qualquer data destas que
   passasse teria mais de 48 horas. */
test.each([
  ['30 de fevereiro (passaria a 2 de março)', '2026-02-30T00:00:00Z'],
  ['31 de abril (passaria a 1 de maio)', '2026-04-31T00:00:00Z'],
  ['29 de fevereiro num ano que não é bissexto', '2026-02-29T00:00:00Z'],
  ['dia zero', '2026-03-00T00:00:00Z'],
  ['hora 24', '2026-09-01T24:00:00Z'],
  ['hora 25', '2026-09-01T25:00:00Z'],
  ['minuto 60', '2026-09-01T10:60:00Z'],
  ['segundo 60', '2026-09-01T10:00:60Z'],
  ['fuso com hora 24', '2026-09-01T10:00:00+24:00'],
  ['fuso com minuto 60', '2026-09-01T10:00:00+01:60'],
  ['«1» (lido como o ano 2001)', '1'],
  ['«2026» (lido como 1 de janeiro)', '2026'],
  ['«1970»', '1970'],
  ['fragmento «abc 1»', 'abc 1'],
  ['fragmento «Oct 1»', 'Oct 1'],
  ['«1/1/2020»', '1/1/2020'],
  ['hora sem fuso (lida como hora local: o resultado dependia do relógio da máquina)', '2026-10-01T00:00:00'],
  ['hora sem fuso, com frações', '2026-10-01T00:00:00.000'],
  ['só a data (lida como meia-noite UTC)', '2026-10-01'],
  ['só a data e a hora, sem segundos', '2026-10-01T00:00Z'],
  ['espaço em vez de T', '2026-10-01 00:00:00Z'],
  ['espaço no fim', '2026-10-01T00:00:00Z '],
  ['espaço no início', ' 2026-10-01T00:00:00Z'],
  ['fuso sem os dois pontos', '2026-10-01T00:00:00+0100'],
  ['lixo depois do Z', '2026-10-01T00:00:00Zx'],
  ['mudança de linha no fim', '2026-10-01T00:00:00Z\n'],
  ['ponto sem dígitos nas frações', '2026-10-01T00:00:00.Z'],
  ['ano com dois dígitos', '26-10-01T00:00:00Z'],
  ['ano zero, anterior a qualquer PR possível', '0000-10-01T00:00:00Z'],
  ['ano 1999, anterior à GitHub', '1999-12-31T23:59:59Z'],
  ['ano com cinco dígitos', '12026-10-01T00:00:00Z'],
  ['mês zero', '2026-00-10T00:00:00Z'],
  ['mês 13', '2026-13-10T00:00:00Z'],
  ['objeto String com um instante válido dentro (não é texto)', new String('2026-09-01T10:00:00Z')],
])('criadoEm %s: não é um instante ISO completo, logo não junta', (_, criadoEm) => {
  const d = decidir({ pr: pr({ criadoEm }), artigosPublicados: 20, agora: AGORA })
  expect(d.acao).toBe('nada')
  expect(d.motivo).toContain('inválida')
})

test.each([
  ['com Z', '2026-09-01T10:00:00Z'],
  ['com frações de segundo', '2026-09-01T10:00:00.123Z'],
  ['com fuso positivo', '2026-09-01T11:00:00+01:00'],
  ['com fuso negativo', '2026-09-01T05:00:00-05:00'],
  ['com fuso de meia hora', '2026-09-01T15:30:00+05:30'],
  ['29 de fevereiro num ano bissexto', '2024-02-29T12:00:00Z'],
  ['ano 2000, o primeiro aceite', '2000-01-01T00:00:00Z'],
])('criadoEm %s: um instante ISO completo válido continua a ser aceite', (_, criadoEm) => {
  // Em todos os casos há mais de 48 horas até AGORA e o build está verde: junta.
  expect(acao({ criadoEm })).toBe('juntar')
})

test('o fuso é respeitado: -05:00 são 5 horas atrás do UTC', () => {
  // 10:00 em -05:00 são 15:00Z de 3 de outubro, 45 horas antes de AGORA: só avisa.
  // Se o fuso fosse ignorado leria-se 10:00Z (50 horas) e juntava.
  expect(acao({ criadoEm: '2026-10-03T10:00:00-05:00', jaAvisado: false })).toBe('avisar')
})

test('o fuso é respeitado no sentido contrário: +05:00 são 5 horas à frente do UTC', () => {
  // 16:00 em +05:00 são 11:00Z de 3 de outubro, 49 horas antes de AGORA: junta.
  // Se o fuso fosse ignorado leria-se 16:00Z (44 horas) e só avisava.
  expect(acao({ criadoEm: '2026-10-03T16:00:00+05:00' })).toBe('juntar')
})

test('os minutos do fuso contam: +05:30', () => {
  // 17:15 em +05:30 são 11:45Z, 48,25 horas antes de AGORA: junta.
  // Sem os 30 minutos leria-se 12:15Z (47,75 horas) e só avisava.
  expect(acao({ criadoEm: '2026-10-03T17:15:00+05:30' })).toBe('juntar')
})

test('as frações de segundo não mudam o resultado nas fronteiras', () => {
  expect(acao({ criadoEm: '2026-10-03T12:00:00.000Z' })).toBe('juntar')
  expect(acao({ criadoEm: '2026-10-03T12:00:00.999Z', jaAvisado: false })).toBe('avisar')
})

test.each([
  ['ausente', undefined],
  ['nulo', null],
  ['texto', AGORA.toISOString()],
  ['data inválida', new Date('lixo')],
])('agora %s: não faz nada', (_, agora) => {
  const d = decidir({ pr: pr(), artigosPublicados: 20, agora })
  expect(d.acao).toBe('nada')
  expect(d.motivo).toContain('inválid')
})

/* Contagens que não se podem ler */

test.each([
  ['ausente', undefined],
  ['nulo', null],
  ['negativo', -1],
  ['fracionário', 2.5],
  ['NaN', NaN],
  ['infinito', Infinity],
  ['texto (concatenaria em vez de somar)', '20'],
])('artigosPublicados %s: não faz nada', (_, artigosPublicados) => {
  const d = decidir({ pr: pr({ criadoEm: haHoras(500) }), artigosPublicados, agora: AGORA })
  expect(d.acao).toBe('nada')
  expect(d.motivo).toContain('inválid')
})

test.each([
  ['ausente', undefined],
  ['nulo', null],
  ['negativo', -3],
  ['fracionário', 1.5],
  ['NaN', NaN],
  ['texto', '3'],
])('artigos do PR %s: não faz nada', (_, artigos) => {
  const d = decidir({ pr: pr({ artigos, criadoEm: haHoras(500) }), artigosPublicados: 20, agora: AGORA })
  expect(d.acao).toBe('nada')
  expect(d.motivo).toContain('inválid')
})

test.each([
  ['comentariosHumanos ausente', { comentariosHumanos: undefined }],
  ['comentariosHumanos nulo', { comentariosHumanos: null }],
  ['comentariosHumanos negativo', { comentariosHumanos: -1 }],
  ['comentariosHumanos NaN', { comentariosHumanos: NaN }],
  ['comentariosHumanos texto', { comentariosHumanos: '0' }],
  ['revisoes ausente', { revisoes: undefined }],
  ['revisoes nulo', { revisoes: null }],
  ['revisoes negativo', { revisoes: -1 }],
  ['revisoes NaN', { revisoes: NaN }],
])('%s: sem saber se há comentários ou revisões, não junta', (_, extra) => {
  const d = decidir({ pr: pr({ ...extra, criadoEm: haHoras(500) }), artigosPublicados: 20, agora: AGORA })
  expect(d.acao).toBe('nada')
  expect(d.motivo).toContain('inválid')
})

test('vários comentários humanos travam tal como um', () => {
  expect(acao({ comentariosHumanos: 7 })).toBe('nada')
  expect(acao({ revisoes: 3 })).toBe('nada')
})

/* Os estados que só valem se forem exatamente o que se espera */

test.each([
  ['ausente', undefined],
  ['nulo', null],
  ['0', 0],
  ['texto', 'false'],
])('rascunho %s: só se junta com rascunho exatamente falso', (_, rascunho) => {
  expect(acao({ rascunho })).toBe('nada')
})

test('um rascunho não é avisado nem pede build', () => {
  expect(acao({ rascunho: true, criadoEm: haHoras(30), jaAvisado: false })).toBe('nada')
  expect(acao({ rascunho: true, buildVerde: null })).toBe('nada')
})

test.each([
  ['1', 1],
  ['texto', 'true'],
  ['objeto', {}],
  ['0', 0],
])('buildVerde %s: só o booleano verdadeiro junta', (_, buildVerde) => {
  expect(acao({ buildVerde })).toBe('nada')
})

test('buildVerde ausente é o mesmo que «ainda não sei»', () => {
  expect(acao({ buildVerde: undefined })).toBe('precisa-build')
})

test.each([
  ['ausente', undefined],
  ['nulo', null],
])('jaAvisado %s: sem saber se já avisou, não avisa outra vez', (_, jaAvisado) => {
  expect(acao({ criadoEm: haHoras(30), jaAvisado })).toBe('nada')
})

test('jaAvisado também tem de ser exatamente booleano a partir das 24 horas: «true» em texto não avisa nem junta', () => {
  expect(acao({ criadoEm: haHoras(30), jaAvisado: 'true' })).toBe('nada')
  expect(acao({ criadoEm: haHoras(60), jaAvisado: 'true' })).toBe('nada')
})

test('antes das 24 horas jaAvisado não interessa: um valor estranho não muda nada, nem o motivo', () => {
  for (const jaAvisado of [undefined, null, 'true', false, true]) {
    const d = decidir({ pr: pr({ criadoEm: haHoras(3), jaAvisado }), artigosPublicados: 20, agora: AGORA })
    expect(d.acao).toBe('nada')
    expect(d.motivo).toContain('só passaram')
  }
})

/* Combinações */

test('comentário e build vermelho ao mesmo tempo: nada, e o motivo é o comentário', () => {
  const d = decidir({
    pr: pr({ comentariosHumanos: 1, buildVerde: false }),
    artigosPublicados: 20,
    agora: AGORA,
  })
  expect(d.acao).toBe('nada')
  expect(d.motivo).toContain('comentário')
})

test('revisão e build vermelho ao mesmo tempo: nada, e o motivo é a revisão', () => {
  const d = decidir({ pr: pr({ revisoes: 1, buildVerde: false }), artigosPublicados: 20, agora: AGORA })
  expect(d.acao).toBe('nada')
  expect(d.motivo).toContain('revisão')
})

test('rascunho e comentário e build vermelho: nada', () => {
  expect(acao({ rascunho: true, comentariosHumanos: 2, revisoes: 1, buildVerde: false })).toBe('nada')
})

test('build vermelho na janela do aviso: o aviso é sobre o prazo, não sobre o build, por isso avisa', () => {
  expect(acao({ criadoEm: haHoras(30), jaAvisado: false, buildVerde: false })).toBe('avisar')
})

test('a decisão vem sempre com um motivo em texto', () => {
  const casos = [
    pr(),
    pr({ criadoEm: haHoras(3) }),
    pr({ criadoEm: haHoras(30), jaAvisado: false }),
    pr({ buildVerde: null }),
    pr({ buildVerde: false }),
    pr({ comentariosHumanos: 1 }),
  ]
  for (const p of casos) {
    const d = decidir({ pr: p, artigosPublicados: 20, agora: AGORA })
    expect(['nada', 'avisar', 'juntar', 'precisa-build']).toContain(d.acao)
    expect(typeof d.motivo).toBe('string')
    expect(d.motivo.length).toBeGreaterThan(5)
  }
})

test('decidir(null) e decidir() comportam-se da mesma maneira: nada, sem rebentar', () => {
  // Quem varre vários PRs num ciclo não pode abortar porque um veio mal formado
  for (const entrada of [undefined, null, {}, 5, 'x', []]) {
    const d = decidir(entrada)
    expect(d.acao).toBe('nada')
    expect(d.motivo).toContain('inválid')
  }
})

test('sem PR nenhum não faz nada, em vez de rebentar', () => {
  const d = decidir({ pr: undefined, artigosPublicados: 20, agora: AGORA })
  expect(d.acao).toBe('nada')
  expect(d.motivo).toContain('inválid')
})

test('não altera o objeto que recebe', () => {
  const p = pr({ criadoEm: haHoras(60) })
  const copia = JSON.stringify(p)
  decidir({ pr: p, artigosPublicados: 20, agora: AGORA })
  expect(JSON.stringify(p)).toBe(copia)
})
