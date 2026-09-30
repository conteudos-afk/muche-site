/* ─── A lista de temas ───────────────────────────────────────────────────────
   O gerador não inventa assuntos: tira-os daqui, por ordem de prioridade. É o
   único ficheiro do circuito que é escrito à mão, e por isso o `marcarUsados`
   edita o documento em vez de o reescrever — os comentários que a equipa lá
   puser têm de sobreviver a cada execução. ───────────────────────────────── */
import fs from 'node:fs'
import { parseDocument } from 'yaml'
import { BLOG_CATEGORIES } from '../../src/lib/blog/categories.ts'

const CAMPOS = ['slug', 'tema', 'angulo', 'categoria']
const ESTADOS = ['por-escrever', 'publicado']

export function lerTemas(caminho) {
  const doc = parseDocument(fs.readFileSync(caminho, 'utf-8'))
  const temas = doc.toJS()?.temas
  if (!Array.isArray(temas)) {
    throw new Error(`${caminho}: esperava uma chave "temas" com uma lista`)
  }
  return temas
}

export function validarTemas(temas) {
  const problemas = []
  const vistos = new Set()

  for (const [i, tema] of temas.entries()) {
    const onde = `tema ${i + 1} (${tema.slug || 'sem slug'})`

    for (const campo of CAMPOS) {
      if (!String(tema[campo] ?? '').trim()) problemas.push(`${onde}: falta o campo "${campo}"`)
    }
    if (!/^[a-z0-9-]+$/.test(String(tema.slug ?? ''))) {
      problemas.push(`${onde}: o slug só pode ter minúsculas, números e hífenes`)
    }
    if (vistos.has(tema.slug)) problemas.push(`${onde}: o slug "${tema.slug}" está repetido`)
    vistos.add(tema.slug)

    if (tema.categoria && !BLOG_CATEGORIES.includes(tema.categoria)) {
      problemas.push(`${onde}: a categoria "${tema.categoria}" não existe — usa uma de: ${BLOG_CATEGORIES.join(', ')}`)
    }
    if (!Number.isInteger(tema.prioridade)) {
      problemas.push(`${onde}: a prioridade tem de ser um número inteiro`)
    }
    if (!ESTADOS.includes(tema.estado)) {
      problemas.push(`${onde}: o estado tem de ser ${ESTADOS.join(' ou ')}`)
    }
  }
  return problemas
}

/* Por prioridade, e dentro da mesma prioridade pela ordem do ficheiro: quem
   escreveu a lista pô-los por uma razão. Esta segunda regra não precisa de
   código: `Array.prototype.sort` é estável desde o ES2019, por isso os temas
   com a mesma prioridade ficam onde estavam. Quem a garante é o teste
   «dentro da mesma prioridade, a ordem do ficheiro», não um desempate. */
export function proximosTemas(temas, quantos) {
  return temas
    .filter(tema => tema.estado === 'por-escrever')
    .sort((a, b) => a.prioridade - b.prioridade)
    .slice(0, quantos)
}

/* Edita o documento em vez de o reescrever, para não perder comentários. */
export function marcarUsados(caminho, slugs) {
  const doc = parseDocument(fs.readFileSync(caminho, 'utf-8'))
  const lista = doc.get('temas')
  if (!lista) throw new Error(`${caminho}: não tem a chave "temas"`)

  for (const item of lista.items) {
    if (slugs.includes(item.get('slug'))) item.set('estado', 'publicado')
  }
  fs.writeFileSync(caminho, String(doc), 'utf-8')
}
