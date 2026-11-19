import { useEffect, useRef, useState } from "react"
import { useLang, COPY } from "./i18n"
import { GOLD, SANS } from "./blog/tokens"
import { linkProps, type OnNavigate } from "./blog/navigate"
import { legalPath } from "../../scripts/legal.mjs"
import { squareToQuad } from "./TeentacMockup"
import laptopFrame from "@/imports/V4V/laptop_frame.webp"
import phoneFrame from "@/imports/V4V/phone_frame.webp"
import laptopPoster from "@/imports/V4V/poster_laptop.jpg"
import phonePoster from "@/imports/V4V/poster_phone.jpg"
import teentacPhoneFrame from "@/imports/Teentac/phone_frame.webp"
import teentacPhonePoster from "@/imports/Teentac/poster_phone.jpg"

/* ─── V4V portfolio mockup — o site real dentro do ecrã de um portátil/telemóvel
   A moldura (`*_frame.webp`) é a fotografia do dispositivo com o ecrã
   RECORTADO (transparente): o site vive por baixo e a moldura fica por cima,
   com o entalhe da câmara, os cantos arredondados e a borda. A moldura não
   apanha cliques (`pointer-events: none`), por isso quem navega está a usar o
   site a sério.

   Os quatro cantos do ecrã foram medidos na própria imagem (ajuste de retas às
   quatro arestas, erro < 1 px). No portátil o ecrã é um trapézio em
   perspetiva, por isso usamos a mesma projeção do Teentac (`squareToQuad`,
   exportada de TeentacMockup); no telemóvel, de frente, é um retângulo.

   ─── O site só abre quando o visitante o pede ───────────────────────────────
   Tal como no Teentac: até haver um clique, o ecrã mostra uma imagem local
   (um retrato do site) e um botão que diz o que vai acontecer. O `<iframe>` só
   é criado depois do clique; até lá não há elemento, e portanto nenhum pedido
   ao vision4value.com. Sem `interactive` (tablets) nunca há iframe. */
export const V4V_URL = "https://www.vision4value.com/"

/* O mesmo mecanismo serve o Teentac em telemóvel (o portátil do Teentac, em
   computador, é o `TeentacMockup`). Cada site tem o seu endereço, o seu texto
   (`COPY.portfolio.<site>`) e a sua moldura. */
export type V4VSite = "v4v" | "teentac"
export const SITE_URLS: Record<V4VSite, string> = { v4v: V4V_URL, teentac: "https://www.teentac.pt/" }

export type V4VDevice = "laptop" | "phone"

type Quad = [[number, number], [number, number], [number, number], [number, number]]
type DeviceCfg = {
  frame: string; poster: string
  w: number; h: number; corners: Quad
  iframeW: number; iframeH: number
}
export const V4V_DEVICES: Record<V4VDevice, DeviceCfg> = {
  laptop: {
    frame: laptopFrame, poster: laptopPoster,
    w: 1920, h: 1080,
    corners: [[156.6, 168.4], [1080.0, 76.9], [1146.9, 701.2], [252.9, 873.8]],
    iframeW: 1440, iframeH: 900,
  },
  phone: {
    frame: phoneFrame, poster: phonePoster,
    w: 720, h: 1280,
    corners: [[111.4, 100.1], [608.6, 100.1], [608.6, 1177.9], [111.4, 1177.9]],
    iframeW: 360, iframeH: 780,
  },
}

/* Telemóvel de couro do Teentac: visto de cima, o ecrã é um retângulo. */
export const TEENTAC_PHONE: DeviceCfg = {
  frame: teentacPhoneFrame, poster: teentacPhonePoster,
  w: 720, h: 1280,
  corners: [[132.8, 139.5], [587.2, 139.5], [587.2, 1139.6], [132.8, 1139.6]],
  iframeW: 360, iframeH: 792,
}
const deviceCfg = (device: V4VDevice, site: V4VSite): DeviceCfg => (site === "teentac" ? TEENTAC_PHONE : V4V_DEVICES[device])

/* O `matrix3d` que leva o ecrã `iframeW × iframeH` aos quatro cantos do ecrã do
   dispositivo, para uma caixa `box`. A mesma conta do `object-fit: cover` que a
   moldura usa, para os cantos ficarem presos ao ecrã seja qual for o corte. */
export function v4vMatrix(device: V4VDevice, box: { w: number; h: number } | null, site: V4VSite = "v4v"): string | null {
  if (!box || box.w === 0 || box.h === 0) return null
  const d = deviceCfg(device, site)
  const scale = Math.max(box.w / d.w, box.h / d.h)
  const offsetX = (box.w - d.w * scale) / 2
  const offsetY = (box.h - d.h * scale) / 2
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = d.corners.map(([px, py]) => [offsetX + px * scale, offsetY + py * scale] as [number, number])
  const sq = squareToQuad(x0, y0, x1, y1, x2, y2, x3, y3)
  const W = d.iframeW, H = d.iframeH
  return `matrix3d(${sq.a / W}, ${sq.d / W}, 0, ${sq.g / W}, ${sq.b / H}, ${sq.e / H}, 0, ${sq.h / H}, 0, 0, 1, 0, ${sq.c}, ${sq.f}, 0, 1)`
}

