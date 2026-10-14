// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  TeentacInteractiveMockup, teentacMatrix, TEENTAC_IMG_W, TEENTAC_IMG_H, TEENTAC_SCREEN_CORNERS,
  TEENTAC_IFRAME_W, TEENTAC_IFRAME_H,
} from './TeentacMockup'
import { LangProvider, COPY } from './i18n'

/* ─── O iframe do Teentac só existe depois de um clique ──────────────────────
   Quem passa pela secção do portfólio não pediu para o teentac.pt receber o
   seu IP nem para lá guardar cookies. Estes testes montam o componente a
   sério, num DOM, e olham para o que lá está. */
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

let raiz: Root
let host: HTMLElement
let observadores: Array<{ observe: ReturnType<typeof vi.fn> }>

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  observadores = []
  /* O componente mede a caixa com um ResizeObserver; o jsdom não tem. Este
     entrega logo uma caixa de 1000×560, que é o que põe o ecrã do portátil
     no sítio (sem caixa medida não há ecrã). */
  ;(globalThis as any).ResizeObserver = class {
    constructor(private cb: (e: any[]) => void) {}
    observe() { this.cb([{ contentRect: { width: 1000, height: 560 } }]) }
    disconnect() {}
  }
  /* E um IntersectionObserver que diz que tudo está à vista: era o que
     disparava o carregamento antigo. Se alguma vez voltar a haver um, este
     teste apanha-o. */
  ;(globalThis as any).IntersectionObserver = class {
    constructor(private cb: (e: any[]) => void) {}
    observe() { this.cb([{ isIntersecting: true }]) }
    disconnect() {}
  }
  /* O Node recente traz um `localStorage` global que, sem ficheiro, não
     funciona e tapa o do jsdom. Aqui basta um de memória. */
  const guardado = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => guardado.get(k) ?? null,
    setItem: (k: string, v: string) => { guardado.set(k, v) },
    removeItem: (k: string) => { guardado.delete(k) },
    clear: () => guardado.clear(),
  })
})

afterEach(() => {
  if (raiz) act(() => raiz.unmount())
  host.remove()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function montar(lang: 'pt' | 'en' = 'pt', onNavigate?: (href: string) => void) {
  localStorage.setItem('muche-lang', lang)
  raiz = createRoot(host)
  act(() => {
    raiz.render(
      <LangProvider>
        <TeentacInteractiveMockup img="/laptop.png" className="size-full" onNavigate={onNavigate} />
      </LangProvider>
    )
  })
}

const iframe = () => host.querySelector('iframe')
const botao = () => host.querySelector('button')!

test('antes de qualquer interação há um botão e não há iframe', () => {
  montar()
  expect(iframe()).toBeNull()
  expect(botao()).not.toBeNull()
  /* Nem sequer um elemento que aponte para o teentac.pt. */
  expect(host.innerHTML).not.toContain('src="https://www.teentac.pt')
})

test('nem o tempo nem o scroll carregam o site: um IntersectionObserver a dizer «à vista» e um minuto depois, nada', () => {
  vi.useFakeTimers()
  montar()
  act(() => { vi.advanceTimersByTime(60_000) })
  act(() => { window.dispatchEvent(new Event('scroll')); window.dispatchEvent(new Event('resize')) })
  expect(iframe()).toBeNull()
})

test('o clique cria o iframe do Teentac e tira o botão', () => {
  montar()
  act(() => { botao().click() })
  const f = iframe()!
  expect(f).not.toBeNull()
  expect(f.getAttribute('src')).toBe('https://www.teentac.pt/')
  expect(host.querySelector('button')).toBeNull()
})

test('o iframe leva a mesma transformação que a matriz do ecrã do portátil', () => {
  montar()
  act(() => { botao().click() })
  const esperado = teentacMatrix({ w: 1000, h: 560 })!
  expect(esperado).toMatch(/^matrix3d\(/)
  expect(iframe()!.style.transform).toBe(esperado)
  expect(iframe()!.style.width).toBe(`${TEENTAC_IFRAME_W}px`)
})

test('o botão é um <button> a sério: alcança-se com o teclado e tem nome acessível', () => {
  montar()
  const b = botao()
  expect(b.tagName).toBe('BUTTON')
  expect(b.getAttribute('type')).toBe('button')
  expect(b.disabled).toBe(false)
  /* `tabindex="-1"` tirava-o da ordem do teclado. */
  expect(b.tabIndex).toBeGreaterThanOrEqual(0)
  expect(b.textContent).toContain(COPY.pt.portfolio.teentac.load)
  b.focus()
  expect(document.activeElement).toBe(b)
})

test('depois do clique o foco passa para o iframe, em vez de se perder', () => {
  montar()
  botao().focus()
  act(() => { botao().click() })
  expect(document.activeElement).toBe(iframe())
})

test('o texto diz o que o clique faz, nos dois idiomas', () => {
  for (const lang of ['pt', 'en'] as const) {
    act(() => raiz?.unmount())
    host.innerHTML = ''
    montar(lang)
    const c = COPY[lang].portfolio.teentac
    expect(host.textContent).toContain(c.load)
    expect(host.textContent).toContain(c.note)
    expect(host.textContent).toContain('teentac.pt')
    expect(host.querySelector('[role="group"]')!.getAttribute('aria-label')).toBe(c.title)
  }
  expect(COPY.pt.portfolio.teentac.load).not.toBe(COPY.en.portfolio.teentac.load)
})

test('a ligação «saber mais» aponta para a política de privacidade do idioma e não carrega o iframe', () => {
  const onNavigate = vi.fn()
  montar('pt', onNavigate)
  const a = host.querySelector('a')!
  expect(a.getAttribute('href')).toBe('/privacidade/')
  act(() => { a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })) })
  expect(onNavigate).toHaveBeenCalledWith('/privacidade/')
  expect(iframe()).toBeNull()

  act(() => raiz.unmount())
  host.innerHTML = ''
  montar('en')
  expect(host.querySelector('a')!.getAttribute('href')).toBe('/en/privacy/')
})

