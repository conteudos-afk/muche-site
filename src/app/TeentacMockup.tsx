import { useEffect, useRef, useState } from "react"
import { useLang, COPY } from "./i18n"
import { GOLD, SANS } from "./blog/tokens"
import { linkProps, type OnNavigate } from "./blog/navigate"
import { legalPath } from "../../scripts/legal.mjs"

/* ─── Teentac portfolio mockup — real site loaded inside the laptop screen ───
   The screen in the mockup photo is a slightly rotated trapezoid (real
   perspective, not a parallelogram — its diagonals' midpoints don't
   coincide), so a best-fit *affine* transform (no perspective term) leaves a
   visible ~10px-per-corner residual, which reads as the whole overlay
   sitting slightly crooked relative to the bezel. We corner-pin instead with
   a true projective transform (unit-square-to-quad, Heckbert's classic
   mapping) expressed as a CSS matrix3d, which matches all four measured
   corners exactly. The four corners are re-projected into the container's
   own box on every resize using the same math the browser uses for
   object-fit: cover, so the fit stays correct at any card width/height.

   ─── O site só abre quando o visitante o pede ───────────────────────────────
   Antes, o iframe era criado assim que a secção se aproximava do ecrã (um
   `IntersectionObserver` com 800px de margem), e o browser de quem passava
   por ali contactava o teentac.pt sem ter feito nada: o Teentac ficava com o
   IP, e podia definir cookies, sem aviso e sem consentimento.

   Agora, até haver um clique, o que existe no ecrã do portátil é um botão —
   no mesmo plano em perspetiva, para o efeito ser o mesmo — que diz o que vai
   acontecer. O `<iframe>` só é criado depois do clique; até lá não há
   elemento, e portanto nenhum pedido. É um `<button>` a sério, por isso
   alcança-se com o teclado e abre com Enter ou Espaço. */
export const TEENTAC_IMG_W = 1920
export const TEENTAC_IMG_H = 1440
export const TEENTAC_SCREEN_CORNERS: { tl: [number, number]; tr: [number, number]; br: [number, number]; bl: [number, number] } = {
  tl: [625.7, 358.1],
  tr: [1490.8, 334.8],
  br: [1452.4, 910.7],
  bl: [550.6, 898.6],
}

/* O tamanho da página dentro do ecrã, antes de a transformação a encolher e a
   inclinar para encaixar nos quatro cantos. */
export const TEENTAC_IFRAME_W = 1280
export const TEENTAC_IFRAME_H = 800

// Classic unit-square (0,0)-(1,0)-(1,1)-(0,1) -> quad projective mapping.
export function squareToQuad(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) {
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3
  let a: number, b: number, d: number, e: number, g: number, h: number
  if (dx3 === 0 && dy3 === 0) {
    a = x1 - x0; b = x2 - x1; d = y1 - y0; e = y2 - y1; g = 0; h = 0
  } else {
    const denom = dx1 * dy2 - dx2 * dy1
    g = (dx3 * dy2 - dx2 * dy3) / denom
    h = (dx1 * dy3 - dx3 * dy1) / denom
    a = x1 - x0 + g * x1
    b = x3 - x0 + h * x3
    d = y1 - y0 + g * y1
    e = y3 - y0 + h * y3
  }
  return { a, b, c: x0, d, e, f: y0, g, h }
}

/* O `matrix3d` que leva um ecrã de `IFRAME_W × IFRAME_H` aos quatro cantos do
   ecrã do portátil, para uma caixa `box` (a do cartão). `null` enquanto a caixa
   não foi medida. */
export function teentacMatrix(box: { w: number; h: number } | null): string | null {
  if (!box || box.w === 0 || box.h === 0) return null
  // Same math as object-fit: cover, so the corners stay locked to the
  // laptop's actual screen regardless of how the photo itself is cropped.
  const scale = Math.max(box.w / TEENTAC_IMG_W, box.h / TEENTAC_IMG_H)
  const offsetX = (box.w - TEENTAC_IMG_W * scale) / 2
  const offsetY = (box.h - TEENTAC_IMG_H * scale) / 2
  const toBox = ([px, py]: [number, number]): [number, number] => [offsetX + px * scale, offsetY + py * scale]
  const [x0, y0] = toBox(TEENTAC_SCREEN_CORNERS.tl)
  const [x1, y1] = toBox(TEENTAC_SCREEN_CORNERS.tr)
  const [x2, y2] = toBox(TEENTAC_SCREEN_CORNERS.br)
  const [x3, y3] = toBox(TEENTAC_SCREEN_CORNERS.bl)
  const sq = squareToQuad(x0, y0, x1, y1, x2, y2, x3, y3)
  return `matrix3d(${sq.a / TEENTAC_IFRAME_W}, ${sq.d / TEENTAC_IFRAME_W}, 0, ${sq.g / TEENTAC_IFRAME_W}, ${sq.b / TEENTAC_IFRAME_H}, ${sq.e / TEENTAC_IFRAME_H}, 0, ${sq.h / TEENTAC_IFRAME_H}, 0, 0, 1, 0, ${sq.c}, ${sq.f}, 0, 1)`
}

