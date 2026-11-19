// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { V4VMockup, v4vMatrix, V4V_DEVICES, TEENTAC_PHONE, SITE_URLS, V4V_URL, type V4VDevice, type V4VSite } from './V4VMockup'
import { squareToQuad } from './TeentacMockup'
import { LangProvider, COPY } from './i18n'

/* ─── O iframe da V4V só existe depois de um clique ──────────────────────────
   Quem passa pela secção do portfólio não pediu para o vision4value.com
   receber o seu IP nem para lá guardar cookies. Estes testes montam o
   componente a sério, num DOM, e olham para o que lá está. */
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

let raiz: Root
let host: HTMLElement

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  ;(globalThis as any).ResizeObserver = class {
    constructor(private cb: (e: any[]) => void) {}
    observe() { this.cb([{ contentRect: { width: 1000, height: 562.5 } }]) }
    disconnect() {}
  }
  ;(globalThis as any).IntersectionObserver = class {
    constructor(private cb: (e: any[]) => void) {}
    observe() { this.cb([{ isIntersecting: true }]) }
    disconnect() {}
  }
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

function montar(device: V4VDevice, interactive: boolean, lang: 'pt' | 'en' = 'pt', site: V4VSite = 'v4v') {
  localStorage.setItem('muche-lang', lang)
  raiz = createRoot(host)
  act(() => {
    raiz.render(
      <LangProvider>
        <V4VMockup site={site} device={device} interactive={interactive} className="size-full" />
      </LangProvider>
    )
  })
}

const iframe = () => host.querySelector('iframe')
const botao = () => host.querySelector('button')

test('antes de qualquer interação há um botão e não há iframe nem pedido à V4V', () => {
  for (const device of ['laptop', 'phone'] as const) {
    montar(device, true)
    expect(iframe(), device).toBeNull()
    expect(botao(), device).not.toBeNull()
    expect(host.innerHTML, device).not.toContain('vision4value.com/"')
    expect(host.innerHTML, device).not.toContain('src="https://')
    act(() => raiz.unmount())
    host.innerHTML = ''
  }
})

test('o clique cria o iframe da V4V, com sandbox, e tira o botão', () => {
  montar('phone', true)
  act(() => { botao()!.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
  const f = iframe()!
  expect(f).not.toBeNull()
  expect(f.getAttribute('src')).toBe(V4V_URL)
  expect(f.getAttribute('src')).toBe('https://www.vision4value.com/')
  expect(f.getAttribute('sandbox')).toContain('allow-scripts')
  expect(f.getAttribute('sandbox')).not.toContain('allow-top-navigation')
  expect(f.getAttribute('referrerpolicy')).toBe('no-referrer')
  expect(botao()).toBeNull()
  expect(f.style.width).toBe(`${V4V_DEVICES.phone.iframeW}px`)
  expect(f.style.height).toBe(`${V4V_DEVICES.phone.iframeH}px`)
})

test('sem `interactive` (tablet) nunca há botão nem iframe', () => {
  montar('laptop', false)
  expect(botao()).toBeNull()
  expect(iframe()).toBeNull()
  /* Mostra só a moldura e a imagem local. */
  expect(host.querySelectorAll('img').length).toBe(2)
})

test('o botão e o aviso dizem em cada idioma o que o clique faz', () => {
  for (const lang of ['pt', 'en'] as const) {
    montar('laptop', true, lang)
    const c = COPY[lang].portfolio.v4v
    expect(botao()!.textContent!.replace(/‑/g, '-')).toContain(c.load)
    expect(host.textContent).toContain('vision4value.com')
    expect(host.textContent).toContain(c.more)
    expect(host.innerHTML).toContain('href=')
    act(() => raiz.unmount())
    host.innerHTML = ''
  }
  expect(COPY.pt.portfolio.v4v.load).not.toBe(COPY.en.portfolio.v4v.load)
})

test('a moldura não apanha cliques: quem navega usa o site, não a imagem', () => {
  montar('laptop', true)
  const moldura = Array.from(host.querySelectorAll('img')).find(i => i.getAttribute('src')!.includes('frame'))!
  expect(moldura.style.pointerEvents).toBe('none')
})

/* A matriz tem de levar os quatro cantos do ecrã desenhado aos quatro cantos
   medidos na moldura (depois do mesmo corte `cover` que o browser faz). */
function aplicar(m: string, x: number, y: number) {
  const n = m.match(/matrix3d\((.*)\)/)![1].split(',').map(Number)
  const w = n[3] * x + n[7] * y + n[15]
  return [(n[0] * x + n[4] * y + n[12]) / w, (n[1] * x + n[5] * y + n[13]) / w]
}

test('os cantos do ecrã vão para os cantos medidos, nos dois dispositivos', () => {
  for (const device of ['laptop', 'phone'] as const) {
    const d = V4V_DEVICES[device]
    const box = { w: d.w * 0.5, h: d.h * 0.5 }
    const m = v4vMatrix(device, box)!
    const alvo = [[0, 0], [d.iframeW, 0], [d.iframeW, d.iframeH], [0, d.iframeH]]
    alvo.forEach(([x, y], i) => {
      const [px, py] = aplicar(m, x, y)
      expect(px, `${device} canto ${i} x`).toBeCloseTo(d.corners[i][0] * 0.5, 3)
      expect(py, `${device} canto ${i} y`).toBeCloseTo(d.corners[i][1] * 0.5, 3)
    })
  }
  expect(v4vMatrix('laptop', null)).toBeNull()
  expect(v4vMatrix('phone', { w: 0, h: 500 })).toBeNull()
  expect(squareToQuad(0, 0, 1, 0, 1, 1, 0, 1).g).toBe(0)
})

test('o Teentac em telemóvel segue a mesma regra: só há iframe depois do clique', () => {
  montar('phone', true, 'pt', 'teentac')
  expect(iframe()).toBeNull()
  expect(host.innerHTML).not.toContain('teentac.pt/"')
  expect(host.textContent).toContain('teentac.pt')
  act(() => { botao()!.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
  expect(iframe()!.getAttribute('src')).toBe(SITE_URLS.teentac)
  expect(iframe()!.getAttribute('src')).toBe('https://www.teentac.pt/')
  expect(iframe()!.style.height).toBe(`${TEENTAC_PHONE.iframeH}px`)
  expect(botao()).toBeNull()
})

test('o ecrã do telemóvel do Teentac tem a proporção do ecrã que lá vai', () => {
  const [[x0, y0], [x1], [, y2]] = TEENTAC_PHONE.corners
  expect((x1 - x0) / (y2 - y0)).toBeCloseTo(TEENTAC_PHONE.iframeW / TEENTAC_PHONE.iframeH, 2)
  const m = v4vMatrix('phone', { w: TEENTAC_PHONE.w, h: TEENTAC_PHONE.h }, 'teentac')!
  expect(m).toContain('matrix3d')
  expect(y0).toBeGreaterThan(0)
})