/* ─── A matemática do canto-a-canto ──────────────────────────────────────────
   O ecrã do portátil é um trapézio, e o `matrix3d` tem de levar os quatro
   cantos da página aos quatro cantos desse trapézio, seja qual for o recorte
   da fotografia. Aplica-se a matriz aos cantos e compara-se. */
function aplicar(m: number[], x: number, y: number): [number, number] {
  const w = m[3] * x + m[7] * y + m[15]
  return [(m[0] * x + m[4] * y + m[12]) / w, (m[1] * x + m[5] * y + m[13]) / w]
}

function cantosEsperados(box: { w: number; h: number }) {
  const s = Math.max(box.w / TEENTAC_IMG_W, box.h / TEENTAC_IMG_H)
  const ox = (box.w - TEENTAC_IMG_W * s) / 2, oy = (box.h - TEENTAC_IMG_H * s) / 2
  const f = ([px, py]: [number, number]): [number, number] => [ox + px * s, oy + py * s]
  const c = TEENTAC_SCREEN_CORNERS
  return [f(c.tl), f(c.tr), f(c.br), f(c.bl)]
}

test('a matriz leva os quatro cantos da página aos quatro cantos do ecrã, em qualquer caixa', () => {
  /* Larga (desktop), e uma caixa estreita que obriga a recortar a fotografia. */
  for (const box of [{ w: 1088, h: 612 }, { w: 640, h: 360 }, { w: 300, h: 533 }]) {
    const texto = teentacMatrix(box)!
    const m = texto.slice('matrix3d('.length, -1).split(',').map(Number)
    expect(m).toHaveLength(16)
    const W = TEENTAC_IFRAME_W, H = TEENTAC_IFRAME_H
    const obtidos = [aplicar(m, 0, 0), aplicar(m, W, 0), aplicar(m, W, H), aplicar(m, 0, H)]
    cantosEsperados(box).forEach(([ex, ey], i) => {
      expect(obtidos[i][0]).toBeCloseTo(ex, 6)
      expect(obtidos[i][1]).toBeCloseTo(ey, 6)
    })
  }
})

test('sem caixa medida (ou de tamanho zero) não há matriz', () => {
  expect(teentacMatrix(null)).toBeNull()
  expect(teentacMatrix({ w: 0, h: 500 })).toBeNull()
  expect(teentacMatrix({ w: 500, h: 0 })).toBeNull()
})