/* Os dois filhos do ecrã — o botão e o iframe — ocupam o mesmo retângulo e
   levam a mesma transformação. */
const ecra = (matrix3d: string): React.CSSProperties => ({
  position: "absolute", left: 0, top: 0, width: `${TEENTAC_IFRAME_W}px`, height: `${TEENTAC_IFRAME_H}px`,
  transformOrigin: "0 0", transform: matrix3d,
})

/* ─── O que se vê no ecrã do portátil até haver um clique ────────────────────
   Tudo aqui está desenhado em 1280×800 e depois encolhido pela transformação
   (a ~0.3–0.4 em ecrãs de computador), por isso os tamanhos parecem enormes:
   44px de botão são cerca de 16px no ecrã. */
const css = `
.teentac-carregar {
  display: inline-flex; align-items: center; gap: 28px;
  padding: 26px 48px; cursor: pointer;
  background: transparent; color: ${GOLD};
  border: 3px solid ${GOLD};
  font-family: ${SANS}; font-weight: 400; font-size: 44px; line-height: 1.1;
  letter-spacing: 4px; text-transform: uppercase;
  transition: background 0.25s, color 0.25s;
}
.teentac-carregar:hover, .teentac-carregar:focus-visible { background: ${GOLD}; color: #0b1c22; }
.teentac-carregar:focus-visible { outline: 5px solid #fff; outline-offset: 8px; }
.teentac-mais { color: ${GOLD}; text-decoration: underline; text-underline-offset: 6px; text-decoration-thickness: 2px; }
.teentac-mais:focus-visible { outline: 4px solid #fff; outline-offset: 6px; }
`

export function TeentacPreview({ matrix3d, loaded, onLoad, onNavigate }: {
  matrix3d: string
  loaded: boolean
  onLoad: () => void
  onNavigate?: OnNavigate
}) {
  const lang = useLang()
  const c = COPY[lang].portfolio.teentac
  const iframeRef = useRef<HTMLIFrameElement>(null)

  /* O botão desaparece com o clique, e com ele o foco: sem isto, quem usa o
     teclado voltava ao princípio da página. */
  useEffect(() => { if (loaded) iframeRef.current?.focus() }, [loaded])

  if (loaded) {
    return (
      <iframe
        ref={iframeRef}
        src="https://www.teentac.pt/"
        title={c.title}
        className="absolute"
        style={{ ...ecra(matrix3d), border: 0, background: "#fff" }}
      />
    )
  }

  return (
    <div
      role="group"
      aria-label={c.title}
      style={{
        ...ecra(matrix3d),
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "44px",
        padding: "0 120px", textAlign: "center",
        background: "radial-gradient(ellipse at 50% 40%, #16303a 0%, #0b1c22 75%)",
      }}
    >
      <style>{css}</style>
      <button type="button" className="teentac-carregar" onClick={onLoad}>
        <span aria-hidden="true">▶</span>
        <span>{c.load}</span>
      </button>
      <p style={{ margin: 0, maxWidth: "980px", color: "#fff", opacity: 0.78, fontFamily: SANS, fontWeight: 300, fontSize: "38px", lineHeight: 1.4 }}>
        {c.note}{" "}
        <a className="teentac-mais" {...linkProps(legalPath("privacy", lang), onNavigate)}>{c.more}</a>
      </p>
    </div>
  )
}

export function TeentacInteractiveMockup({ img, className, onNavigate }: { img: string; className?: string; onNavigate?: OnNavigate }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ w: number; h: number } | null>(null)
  /* Só o clique o faz passar a `true`. Não há nenhum outro caminho — nem
     `IntersectionObserver`, nem temporizador, nem o scroll. */
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setBox({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const matrix3d = teentacMatrix(box)

  return (
    <div ref={containerRef} className={className} style={{ position: "relative" }}>
      <img src={img} alt="Teentac" className="size-full object-cover" style={{ position: "absolute", inset: 0 }} />
      {matrix3d && (
        <TeentacPreview matrix3d={matrix3d} loaded={loaded} onLoad={() => setLoaded(true)} onNavigate={onNavigate} />
      )}
    </div>
  )
}
