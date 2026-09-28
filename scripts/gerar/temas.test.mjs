import { expect, test } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { lerTemas, proximosTemas, marcarUsados, validarTemas } from './temas.mjs'

const YAML_EXEMPLO = `temas:
  - slug: quanto-custa-video-marca
    tema: "Quanto custa um vídeo de marca"
    angulo: "O que faz o preço variar, e porque é que o orçamento mais baixo sai caro"
    categoria: "Video Production"
    prioridade: 1
    estado: por-escrever
  - slug: manual-de-marca-o-que-leva
    tema: "O que leva um manual de marca"
    angulo: "Secção a secção, o que é mesmo preciso e o que é enchimento"
    categoria: "Branding & Visual Identity"
    prioridade: 2
    estado: por-escrever
  - slug: ja-escrito
    tema: "Um tema já usado"
    angulo: "Não deve voltar a sair"
    categoria: "Graphic Design"
    prioridade: 1
    estado: publicado
`

function ficheiroTemporario(conteudo) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'temas-'))
  const ficheiro = path.join(dir, '_temas.yml')
  fs.writeFileSync(ficheiro, conteudo, 'utf-8')
  return ficheiro
}

test('lê os temas do ficheiro', () => {
  const temas = lerTemas(ficheiroTemporario(YAML_EXEMPLO))
  expect(temas).toHaveLength(3)
  expect(temas[0].slug).toBe('quanto-custa-video-marca')
  expect(temas[0].prioridade).toBe(1)
})

test('escolhe por prioridade e ignora os já publicados', () => {
  const temas = lerTemas(ficheiroTemporario(YAML_EXEMPLO))
  const escolhidos = proximosTemas(temas, 3)
  expect(escolhidos.map(t => t.slug)).toEqual([
    'quanto-custa-video-marca',
    'manual-de-marca-o-que-leva',
  ])
})

test('devolve menos do que o pedido quando a lista está a acabar', () => {
  const temas = lerTemas(ficheiroTemporario(YAML_EXEMPLO))
  expect(proximosTemas(temas, 10)).toHaveLength(2)
})

test('marcar como usado sobrevive à releitura', () => {
  const ficheiro = ficheiroTemporario(YAML_EXEMPLO)
  marcarUsados(ficheiro, ['quanto-custa-video-marca'])
  const temas = lerTemas(ficheiro)
  expect(temas.find(t => t.slug === 'quanto-custa-video-marca').estado).toBe('publicado')
  expect(proximosTemas(temas, 3).map(t => t.slug)).toEqual(['manual-de-marca-o-que-leva'])
})

test('marcar como usado preserva os comentários do ficheiro', () => {
  const ficheiro = ficheiroTemporario('# Um comentário que tem de sobreviver\n' + YAML_EXEMPLO)
  marcarUsados(ficheiro, ['quanto-custa-video-marca'])
  expect(fs.readFileSync(ficheiro, 'utf-8')).toContain('# Um comentário que tem de sobreviver')
})

test('acusa uma categoria inválida', () => {
  const temas = [{ slug: 'a', tema: 'A', angulo: 'B', categoria: 'Inventada', prioridade: 1, estado: 'por-escrever' }]
  expect(validarTemas(temas).join(' ')).toContain('Inventada')
})

test('acusa um slug repetido', () => {
  const t = { tema: 'A', angulo: 'B', categoria: 'Graphic Design', prioridade: 1, estado: 'por-escrever' }
  const problemas = validarTemas([{ ...t, slug: 'igual' }, { ...t, slug: 'igual' }])
  expect(problemas.join(' ')).toContain('igual')
})

test('acusa um campo em falta', () => {
  const problemas = validarTemas([{ slug: 'a', tema: '', angulo: 'B', categoria: 'Graphic Design', prioridade: 1, estado: 'por-escrever' }])
  expect(problemas.join(' ')).toContain('tema')
})

test('a lista real do repositório é válida', () => {
  const temas = lerTemas(new URL('../../content/blog/_temas.yml', import.meta.url).pathname)
  expect(validarTemas(temas)).toEqual([])
  expect(temas.length).toBeGreaterThanOrEqual(40)
})
