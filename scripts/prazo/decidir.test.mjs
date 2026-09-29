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
  jaAvisado: false,
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
  expect(d.motivo).toContain('9')
  expect(d.motivo).toContain('10')
})

test('a rampa conta com os artigos deste PR', () => {
  // 8 publicados + 3 neste PR = 11, passa dos 10
  expect(acao({}, 8)).toBe('juntar')
})

test('exatamente 10 ainda não chega', () => {
  expect(acao({}, 7)).toBe('nada')
})

test('não faz nada antes das 24 horas', () => {
  expect(acao({ criadoEm: haHoras(3) })).toBe('nada')
})

test('avisa às 24 horas', () => {
  expect(acao({ criadoEm: haHoras(25) })).toBe('avisar')
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
  expect(acao({ criadoEm: haHoras(25), comentariosHumanos: 1 })).toBe('nada')
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
  expect(acao({ criadoEm: haHoras(24) })).toBe('avisar')
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
  expect(acao({ criadoEm })).toBe('avisar')
})

test('entre as 24 e as 48 horas o build não é pedido: só se avisa', () => {
  expect(acao({ criadoEm: haHoras(30), buildVerde: null })).toBe('avisar')
})

test('passadas as 48 horas, quem já foi avisado é juntado na mesma', () => {
  expect(acao({ criadoEm: haHoras(60), jaAvisado: true })).toBe('juntar')
})

test('passadas as 48 horas, quem nunca foi avisado (o workflow esteve parado) é juntado', () => {
  expect(acao({ criadoEm: haHoras(200), jaAvisado: false })).toBe('juntar')
})

/* A rampa */

test('a rampa: com 0 publicados e 3 neste PR ainda não chega', () => {
  const d = decidir({ pr: pr({ criadoEm: haHoras(500) }), artigosPublicados: 0, agora: AGORA })
  expect(d.acao).toBe('nada')
  expect(d.motivo).toContain('rampa')
})

test('a rampa: 8 publicados e 3 neste PR passam (11), 7 e 3 não (10)', () => {
  expect(acao({}, 8)).toBe('juntar')
  expect(acao({}, 7)).toBe('nada')
})

test('a rampa manda mesmo quando tudo o resto está pronto para juntar', () => {
  expect(acao({ criadoEm: haHoras(500), buildVerde: true }, 0)).toBe('nada')
})

test('a rampa trava também o aviso e o pedido de build', () => {
  expect(acao({ criadoEm: haHoras(30) }, 0)).toBe('nada')
  expect(acao({ criadoEm: haHoras(60), buildVerde: null }, 0)).toBe('nada')
})

test('a rampa lê o número de artigos, não o número do PR nem outro campo', () => {
  // 20 publicados e 1 artigo: o total é 21. Com 9 publicados e 1 artigo seria 10.
  expect(acao({ artigos: 1 }, 9)).toBe('nada')
  expect(acao({ artigos: 1 }, 10)).toBe('juntar')
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

test('um número negativo de artigos não é uma forma de furar a rampa', () => {
  // 20 publicados e -3 dava 17, acima de 10; o que deve pesar é que -3 não existe
  expect(acao({ artigos: -3, criadoEm: haHoras(500) })).toBe('nada')
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
  expect(acao({ rascunho: true, criadoEm: haHoras(30) })).toBe('nada')
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

test('jaAvisado só interessa à fase das 24 horas: depois das 48 já não conta', () => {
  // O aviso só interessa à fase das 24 horas. Depois das 48 já não conta.
  expect(acao({ criadoEm: haHoras(60), jaAvisado: undefined })).toBe('juntar')
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
  expect(acao({ criadoEm: haHoras(30), buildVerde: false })).toBe('avisar')
})

test('a decisão vem sempre com um motivo em texto', () => {
  const casos = [
    pr(),
    pr({ criadoEm: haHoras(3) }),
    pr({ criadoEm: haHoras(30) }),
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