const ecra = (cfg: DeviceCfg, matrix3d: string): React.CSSProperties => ({
  position: "absolute", left: 0, top: 0,
  width: `${cfg.iframeW}px`, height: `${cfg.iframeH}px`,
  transformOrigin: "0 0", transform: matrix3d,
})

/* Tamanhos desenhados no espaço do ecrã (1440×900 no portátil, 360×780 no
   telemóvel) e depois encolhidos pela transformação. */
const SIZES: Record<V4VDevice, { gap: number; padX: number; btnFont: number; btnPad: string; btnBorder: number; btnLetter: number; noteFont: number; noteMax: number; outline: number }> = {
  laptop: { gap: 40, padX: 110, btnFont: 46, btnPad: "24px 46px", btnBorder: 3, btnLetter: 4, noteFont: 36, noteMax: 900, outline: 5 },
  phone: { gap: 22, padX: 34, btnFont: 21, btnPad: "13px 24px", btnBorder: 2, btnLetter: 2, noteFont: 17, noteMax: 290, outline: 3 },
}

const css = (s: (typeof SIZES)[V4VDevice]) => `
.v4v-carregar {
  display: inline-flex; align-items: center; gap: ${s.gap * 0.6}px;
  padding: ${s.btnPad}; cursor: pointer;
  background: transparent; color: ${GOLD};
  border: ${s.btnBorder}px solid ${GOLD};
  font-family: ${SANS}; font-weight: 400; font-size: ${s.btnFont}px; line-height: 1.1;
  letter-spacing: ${s.btnLetter}px; text-transform: uppercase;
  transition: background 0.25s, color 0.25s;
}
.v4v-carregar:hover, .v4v-carregar:focus-visible { background: ${GOLD}; color: #0b1c22; }
.v4v-carregar:focus-visible { outline: ${s.outline}px solid #fff; outline-offset: ${s.outline * 1.5}px; }
.v4v-mais { color: ${GOLD}; text-decoration: underline; text-underline-offset: 5px; text-decoration-thickness: 2px; }
.v4v-mais:focus-visible { outline: ${s.outline}px solid #fff; outline-offset: 4px; }
`

export function V4VPreview({ site, device, matrix3d, interactive, loaded, onLoad, onNavigate }: {
  site: V4VSite
  device: V4VDevice
  matrix3d: string
  interactive: boolean
  loaded: boolean
  onLoad: () => void
  onNavigate?: OnNavigate
}) {
  const lang = useLang()
  const c = COPY[lang].portfolio[site]
  const cfg = deviceCfg(device, site)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const s = SIZES[device]

  /* O botão desaparece com o clique, e com ele o foco: sem isto, quem usa o
     teclado voltava ao princípio da página. */
  useEffect(() => { if (loaded) iframeRef.current?.focus() }, [loaded])

  if (loaded) {
    return (
      <iframe
        ref={iframeRef}
        src={SITE_URLS[site]}
        title={c.title}
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        style={{ ...ecra(cfg, matrix3d), border: 0, background: "#fff" }}
      />
    )
  }

  return (
    <div style={ecra(cfg, matrix3d)}>
      <img src={cfg.poster} alt="" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      {interactive && (
        <div
          role="group"
          aria-label={c.title}
          style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: `${s.gap}px`,
            padding: `0 ${s.padX}px`, textAlign: "center",
            background: "radial-gradient(ellipse at 50% 40%, rgba(22,48,58,0.86) 0%, rgba(11,28,34,0.92) 75%)",
          }}
        >
          <style>{css(s)}</style>
          <button type="button" className="v4v-carregar" onClick={onLoad}>
            <span aria-hidden="true">▶</span>
            <span>{c.load.replace(/-/g, "\u2011")}</span>
          </button>
          <p style={{ margin: 0, maxWidth: `${s.noteMax}px`, color: "#fff", opacity: 0.85, fontFamily: SANS, fontWeight: 300, fontSize: `${s.noteFont}px`, lineHeight: 1.4 }}>
            {c.note}{" "}
            <a className="v4v-mais" {...linkProps(legalPath("privacy", lang), onNavigate)}>{c.more}</a>
          </p>
        </div>
      )}
    </div>
  )
}

export function V4VMockup({ site = "v4v", device, interactive, className, onNavigate }: {
  site?: V4VSite
  device: V4VDevice
  interactive: boolean
  className?: string
  onNavigate?: OnNavigate
}) {
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

  const matrix3d = v4vMatrix(device, box, site)

  return (
    <div ref={containerRef} className={className} style={{ position: "relative", overflow: "hidden" }}>
      {matrix3d && (
        <V4VPreview site={site} device={device} matrix3d={matrix3d} interactive={interactive} loaded={loaded} onLoad={() => setLoaded(true)} onNavigate={onNavigate} />
      )}
      <img
        src={deviceCfg(device, site).frame}
        alt={site === "teentac" ? "Teentac" : "V4V"}
        draggable={false}
        className="size-full object-cover"
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      />
    </div>
  )
}
