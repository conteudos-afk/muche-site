import { useRef, useEffect, useState, type ReactNode } from "react"
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, animate, type PanInfo } from "motion/react"
import { RouterProvider, createBrowserRouter, Outlet, useNavigate, useParams, useLocation } from "react-router"
import heroVideo from "@/imports/Hero_video.mp4"
import svgPaths from "@/imports/HomeFinal/svg-kkmjukgdk7"
import imgPort1 from "@/imports/HorizontalScroll/014471abff9def0ea5f6c8ea469567d04bd612e3.png"
import videoDecoProteste from "@/imports/Vi_deo_Natal_DecoPROteste_1200x628.mp4"
import videoLPCC from "@/imports/LPCC_PORTFOLIO.mp4"
import videoOliviaHotel from "@/imports/OliviaHotel.mp4"
// Versões verticais (9:16) — só para mobile/tablet; o desktop usa sempre as
// versões horizontais acima, tal como estavam antes.
import videoDecoProtesteVertical from "@/imports/DecoProteste_vertical.mp4"
import videoLPCCVertical from "@/imports/LPCC_PORTFOLIO_vertical.mp4"
import videoOliviaHotelVertical from "@/imports/OliviaHotel_vertical.mp4"
import imgTeamBg   from "@/imports/Equipa/9e968e30d54dd8c86db81bbd440330d0c8bbd7af.png"
import imgTeamBase from "@/imports/Equipa/014471abff9def0ea5f6c8ea469567d04bd612e3.png"
import imgTeamOv1  from "@/imports/Equipa/dbd736375893729f1be8f01cc7ff334c18534a96.png"
import imgTeamOv2  from "@/imports/Equipa/147c0dc1f2d747da38ed29077bb5ca6a2131f401.png"
import imgTeamOv3  from "@/imports/Equipa/f54adf1f173bd3d652fbb4045cf6b96b0314465f.png"
import imgTeamOv4  from "@/imports/Equipa/6b262635396e81047e7283b201ec9ec494f79879.png"
import { LangProvider, useLang, useLangControls, useLangFromPath, langFromPath, blogPathIn, COPY, type Lang } from "./i18n"
import { ArticleView } from "./blog/ArticleView"
import { ArticleNotFound } from "./blog/ArticleNotFound"
import { BlogListView } from "./blog/BlogListView"
import { blogHref } from "./blog/navigate"
import { GOLD, PALMORE, CAMPTON_BOLD, CAMPTON_BOOK, SANS, SERIF } from "./blog/tokens"
import { postsFor, postBySlug } from "@/lib/blog/posts"

/* ─── Custom scroll progress — bypasses framer-motion container position check */
function useScrollProgress(
  ref: React.RefObject<HTMLDivElement | null>,
  mode: "end-start" | "end-end" = "end-start"
) {
  const progress = useMotionValue(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      const raw = mode === "end-start"
        ? -rect.top / rect.height
        : -rect.top / (rect.height - window.innerHeight)
      progress.set(Math.max(0, Math.min(1, raw)))
    }
    window.addEventListener("scroll", update, { passive: true })
    update()
    return () => window.removeEventListener("scroll", update)
  }, [progress, ref, mode])
  return progress
}

/* Permite controlar o progresso do scroll também por swipe lateral no trackpad —
   converte deltaX (gesto horizontal) em scroll vertical real da página, que já
   alimenta o mesmo cálculo de progresso usado pelo scroll normal (down). */
function useHorizontalSwipeToScroll(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      const rect = el.getBoundingClientRect()
      const inView = rect.top < window.innerHeight && rect.bottom > 0
      if (!inView) return
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault()
        window.scrollBy({ top: e.deltaX, left: 0, behavior: "auto" })
      }
    }
    window.addEventListener("wheel", onWheel, { passive: false })
    return () => window.removeEventListener("wheel", onWheel)
  }, [ref])
}

/* Carrossel de arrastar (mobile) — gesto horizontal (swipe) troca de item,
   sem interferir com o scroll vertical normal da página. `touchAction:
   "pan-y"` (aplicado no elemento, ver uso) é o que faz a divisão: deixa o
   browser tratar nativamente o gesto vertical (scroll da página) enquanto o
   Framer Motion trata o horizontal (drag do carrossel). Nada de scroll-jacking
   aqui — ao contrário da versão desktop, a altura do container é normal. */
function useDragCarousel(itemCount: number, step: number) {
  const x = useMotionValue(0)
  const indexRef = useRef(0)
  const maxIndex = Math.max(0, itemCount - 1)
  const goTo = (i: number) => {
    const clamped = Math.max(0, Math.min(maxIndex, i))
    indexRef.current = clamped
    animate(x, -clamped * step, { type: "spring", stiffness: 300, damping: 32, mass: 0.7 })
  }
  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info
    let target = indexRef.current
    if (velocity.x < -350 || offset.x < -step * 0.25) target = indexRef.current + 1
    else if (velocity.x > 350 || offset.x > step * 0.25) target = indexRef.current - 1
    goTo(target)
  }
  return { x, dragConstraints: { left: -step * maxIndex, right: 0 }, handleDragEnd, goTo }
}

/* Variante do carrossel de arrastar para quando os cartões NÃO têm todos a
   mesma largura (ex.: um cartão alargado). Guarda a posição x de cada
   índice (soma cumulativa de largura+gap) em vez de assumir um "step"
   uniforme, para o snap ficar sempre exato independentemente da largura de
   cada cartão. */
function useDragCarouselVariable(widths: number[], gap: number) {
  const positions = widths.reduce<number[]>((acc, w, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + widths[i - 1] + gap)
    return acc
  }, [])
  const maxIndex = Math.max(0, widths.length - 1)
  const x = useMotionValue(0)
  const indexRef = useRef(0)
  const goTo = (i: number) => {
    const clamped = Math.max(0, Math.min(maxIndex, i))
    indexRef.current = clamped
    animate(x, -positions[clamped], { type: "spring", stiffness: 300, damping: 32, mass: 0.7 })
  }
  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const localStep = widths[indexRef.current] + gap
    const { offset, velocity } = info
    let target = indexRef.current
    if (velocity.x < -350 || offset.x < -localStep * 0.25) target = indexRef.current + 1
    else if (velocity.x > 350 || offset.x > localStep * 0.25) target = indexRef.current - 1
    goTo(target)
  }
  return { x, dragConstraints: { left: -positions[maxIndex], right: 0 }, handleDragEnd, goTo }
}

function useWindowWidth() {
  const [w, setW] = useState(() => window.innerWidth)
  useEffect(() => {
    const fn = () => setW(window.innerWidth)
    window.addEventListener("resize", fn)
    return () => window.removeEventListener("resize", fn)
  }, [])
  return w
}

/* ─── Lazy video — loads src only when entering viewport ─────────────────── */
function LazyVideo({ src, className, style }: { src: string; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [active, setActive] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setActive(true); obs.disconnect() }
    }, { rootMargin: "1500px" }) // margem grande — começa a carregar bem antes de entrar em vista
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <video
      ref={ref}
      src={active ? src : undefined}
      autoPlay
      muted
      loop
      playsInline
      preload={active ? "auto" : "none"}
      className={className}
      style={style}
    />
  )
}

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
   object-fit: cover, so the fit stays correct at any card width/height. */
const TEENTAC_IMG_W = 1920
const TEENTAC_IMG_H = 1440
const TEENTAC_SCREEN_CORNERS: { tl: [number, number]; tr: [number, number]; br: [number, number]; bl: [number, number] } = {
  tl: [625.7, 358.1],
  tr: [1490.8, 334.8],
  br: [1452.4, 910.7],
  bl: [550.6, 898.6],
}

// Classic unit-square (0,0)-(1,0)-(1,1)-(0,1) -> quad projective mapping.
function squareToQuad(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) {
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

function TeentacInteractiveMockup({ img, className }: { img: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ w: number; h: number } | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setBox({ w: width, h: height })
    })
    ro.observe(el)
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); io.disconnect() }
    }, { rootMargin: "800px" })
    io.observe(el)
    return () => { ro.disconnect(); io.disconnect() }
  }, [])

  const IFRAME_W = 1280
  const IFRAME_H = 800

  const matrix3d = (() => {
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
    return `matrix3d(${sq.a / IFRAME_W}, ${sq.d / IFRAME_W}, 0, ${sq.g / IFRAME_W}, ${sq.b / IFRAME_H}, ${sq.e / IFRAME_H}, 0, ${sq.h / IFRAME_H}, 0, 0, 1, 0, ${sq.c}, ${sq.f}, 0, 1)`
  })()

  return (
    <div ref={containerRef} className={className} style={{ position: "relative" }}>
      <img src={img} alt="Teentac" className="size-full object-cover" style={{ position: "absolute", inset: 0 }} />
      {matrix3d && (
        <iframe
          src={visible ? "https://www.teentac.pt/" : undefined}
          title="Teentac — pré-visualização em direto"
          className="absolute"
          style={{ left: 0, top: 0, width: `${IFRAME_W}px`, height: `${IFRAME_H}px`, border: 0, transformOrigin: "0 0", transform: matrix3d, background: "#fff" }}
        />
      )}
    </div>
  )
}

/* GOLD, PALMORE, CAMPTON_BOLD, CAMPTON_BOOK, SANS e SERIF vivem agora em
   `./blog/tokens`, para que os componentes do blog os possam usar sem
   importar o App inteiro. Os valores são exatamente os mesmos. */
const DARK = "#0b1c22"

/* ─── Fixed video background ─────────────────────────────────────────────── */
function BackgroundVideo() {
  return (
    <div className="fixed inset-0 z-0" style={{ background: DARK }}>
      <video src={heroVideo} autoPlay muted loop playsInline preload="auto" className="size-full object-cover" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(11,28,34,0.25) 50%, rgba(6,15,19,0.55) 100%)" }} />
    </div>
  )
}

/* ─── Fixed nav — responsive mobile/desktop ──────────────────────────────── */
/* ─── PT/EN language toggle ──────────────────────────────────────────────── */
function LangSwitch({ variant = "nav", onNavigated }: { variant?: "nav" | "menu"; onNavigated?: () => void }) {
  const { lang, setLang } = useLangControls()
  const navigate = useNavigate()
  const location = useLocation()
  const isMenu = variant === "menu"

  /* No blog o idioma faz parte do endereço, e é o endereço que manda quando a
     página recarrega. Trocar só o estado deixava o URL a dizer `/en` com o
     texto em português — e o recarregar desfazia a escolha. Por isso aqui a
     troca leva também para a versão correspondente da mesma página. Fora do
     blog não há par de endereços e o `blogPathIn` devolve `null`.

     `replace: true` — troca de idioma não é um novo passo no histórico, é a
     mesma página noutra língua. Sem isto, o botão Voltar do browser tinha de
     ser premido duas vezes para sair da página (uma para desfazer a troca de
     idioma, sem efeito visível, e só a seguir a navegação real). */
  const escolher = (l: Lang) => {
    setLang(l)
    const destino = blogPathIn(location.pathname, l)
    if (destino && destino !== location.pathname) navigate(destino, { replace: true })
    /* No menu móvel isto vive dentro do overlay a tapar o ecrã — os restantes
       botões desse overlay fecham-no ao navegar (via `go()`), e este tinha
       ficado de fora: trocar de idioma mudava a página por baixo de um
       overlay que continuava visível. */
    onNavigated?.()
  }
  const optionStyle = (active: boolean): React.CSSProperties => ({
    color: GOLD,
    fontFamily: SANS,
    fontWeight: 300,
    fontSize: isMenu ? "clamp(11px, 2.2vw, 13px)" : "clamp(10px, 0.85vw, 12px)",
    letterSpacing: "0.6px",
    background: "none",
    border: "none",
    cursor: "pointer",
    opacity: active ? 0.7 : 0.3,
  })
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => escolher("pt")} style={optionStyle(lang === "pt")}>PT</button>
      <span style={{ color: GOLD, opacity: 0.2, fontSize: isMenu ? "clamp(11px, 2.2vw, 13px)" : "clamp(10px, 0.85vw, 12px)" }}>/</span>
      <button onClick={() => escolher("en")} style={optionStyle(lang === "en")}>EN</button>
    </div>
  )
}

function SiteNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const lang = useLang()
  const c = COPY[lang].nav

  // Mosca: na homepage volta ao topo (scroll suave); nas outras páginas navega para a homepage
  const handleMoscaClick = () => {
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      navigate("/")
    }
  }

  const go = (path: string, scrollId?: string) => {
    setOpen(false)
    navigate(path)
    if (scrollId) setTimeout(() => document.getElementById(scrollId)?.scrollIntoView({ behavior: "smooth" }), 100)
  }

  const btnStyle: React.CSSProperties = { color: GOLD, fontFamily: SANS, fontSize: "clamp(13px, 1.1vw, 17px)", fontWeight: 300, letterSpacing: "0.6px", background: "none", border: "none", cursor: "pointer" }
  // Simples e legível: 100% de opacidade em repouso, reduz para 60% no hover.
  const hoverProps = {
    animate: { opacity: 1, letterSpacing: "0.6px" },
    whileHover: { opacity: 0.6, letterSpacing: "2.5px" },
    transition: { duration: 0.3, ease: "easeOut" },
  } as const

  const LINKS = [
    { label: c.work, fn: () => go("/", "work") },
    { label: c.team, fn: () => go("/team") },
    { label: c.blog, fn: () => go(blogHref(lang)) },
    { label: c.hub,  fn: () => { setOpen(false); window.open("https://hub.muche.pt/", "_blank", "noopener") } },
    { label: c.talk, fn: () => go("/", "contact") },
  ]

  // Mosca "magnética" — só persegue o cursor depois de lhe passares o rato
  // por cima; para e volta ao lugar assim que o cursor se aproxima das
  // palavras do menu (para não bloquear cliques) ou quando a secção do
  // Portfólio (#work) entra em vista.
  const navRef = useRef<HTMLElement>(null)
  const moscaWrapRef = useRef<HTMLDivElement>(null)
  const moscaX = useMotionValue(0)
  const moscaY = useMotionValue(0)
  const smoothMoscaX = useSpring(moscaX, { stiffness: 120, damping: 18 })
  const smoothMoscaY = useSpring(moscaY, { stiffness: 120, damping: 18 })
  const chasing = useRef(false)
  const hasLeftNav = useRef(false)
  const homePos = useRef({ x: 0, y: 0 })

  const stopChasing = () => {
    chasing.current = false
    hasLeftNav.current = false
    moscaX.set(0)
    moscaY.set(0)
  }

  useEffect(() => {
    const measureHome = () => {
      const rect = moscaWrapRef.current?.getBoundingClientRect()
      if (rect) homePos.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    }
    measureHome()
    window.addEventListener("resize", measureHome)

    const onMove = (e: MouseEvent) => {
      if (!chasing.current) return
      const navRect = navRef.current?.getBoundingClientRect()
      const belowNav = !navRect || e.clientY > navRect.bottom + 20
      if (belowNav) hasLeftNav.current = true
      // Só larga o cursor quando volta a aproximar-se do menu depois de já ter saído —
      // sem isto, cortava logo a perseguição no primeiro movimento (ainda dentro do menu).
      if (hasLeftNav.current && navRect && e.clientY <= navRect.bottom + 20) {
        stopChasing()
        return
      }
      const { x: hx, y: hy } = homePos.current
      const targetX = e.clientX - hx
      const targetY = e.clientY - hy
      moscaX.set(Math.max(-hx + 24, Math.min(window.innerWidth - hx - 24, targetX)))
      moscaY.set(Math.max(-hy + 16, Math.min(window.innerHeight - hy - 32, targetY)))
    }
    window.addEventListener("mousemove", onMove)

    const workEl = document.getElementById("work")
    let obs: IntersectionObserver | undefined
    if (workEl) {
      obs = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) stopChasing()
      }, { threshold: 0.15 })
      obs.observe(workEl)
    }

    return () => {
      window.removeEventListener("resize", measureHome)
      window.removeEventListener("mousemove", onMove)
      obs?.disconnect()
    }
  }, [moscaX, moscaY])

  const handleMoscaHoverStart = () => { chasing.current = true }

  return (
    <>
      {/* Desktop */}
      <nav ref={navRef} className="fixed top-0 left-0 right-0 z-50 hidden md:flex items-center justify-between px-14 pt-10">
        <div className="flex gap-8 lg:gap-10">
          <motion.button {...hoverProps} style={btnStyle} onClick={() => go("/", "work")}>{c.work}</motion.button>
          <motion.button {...hoverProps} style={btnStyle} onClick={() => go("/team")}>{c.team}</motion.button>
          <motion.button {...hoverProps} style={btnStyle} onClick={() => go(blogHref(lang))}>{c.blog}</motion.button>
        </div>
        <div ref={moscaWrapRef} className="absolute left-1/2 -translate-x-1/2 z-50">
          <motion.button onHoverStart={handleMoscaHoverStart} whileHover={{ rotate: 15 }} transition={{ type: "spring", stiffness: 300, damping: 14 }} onClick={handleMoscaClick} style={{ x: smoothMoscaX, y: smoothMoscaY, background: "none", border: "none", cursor: "pointer" }}>
            <NavHamburger />
          </motion.button>
        </div>
        <div className="flex items-center gap-8 lg:gap-10">
          <motion.button {...hoverProps} style={btnStyle} onClick={() => window.open("https://hub.muche.pt/", "_blank", "noopener")}>{c.hub}</motion.button>
          <motion.button {...hoverProps} style={btnStyle} onClick={() => go("/", "contact")}>{c.talk}</motion.button>
          <LangSwitch />
        </div>
      </nav>

      {/* Mobile top bar — centered mosca that toggles menu (comportamento inalterado no mobile) */}
      <div className="fixed top-0 left-0 right-0 z-50 flex md:hidden items-center justify-center pt-7">
        <motion.button
          onClick={() => setOpen(v => !v)}
          animate={{ rotate: open ? 180 : 0, scale: open ? 0.85 : 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <NavHamburger />
        </motion.button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-40 flex flex-col items-center justify-center"
          style={{ background: "rgba(6,15,19,0.97)" }}
          onClick={() => setOpen(false)}
        >
          <div className="flex flex-col items-center gap-7" onClick={e => e.stopPropagation()}>
            {LINKS.map((link, i) => (
              <motion.button
                key={link.label}
                onClick={link.fn}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06, ease: "easeOut" }}
                whileHover={{ x: 6 }}
                style={{ color: GOLD, fontFamily: SERIF, fontSize: "clamp(30px, 7vw, 52px)", fontWeight: 300, letterSpacing: "0.01em", background: "none", border: "none", cursor: "pointer" }}
              >
                {link.label}
              </motion.button>
            ))}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: LINKS.length * 0.06, ease: "easeOut" }}
              style={{ marginTop: "8px" }}
            >
              <LangSwitch variant="menu" onNavigated={() => setOpen(false)} />
            </motion.div>
          </div>
        </motion.div>
      )}
    </>
  )
}

/* ─── Push-to-background scroll block ───────────────────────────────────── */
function ScrollBlock({ children, height = "250vh" }: { children: ReactNode; height?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const rawProgress = useScrollProgress(ref, "end-start")
  // Pausa curta (bem mais curta que as versões anteriores): quando a secção
  // entra em vista fica ~180ms com o blur trancado a 0, só para não saltar
  // logo ao primeiro pixel de scroll — sem bloquear o scroll em si.
  const SHORT_PAUSE_MS = 180
  const gatedProgress = useMotionValue(0)
  const readyRef = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let armed = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !armed) {
        armed = true
        timer = setTimeout(() => { readyRef.current = true }, SHORT_PAUSE_MS)
      }
    }, { threshold: 0 })
    obs.observe(el)
    const unsubscribe = rawProgress.on("change", v => {
      gatedProgress.set(readyRef.current ? v : 0)
    })
    return () => {
      obs.disconnect()
      unsubscribe()
      if (timer) clearTimeout(timer)
    }
  }, [rawProgress, gatedProgress])

  const scrollYProgress = gatedProgress
  const scale        = useTransform(scrollYProgress, [0, 0.55], [1, 0.84])
  const borderRadius = useTransform(scrollYProgress, [0, 0.55], ["0px", "22px"])
  const blur         = useTransform(scrollYProgress, [0.12, 0.55], ["blur(0px)", "blur(10px)"])
  const opacity      = useTransform(scrollYProgress, [0, 0.6, 0.9, 1], [1, 0.9, 0, 0])
  return (
    <div ref={ref} style={{ height, position: "relative" }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <motion.div style={{ scale, borderRadius, filter: blur, opacity, transformOrigin: "50% 38%" }} className="size-full">
          {children}
        </motion.div>
      </div>
    </div>
  )
}

/* ─── SVG atoms ──────────────────────────────────────────────────────────── */
function Diamond() {
  return (
    <svg width="9" height="7" viewBox="0 0 9 7" fill="none" className="shrink-0 opacity-70">
      <path d={svgPaths.p3dbb0000} fill={GOLD} />
    </svg>
  )
}
function NavHamburger() {
  return (
    <svg width="25" height="19" viewBox="0 0 24.7101 19" fill="none">
      <path d={svgPaths.p29ca6980} fill={GOLD} />
    </svg>
  )
}
/* ─── MucheLogo — ondulação de água a partir do ponto do cursor ─────────── */
// PNG 1x1 cinzento neutro (128,128,128) — o valor "sem deslocamento" para o
// feDisplacementMap. Serve de href inicial do feImage: sem isto, o feImage
// fica sem href até ao primeiro evento de rato (que nunca acontece em iOS,
// só touch), e o Safari/WebKit trata um filtro com uma entrada inválida como
// erro — escondendo TODO o <g filter=...> (o logo inteiro), ao contrário do
// Chrome que é mais tolerante. Isto é a causa do logo não aparecer em iPhone.
const RIPPLE_NEUTRAL_HREF = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNoaGgAAAMEAYFL09IQAAAAAElFTkSuQmCC"

let muchRippleUid = 0

// Largura/altura do canvas que gera o mapa de deslocamento — baixa resolução
// de propósito (a água ondula em manchas largas, não em detalhe fino), o que
// também mantém o toDataURL() barato a correr a ~30fps.
const RIPPLE_CANVAS_W = 300
const RIPPLE_CANVAS_H = Math.round((RIPPLE_CANVAS_W * 207) / 877.256)
const RIPPLE_LIFETIME_S = 1.9 // duração de cada onda, em segundos

// Margem (em unidades do viewBox) à volta do logo dentro da qual o mapa de
// deslocamento também é gerado. Sem isto, o mapa termina exatamente nos
// limites do viewBox — e como as letras tocam esse limite (topo/fundo), a
// interpolação da imagem do filtro faz "clamp" para transparente mesmo em
// cima do contorno, o que lia como tremor/flicker nas arestas. Com a margem,
// esse limite fica sempre bem afastado de qualquer pixel visível da letra.
const RIPPLE_MAP_PAD = 40
const RIPPLE_MAP_X0 = -RIPPLE_MAP_PAD
const RIPPLE_MAP_Y0 = -RIPPLE_MAP_PAD
const RIPPLE_MAP_W = 877.256 + RIPPLE_MAP_PAD * 2
const RIPPLE_MAP_H = 207 + RIPPLE_MAP_PAD * 2

function MucheLogo() {
  const [hovered, setHovered] = useState(false)
  const paths = [svgPaths.p1f980480, svgPaths.p1e8d8a00, svgPaths.p14ba5b00, svgPaths.p32989c80, svgPaths.pe3f1e80, svgPaths.p3eb66200]
  const svgRef = useRef<SVGSVGElement>(null)
  const feImageRef = useRef<SVGFEImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const smoothCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const ripplesRef = useRef<{ x: number; y: number; t0: number }[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastSpawnRef = useRef(0)
  const filterId = useRef(`muche-water-${++muchRippleUid}`).current

  // Converte a posição do cursor (coordenadas de ecrã) para o espaço interno do viewBox do SVG.
  const toSvgPoint = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const p = pt.matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }

  // Desenha o mapa de deslocamento: para cada pixel, soma o deslocamento de
  // todas as ondas ativas — uma sinusoide real (sem ruído nenhum) que viaja
  // para fora a velocidade constante e cuja amplitude decai com a distância
  // ao centro e com o tempo, tal como uma pedra a cair na água.
  const drawFrame = () => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas")
      canvasRef.current.width = RIPPLE_CANVAS_W
      canvasRef.current.height = RIPPLE_CANVAS_H
    }
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const now = performance.now() / 1000
    const ripples = ripplesRef.current.filter(r => now - r.t0 < RIPPLE_LIFETIME_S)
    ripplesRef.current = ripples

    const img = ctx.createImageData(RIPPLE_CANVAS_W, RIPPLE_CANVAS_H)
    const data = img.data
    const WAVELENGTH = 30     // distância (em unidades do viewBox) entre cristas
    const SPEED = 260         // velocidade a que a onda viaja para fora
    const SPATIAL_DECAY = 190 // quanto mais alto, mais longe a onda se sente
    const TIME_DECAY = 1.1    // decaimento no tempo
    // Envelope largo (a "espessura" do anel) — quanto mais largo, mais devagar
    // o deslocamento varia de pixel para pixel, o que é o que faz o contorno
    // mover-se em conjunto e suave em vez de aos solavancos.
    const RING_WIDTH = 34

    for (let py = 0; py < RIPPLE_CANVAS_H; py++) {
      const vy = RIPPLE_MAP_Y0 + (py / RIPPLE_CANVAS_H) * RIPPLE_MAP_H
      for (let px = 0; px < RIPPLE_CANVAS_W; px++) {
        const vx = RIPPLE_MAP_X0 + (px / RIPPLE_CANVAS_W) * RIPPLE_MAP_W
        let dxSum = 0
        let dySum = 0
        for (const r of ripples) {
          const dx = vx - r.x
          const dy = vy - r.y
          const dist = Math.hypot(dx, dy) || 0.0001
          const age = now - r.t0
          const front = SPEED * age
          // Só desloca perto da frente de onda atual — é isto que dá a
          // sensação de um anel a propagar-se, em vez de tudo a mexer-se
          // ao mesmo tempo (o que pareceria um tremor).
          const envelope = Math.exp(-Math.pow((dist - front) / RING_WIDTH, 2))
          const amplitude = Math.exp(-dist / SPATIAL_DECAY) * Math.exp(-age * TIME_DECAY) * envelope
          const wave = Math.sin(((dist - front) / WAVELENGTH) * Math.PI * 2) * amplitude
          dxSum += (dx / dist) * wave
          dySum += (dy / dist) * wave
        }
        const idx = (py * RIPPLE_CANVAS_W + px) * 4
        data[idx]     = Math.max(0, Math.min(255, 128 + dxSum * 90))
        data[idx + 1] = Math.max(0, Math.min(255, 128 + dySum * 90))
        data[idx + 2] = 128
        data[idx + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)

    // Segunda passagem, só para suavizar — um leve blur no próprio mapa de
    // deslocamento apaga o grão de pixel-a-pixel que se via como tremor nas
    // arestas, sem alterar a forma da onda em si (que já é uma sinusoide lisa).
    if (!smoothCanvasRef.current) {
      smoothCanvasRef.current = document.createElement("canvas")
      smoothCanvasRef.current.width = RIPPLE_CANVAS_W
      smoothCanvasRef.current.height = RIPPLE_CANVAS_H
    }
    const smoothCtx = smoothCanvasRef.current.getContext("2d")
    if (smoothCtx) {
      smoothCtx.clearRect(0, 0, RIPPLE_CANVAS_W, RIPPLE_CANVAS_H)
      smoothCtx.filter = "blur(2px)"
      smoothCtx.drawImage(canvas, 0, 0)
      feImageRef.current?.setAttribute("href", smoothCanvasRef.current.toDataURL())
    }

    if (ripples.length === 0 && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const ensureLoopRunning = () => {
    if (intervalRef.current) return
    intervalRef.current = setInterval(drawFrame, 33) // ~30fps — mais suave, ainda barato a esta resolução
  }

  const spawnRipple = (x: number, y: number) => {
    ripplesRef.current = [...ripplesRef.current, { x, y, t0: performance.now() / 1000 }]
    ensureLoopRunning()
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const now = performance.now()
    // Espaçado no tempo — ondas reais não nascem a cada instante.
    if (now - lastSpawnRef.current < 450) return
    lastSpawnRef.current = now
    const { x, y } = toSvgPoint(e.clientX, e.clientY)
    spawnRipple(x, y)
  }

  const handleEnter = (e: React.MouseEvent<SVGSVGElement>) => {
    setHovered(true)
    const { x, y } = toSvgPoint(e.clientX, e.clientY)
    spawnRipple(x, y)
  }

  const handleLeave = () => {
    setHovered(false)
    // Deixa as ondas já lançadas terminarem sozinhas (o loop para-se quando
    // a última expira); só marca a secção como "não interativa" no filtro.
  }

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 877.256 207"
      fill="none"
      className="w-full max-w-[280px] sm:max-w-[400px] md:max-w-[520px] h-auto mx-auto cursor-pointer"
      style={{ overflow: "visible" }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onMouseMove={handleMouseMove}
    >
      <defs>
        <filter id={filterId} x="-50%" y="-200%" width="200%" height="500%" colorInterpolationFilters="sRGB">
          <feImage
            ref={feImageRef}
            href={RIPPLE_NEUTRAL_HREF}
            x={RIPPLE_MAP_X0}
            y={RIPPLE_MAP_Y0}
            width={RIPPLE_MAP_W}
            height={RIPPLE_MAP_H}
            preserveAspectRatio="none"
            result="rippleMap"
          />
          <feDisplacementMap in="SourceGraphic" in2="rippleMap" scale={hovered ? 34 : 0} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      {/* Duas camadas de proteção contra o mesmo bug (logótipo invisível em
          iOS/Safari, que nunca dispara eventos de rato/hover): o feImage
          acima já nasce com um href válido (RIPPLE_NEUTRAL_HREF), e aqui o
          filtro só fica ligado ao <g> quando hovered — fora do hover nem
          sequer há referência a um filtro, o que evita por completo
          qualquer estado inválido no WebKit. Fora do hover o scale já era
          0, por isso não há mudança visual. */}
      <g style={{ filter: hovered ? `url(#${filterId})` : "none", transition: "filter 0.5s ease-out" }}>
        {paths.map((d, i) => (
          <path key={i} d={d} fill={GOLD} />
        ))}
      </g>
    </svg>
  )
}

/* ─── Section 1: Hero ────────────────────────────────────────────────────── */
function HeroSection() {
  const lang = useLang()
  const c = COPY[lang].hero
  const [row1, row2] = [c.tags.slice(0, 3), c.tags.slice(3)]
  return (
    <div className="relative size-full overflow-hidden">
      <div className="relative z-10 flex flex-col items-center justify-center h-full">
        <motion.div className="w-full px-8 sm:px-14 md:px-20" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}>
          <MucheLogo />
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, delay: 0.35 }} className="mt-6" style={{ color: GOLD, fontFamily: SANS, fontWeight: 500, fontSize: "clamp(13px, 1.1vw, 17px)", letterSpacing: "clamp(3px, 0.6vw, 6px)", textTransform: "uppercase" }}>
          {c.tagline}
        </motion.p>
        <motion.div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-5" style={{ marginTop: "clamp(56px, 16vh, 180px)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.1, delay: 0.7 }}>
          {/* Mobile: row 1 */}
          <div className="flex md:contents items-center gap-3 md:gap-5">
            {row1.map((s, i) => (
              <div key={s} className="flex items-center gap-3 md:gap-5">
                <span style={{ color: GOLD, fontFamily: SANS, fontWeight: 300, fontSize: "clamp(14px, 1vw, 16px)", letterSpacing: "0.5px" }}>{s}</span>
                {i < 2 && <Diamond />}
                {/* desktop diamond after Branding */}
                {i === 2 && <span className="hidden md:block"><Diamond /></span>}
              </div>
            ))}
          </div>
          {/* Mobile: row 2 */}
          <div className="flex md:contents items-center gap-3 md:gap-5">
            {row2.map((s, i) => (
              <div key={s} className="flex items-center gap-3 md:gap-5">
                <span style={{ color: GOLD, fontFamily: SANS, fontWeight: 300, fontSize: "clamp(14px, 1vw, 16px)", letterSpacing: "0.5px" }}>{s}</span>
                {i < 2 && <Diamond />}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

/* ─── Section 2: Manifesto — line-height reduzido para 0.75 ─────────────── */
function ManifestoSection() {
  const lang = useLang()
  const c = COPY[lang].manifesto
  const sansSize  = "clamp(14px, 1.6vw, 26px)"
  const serifSize = "clamp(20px, 2.7vw, 44px)"
  const vpw = useWindowWidth()
  const isMobile = vpw < 768
  // Mobile scales purely off viewport width (no floor) so it keeps the same
  // visual proportion as larger screens instead of a flat, disproportionate size.
  const bigSize   = isMobile ? `${Math.round(vpw * 0.3)}px`      : "clamp(150px, 18vw, 400px)"
  const smallSize = isMobile ? `${Math.round(vpw * 0.3 / 3.33)}px` : "clamp(45px, 5.4vw, 120px)"
  return (
    <div className="relative size-full flex flex-col justify-center md:flex-row overflow-y-auto md:overflow-hidden">
      <div className="md:flex-1 flex items-center justify-center md:justify-start px-8 md:pl-14 md:pr-6 pb-3 md:pb-0">
        <motion.div className="w-full max-w-[320px] mx-auto md:max-w-none md:mx-0" initial={{ opacity: 0, x: -36 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }} viewport={{ once: true, margin: "-80px" }} style={{ color: GOLD, fontFamily: SERIF, fontWeight: 300, lineHeight: 0.78, letterSpacing: "0em", textTransform: "uppercase", textAlign: "right" }}>
          <div style={{ fontSize: bigSize }}>{c.heading.line1}</div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "flex-end", gap: "0.28em" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              {c.heading.small.map((w, i) => (
                <span key={i} style={{ fontSize: smallSize }}>{w}</span>
              ))}
            </div>
            <span style={{ fontSize: bigSize, marginTop: "-0.08em" }}>{c.heading.big}</span>
          </div>
        </motion.div>
      </div>
      <div className="md:flex-1 flex items-center justify-center md:justify-start px-12 md:px-0 md:pl-10 md:pr-14 pt-3 pb-8 md:pt-0 md:pb-0">
        <motion.div className="max-w-[300px] md:max-w-[520px]" initial={{ opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1.3, delay: 0.18, ease: [0.16, 1, 0.3, 1] }} viewport={{ once: true, margin: "-80px" }}>
          <p style={{ color: GOLD, lineHeight: 1.25, marginBottom: "52px" }}>
            <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: sansSize }}>{c.lead}</span>
            <span style={{ fontFamily: SERIF, fontSize: serifSize, letterSpacing: "0.01em" }}>{c.leadItalic}</span>
            <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: sansSize }}>, {c.sub}</span>
          </p>
          <p style={{ color: GOLD, fontFamily: SERIF, fontWeight: 300, fontSize: serifSize, lineHeight: 1.25, letterSpacing: "0.01em" }}>
            {c.quote}
          </p>
        </motion.div>
      </div>
    </div>
  )
}

/* ─── Section 3: Portfolio ───────────────────────────────────────────────── */
type PortfolioItem =
  | { img: string; client: string; services: string; concept: string; services_pt: string; concept_pt: string }
  | { video: string; videoMobile: string; client: string; services: string; concept: string; services_pt: string; concept_pt: string }

// videoMobile é a versão vertical (9:16) enviada para mobile/tablet — o
// desktop usa sempre `video`, a versão horizontal original.
const PORTFOLIO: PortfolioItem[] = [
  { img: imgPort1, client: "Teentac", services: "Branding // Web Design", concept: "We created the full visual identity and website, balancing medical credibility with a vibrant, youth-centric design to turn complex health data into a supportive, empathetic experience.", services_pt: "Branding // Web Design", concept_pt: "Criámos a identidade visual completa e o website, equilibrando a credibilidade médica com um design vibrante e jovem, transformando dados de saúde complexos numa experiência acolhedora e empática." },
  { video: videoOliviaHotel, videoMobile: videoOliviaHotelVertical, client: "Olivia Hotel", services: "Photography // Video", concept: "We focus on visual storytelling that transforms spaces into experiences, creating an irresistible aesthetic that invites guests to check in before they even arrive.", services_pt: "Fotografia // Vídeo", concept_pt: "Focamo-nos em storytelling visual que transforma espaços em experiências, criando uma estética irresistível que convida os hóspedes a fazer check-in antes mesmo de chegarem." },
  { video: videoLPCC, videoMobile: videoLPCCVertical, client: "LPCC", services: "Branding // Podcast // Web Design", concept: "Muche created the visual identity, website, and produced the podcast called Ligacoes.", services_pt: "Branding // Podcast // Web Design", concept_pt: "A Muche criou a identidade visual, o website, e produziu o podcast chamado Ligações." },
  { video: videoDecoProteste, videoMobile: videoDecoProtesteVertical, client: "Deco Proteste", services: "Promotional Video", concept: "We created a cinematic piece that captures the holiday spirit while reinforcing the brand's commitment to consumers, ensuring their message stood out during the busiest time of the year.", services_pt: "Vídeo Promocional", concept_pt: "Criámos uma peça cinematográfica que capta o espírito natalício, reforçando o compromisso da marca com os consumidores e garantindo que a sua mensagem se destacou na época mais concorrida do ano." },
]

function portfolioText(item: PortfolioItem, lang: Lang) {
  return lang === "pt" ? { services: item.services_pt, concept: item.concept_pt } : { services: item.services, concept: item.concept }
}

function PortfolioSection() {
  const lang = useLang()
  const c = COPY[lang].portfolio
  const ref = useRef<HTMLDivElement>(null)
  useHorizontalSwipeToScroll(ref)
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])
  const vpw = vp.w

  // Cobre também os tablets — os vídeos verticais só fazem sentido com o
  // carrossel vertical de um cartão de cada vez, por isso os dois (layout +
  // fonte do vídeo) mudam juntos neste limite.
  const isMobile = vpw < 1024

  // Desktop (scroll-jacked horizontal carousel) — inalterado, exceto o limite
  // de largura abaixo. A caixa de média é 16:9, por isso a altura do cartão
  // depende da LARGURA. Sem limite, em ecrãs largos e baixos (portáteis,
  // monitores grandes) o cartão cresce para lá do que cabe e corta o nome
  // do cliente em baixo. Limitar a largura a 68vh x 16/9 mantém o 16:9 e
  // recupera a altura que o cartão tinha antes (68vh de média).
  const cardW    = isMobile ? vpw * 0.88 : Math.min(vpw * 0.80, vp.h * 0.68 * (16 / 9))
  const gap      = isMobile ? 28 : 96
  const targetX  = -(3 * (cardW + gap))
  const rawProgress    = useScrollProgress(ref, "end-end")
  const smoothProgress = useSpring(rawProgress, { stiffness: 55, damping: 22, restDelta: 0.0005 })
  const x              = useTransform(smoothProgress, [0, 1], [0, targetX])
  const hintOpacity    = useTransform(rawProgress, [0, 0.06], [1, 0])

  // Mobile/tablet (carrossel por swipe) — vertical 9:16 (igual aos ficheiros
  // originais, sem recortar para horizontal). A média usa uma altura em vh
  // (não a largura do cartão) para sobrar sempre espaço para o texto por
  // baixo ler-se no mesmo ecrã, sem precisar de scroll extra dentro do
  // cartão — e sem cortar a imagem/vídeo, já que a largura vem do 9:16.
  // Ligeiramente maior do que antes (0.56 -> 0.60vh) a pedido.
  const mMediaH = vp.h * 0.60
  const mCardW  = mMediaH * (9 / 16)
  const mGap    = 16
  // Teentac é uma imagem (não vídeo), 1920x1440 (4:3) — bem mais larga que
  // alta do que os cartões 9:16 dos vídeos. A ALTURA do cartão é SEMPRE
  // mMediaH, tal como todos os outros — não se mexe nisto. Só a largura
  // deste cartão é maior (mais destaque, é a única imagem do conjunto),
  // limitada ao ecrã para nunca ultrapassar a página. Preenche a caixa a
  // 100% (object-fit: cover, tal como os vídeos) — mas como a caixa fica
  // mais larga-mas-baixa do que a foto, cobrir a altura corta algo dos
  // lados. Em vez do recorte simétrico por omissão (centrado na FOTO), o
  // objectPosition abaixo centra o recorte no ECRÃ do portátil (que não
  // está mesmo ao centro da foto original) — para não cortar o ecrã.
  const teentacW = Math.min(mMediaH * (4 / 3), vpw - 32)
  const TEENTAC_IMG_W = 1920, TEENTAC_IMG_H = 1440, TEENTAC_SCREEN_CENTER_X = 1030
  const teentacCropW = (teentacW / mMediaH) * TEENTAC_IMG_H
  const teentacTotalCrop = Math.max(0, TEENTAC_IMG_W - teentacCropW)
  const teentacObjX = teentacTotalCrop > 0
    ? Math.max(0, Math.min(100, ((TEENTAC_SCREEN_CENTER_X - teentacCropW / 2) / teentacTotalCrop) * 100))
    : 50
  const mCardWidths = PORTFOLIO.map(item => item.client === "Teentac" ? teentacW : mCardW)
  const { x: mx, dragConstraints, handleDragEnd } = useDragCarouselVariable(mCardWidths, mGap)

  if (isMobile) {
    return (
      <div id="work" style={{ position: "relative", padding: "56px 0 40px", overflow: "hidden" }}>
        <motion.div
          drag="x"
          dragConstraints={dragConstraints}
          dragElastic={0.06}
          onDragEnd={handleDragEnd}
          style={{ x: mx, gap: `${mGap}px`, paddingLeft: `${(vpw - mCardWidths[0]) / 2}px`, touchAction: "pan-y" }}
          className="flex items-stretch"
        >
          {PORTFOLIO.map((item, i) => {
            const { services, concept } = portfolioText(item, lang)
            return (
              <div key={i} className="shrink-0 flex flex-col overflow-hidden" style={{ width: `${mCardWidths[i]}px` }}>
                <div className="relative overflow-hidden shrink-0" style={{ width: "100%", height: `${mMediaH}px`, background: "#060f13" }}>
                  {"video" in item
                    ? <LazyVideo src={item.videoMobile} className="size-full object-cover" style={{ background: "#060f13" }} />
                    : <img src={(item as { img: string }).img} alt={item.client} className="size-full object-cover" style={item.client === "Teentac" ? { objectPosition: `${teentacObjX}% center` } : undefined} draggable={false} />
                  }
                </div>
                <div style={{ padding: "14px 4px 0", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div>
                    <p style={{ color: GOLD, fontFamily: CAMPTON_BOOK, fontWeight: 300, fontSize: "10px", letterSpacing: "3px", textTransform: "uppercase", opacity: 0.5, marginBottom: "6px" }}>{services}</p>
                    <div style={{ color: GOLD, fontFamily: CAMPTON_BOLD, fontWeight: 700, fontSize: "clamp(22px, 6vw, 36px)", lineHeight: 1.0, letterSpacing: "-0.5px" }}>{item.client}</div>
                  </div>
                  <p style={{ color: "#fff", fontFamily: CAMPTON_BOOK, fontWeight: 300, fontSize: "12px", lineHeight: 1.5, opacity: 0.6 }}>{concept}</p>
                </div>
              </div>
            )
          })}
        </motion.div>
      </div>
    )
  }

  return (
    <div ref={ref} id="work" style={{ height: "560vh", position: "relative" }}>
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center" style={{ paddingTop: "9vh" }}>
        <motion.div
          style={{ x, gap: `${gap}px`, paddingLeft: "56px" }}
          className="flex items-stretch will-change-transform"
        >
          {PORTFOLIO.map((item, i) => {
            const { services, concept } = portfolioText(item, lang)
            return (
              /* ── Desktop: media 16:9 em cima, texto por baixo ── */
              <div key={i} className="shrink-0 flex flex-col" style={{ width: `${cardW}px` }}>
                <div className="relative overflow-hidden shrink-0" style={{ width: "100%", aspectRatio: "16/9", background: "#060f13" }}>
                  {"video" in item
                    ? <LazyVideo src={item.video} className="size-full object-cover" style={{ background: "#060f13" }} />
                    : item.client === "Teentac"
                      ? <TeentacInteractiveMockup img={(item as { img: string }).img} className="size-full" />
                      : <img src={(item as { img: string }).img} alt={item.client} className="size-full object-cover" />
                  }
                </div>
                <div className="flex items-start justify-between" style={{ paddingTop: "14px", gap: "32px" }}>
                  <div className="flex gap-8 items-start" style={{ maxWidth: "46%" }}>
                    <div style={{ fontFamily: CAMPTON_BOOK, fontWeight: 300, color: GOLD, fontSize: "clamp(12px, 1.1vw, 18px)", textAlign: "right", minWidth: "52px", opacity: 0.7, paddingTop: "2px", flexShrink: 0 }}>{c.concept}</div>
                    <p style={{ fontFamily: CAMPTON_BOLD, fontWeight: 600, color: "#ffffff", fontSize: "clamp(11px, 0.95vw, 15px)", lineHeight: 1.55 }}>{concept}</p>
                  </div>
                  <div className="flex flex-col items-end" style={{ gap: "4px", textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: CAMPTON_BOOK, fontWeight: 300, color: GOLD, fontSize: "clamp(12px, 1.1vw, 18px)", opacity: 0.7 }}>{c.client}</div>
                    <div style={{ fontFamily: CAMPTON_BOLD, fontWeight: 700, color: GOLD, fontSize: "clamp(36px, 5.2vw, 84px)", lineHeight: 1.05, letterSpacing: "-1px" }}>{item.client}</div>
                    <p style={{ fontFamily: CAMPTON_BOOK, fontWeight: 400, color: GOLD, fontSize: "clamp(10px, 0.95vw, 16px)", opacity: 0.8 }}>{services}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </motion.div>

        <motion.div className="absolute bottom-10 right-8 md:right-14 flex items-center gap-3" style={{ opacity: hintOpacity }}>
          <span style={{ color: GOLD, fontFamily: SANS, fontWeight: 300, fontSize: "11px", letterSpacing: "4px", textTransform: "uppercase", opacity: 0.4 }}>{c.scroll}</span>
          <div style={{ width: "32px", height: "1px", background: GOLD, opacity: 0.3 }} />
        </motion.div>
      </div>
    </div>
  )
}

/* ─── Contact link with guaranteed opacity hover (whileHover beats inline style) */
function ContactLink({ href, target, children }: { href: string; target?: string; children: React.ReactNode }) {
  return (
    <motion.a
      href={href}
      target={target}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
      initial={{ opacity: 0.72 }}
      whileHover={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      style={{ color: GOLD, fontFamily: CAMPTON_BOOK, fontWeight: 300, fontSize: "clamp(15px, 1.39vw, 22px)", textAlign: "right" as const, lineHeight: 1.3, textDecoration: "none" }}
    >
      {children}
    </motion.a>
  )
}

function ContactSection() {
  const lang = useLang()
  const c = COPY[lang].contact
  const labelStyle: React.CSSProperties = { color: GOLD, fontFamily: SERIF, fontWeight: 300, fontSize: "clamp(20px, 2.36vw, 34px)", lineHeight: 1.1, letterSpacing: "0.01em" }
  const sep = <span style={{ color: GOLD, opacity: 0.35, fontSize: "clamp(15px, 1.39vw, 20px)" }}> // </span>
  const footerLink: React.CSSProperties = { color: GOLD, fontFamily: SANS, fontWeight: 300, fontSize: "clamp(11px, 0.85vw, 13px)", opacity: 0.4, letterSpacing: "2px", textTransform: "uppercase", textDecoration: "none" }

  return (
    <div className="relative min-h-screen flex flex-col justify-end pb-10 md:pb-16 pt-24 md:pt-0" id="contact">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(183deg, rgba(11,28,34,0) 0%, rgba(6,15,19,0.92) 100%)" }} />
      <div className="relative z-10 px-6 md:px-14">
        <motion.div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8" initial={{ opacity: 0, y: 60 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }} viewport={{ once: true, margin: "-60px" }} style={{ marginBottom: "48px" }}>
          {/* Big text */}
          <div style={{ color: GOLD, fontFamily: SERIF, fontWeight: 300, fontSize: "clamp(90px, 22vw, 400px)", letterSpacing: "0.01em", lineHeight: 0.58, textTransform: "uppercase", flexShrink: 0 }}>
            <div>{c.heading[0]}</div>
            <div>{c.heading[1]}</div>
          </div>

          {/* Contact details */}
          <div className="flex flex-col items-start md:items-end" style={{ gap: "24px", paddingBottom: "4px" }}>
            {([
              { label: c.email, node: <ContactLink href="mailto:conteudos@muche.pt">conteudos@muche.pt</ContactLink> },
              { label: c.contact, node: <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px" }}><ContactLink href="tel:+351912946088">+351 912 946 088</ContactLink>{sep}<ContactLink href="tel:+351968830072">+351 968 830 072</ContactLink></span> },
              { label: c.social, node: <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px" }}><ContactLink href="https://www.facebook.com/Mucheconteudos" target="_blank">Facebook</ContactLink>{sep}<ContactLink href="https://www.instagram.com/muche.pt/" target="_blank">Instagram</ContactLink>{sep}<ContactLink href="https://www.linkedin.com/company/70109807/" target="_blank">LinkedIn</ContactLink></span> },
            ] as { label: string; node: React.ReactNode }[]).map(({ label, node }, i) => (
              <motion.div key={label} className="flex flex-col items-start md:items-end" initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: i * 0.12, ease: "easeOut" }} viewport={{ once: true }} style={{ gap: "4px" }}>
                <span style={labelStyle}>{label}</span>
                {node}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Footer — 3 separate links + copyright */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-5 gap-4" style={{ borderTop: `1px solid ${GOLD}1a` }}>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-8">
            <a href="https://www.iubenda.com/privacy-policy/48985541" target="_blank" rel="noopener noreferrer" style={footerLink}>{c.privacy}</a>
            <a href="https://www.iubenda.com/privacy-policy/48985541/cookie-policy" target="_blank" rel="noopener noreferrer" style={footerLink}>{c.cookies}</a>
            <a href="https://www.iubenda.com/termos-e-condicoes/48985541" target="_blank" rel="noopener noreferrer" style={footerLink}>{c.terms}</a>
          </div>
          <div className="flex items-center gap-5">
            <LangSwitch />
            <span style={{ color: GOLD, fontFamily: SANS, fontWeight: 300, fontSize: "12px", opacity: 0.4 }}>©2026 MUCHE</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Services Page — full-screen scroll one-at-a-time ──────────────────── */
const SERVICES_LIST = [
  { slug: "video",       label: "Video",       label_pt: "Vídeo",         tags: ["Video"],       desc: "Audiovisual production that tells authentic, memorable stories.", desc_pt: "Produção audiovisual que conta histórias autênticas e memoráveis." },
  { slug: "photography", label: "Photography", label_pt: "Fotografia",    tags: ["Photography"], desc: "Images that capture the essence of your brand with precision and beauty.", desc_pt: "Imagens que captam a essência da sua marca com precisão e beleza." },
  { slug: "branding",    label: "Branding",    label_pt: "Branding",      tags: ["Branding"],    desc: "Visual identities that communicate your brand's values with clarity.", desc_pt: "Identidades visuais que comunicam os valores da sua marca com clareza." },
  { slug: "web",         label: "Web Design",  label_pt: "Web Design",    tags: ["Web"],         desc: "Digital experiences designed to impress and convert.", desc_pt: "Experiências digitais desenhadas para impressionar e converter." },
  { slug: "podcast",     label: "Podcast",     label_pt: "Podcast",       tags: ["Podcast"],     desc: "End-to-end podcast production — from idea to distribution.", desc_pt: "Produção de podcast de ponta a ponta — da ideia à distribuição." },
  { slug: "social",      label: "Social Media",label_pt: "Redes Sociais", tags: ["Social"],      desc: "Strategic, creative content for social platforms.", desc_pt: "Conteúdo estratégico e criativo para plataformas sociais." },
]

function ServicesPage() {
  const lang = useLang()
  const cBack = COPY[lang].back
  const cScroll = COPY[lang].services.scrollHint
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  const n = SERVICES_LIST.length
  const rawProgress = useScrollProgress(ref, "end-end")
  const hintOpacity = useTransform(rawProgress, [0, 0.04], [1, 0])
  const [activeIdx, setActiveIdx] = useState(0)
  const pushScale  = useMotionValue(1)
  const pushBlur   = useMotionValue("blur(0px)")
  const pushRadius = useMotionValue("0px")
  const pushOpacity = useMotionValue(1)

  // Scroll hint follows the cursor so it can never sit fixed on top of other text
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const [hasMouse, setHasMouse] = useState(false)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!hasMouse) setHasMouse(true)
      mouseX.set(e.clientX + 20)
      mouseY.set(e.clientY + 20)
    }
    window.addEventListener("mousemove", onMove)
    return () => window.removeEventListener("mousemove", onMove)
  }, [mouseX, mouseY, hasMouse])

  useEffect(() => {
    return rawProgress.on("change", v => {
      const idx = Math.min(n - 1, Math.floor(v * n))
      setActiveIdx(idx)
      const stepSize = 1 / n
      const stepStart = idx * stepSize
      const subP = Math.max(0, Math.min(1, (v - stepStart) / stepSize))
      const pushP = idx < n - 1 ? Math.max(0, (subP - 0.7) / 0.3) : 0
      pushScale.set(1 - pushP * 0.16)
      pushBlur.set(`blur(${pushP * 10}px)`)
      pushRadius.set(`${pushP * 22}px`)
      pushOpacity.set(1 - pushP * 0.15)
    })
  }, [rawProgress, n, pushScale, pushBlur, pushRadius, pushOpacity])

  const active = SERVICES_LIST[activeIdx]

  const matchingProjects = PORTFOLIO.filter(p =>
    active.tags.some(tag => p.services.toLowerCase().includes(tag.toLowerCase()))
  )

  // Auto-rotate through matching projects every 3 s
  const [projectIdx, setProjectIdx] = useState(0)
  useEffect(() => {
    setProjectIdx(0)
  }, [activeIdx])
  useEffect(() => {
    if (matchingProjects.length <= 1) return
    const t = setInterval(() => setProjectIdx(i => (i + 1) % matchingProjects.length), 3000)
    return () => clearInterval(t)
  }, [matchingProjects.length, activeIdx])

  const currentProject = matchingProjects[projectIdx] ?? null

  return (
    <div ref={ref} style={{ height: `${n * 100}vh`, position: "relative" }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <motion.div
          style={{ scale: pushScale, filter: pushBlur, borderRadius: pushRadius, opacity: pushOpacity, transformOrigin: "50% 38%" }}
          className="size-full flex flex-col justify-end pb-10 md:pb-16 px-6 md:px-14"
        >
          <motion.button onClick={() => navigate("/")} whileHover={{ x: -3 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="absolute top-24 left-6 md:top-32 md:left-14" style={{ color: GOLD, fontFamily: SANS, fontWeight: 300, fontSize: "13px", letterSpacing: "3px", textTransform: "uppercase", opacity: 0.5, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>←</span> {cBack}
          </motion.button>

          {/* Single large project — auto-rotates */}
          {currentProject && (
            <motion.div
              key={`${activeIdx}-${projectIdx}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="absolute left-6 right-6 md:left-14 md:right-14 overflow-hidden"
              style={{ top: "clamp(80px, 13vh, 130px)", bottom: "clamp(150px, 24vh, 240px)", borderRadius: "20px" }}
            >
              {"video" in currentProject
                ? <LazyVideo src={(currentProject as { video: string }).video} className="size-full object-cover" style={{ background: "#060f13" }} />
                : <img src={(currentProject as { img: string }).img} alt={currentProject.client} className="size-full object-cover" />
              }
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(6,15,19,0.72) 0%, transparent 55%)" }} />
              <div className="absolute bottom-0 left-0 right-0" style={{ padding: "clamp(16px, 2.5vw, 32px)" }}>
                <p style={{ color: GOLD, fontFamily: CAMPTON_BOOK, fontWeight: 300, fontSize: "clamp(9px, 0.85vw, 13px)", letterSpacing: "3px", textTransform: "uppercase", opacity: 0.6, marginBottom: "6px" }}>{portfolioText(currentProject, lang).services}</p>
                <p style={{ color: GOLD, fontFamily: CAMPTON_BOLD, fontWeight: 700, fontSize: "clamp(24px, 3.5vw, 56px)", lineHeight: 1.0, letterSpacing: "-0.3px" }}>{currentProject.client}</p>
              </div>
              {/* Dot indicators */}
              {matchingProjects.length > 1 && (
                <div className="absolute top-4 right-4 flex gap-2">
                  {matchingProjects.map((_, di) => (
                    <button
                      key={di}
                      onClick={() => setProjectIdx(di)}
                      style={{ width: "6px", height: "6px", borderRadius: "50%", background: GOLD, opacity: di === projectIdx ? 1 : 0.3, border: "none", cursor: "pointer", padding: 0, transition: "opacity 0.3s" }}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          <motion.div
            key={activeIdx}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-8"
          >
            <motion.h2
              style={{ color: GOLD, fontFamily: SERIF, fontWeight: 300, fontSize: "clamp(44px, 9vw, 130px)", lineHeight: 0.9, margin: 0, letterSpacing: "0.01em" }}
            >
              {lang === "pt" ? active.label_pt : active.label}
            </motion.h2>

            <div className="flex flex-col items-end gap-4" style={{ maxWidth: "min(260px, 100%)" }}>
              <p style={{ color: GOLD, fontFamily: CAMPTON_BOOK, fontWeight: 300, fontSize: "clamp(13px, 1.1vw, 17px)", lineHeight: 1.55, opacity: 0.65, textAlign: "right" }}>
                {lang === "pt" ? active.desc_pt : active.desc}
              </p>
            </div>
          </motion.div>

          {/* Scroll hint — follows the cursor, so it never sits fixed over the menu or the page's own text */}
          {hasMouse && (
            <motion.div className="fixed top-0 left-0 z-30 pointer-events-none" style={{ x: mouseX, y: mouseY, opacity: hintOpacity }}>
              <span style={{ color: GOLD, fontFamily: SANS, fontWeight: 300, fontSize: "10px", letterSpacing: "3px", textTransform: "uppercase", opacity: 0.6, whiteSpace: "nowrap" }}>{cScroll}</span>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

/* ─── Team Page — horizontal scroll, faithful to Figma Equipa ───────────── */
const TEAM_MEMBERS: {
  name: string; role: string; role_pt: string
  mobile: string; mobileHref: string; email: string
  linkedin: string; linkedinHref: string
  instagram?: string; instagramHref?: string
  layers: string[]
}[] = [
  {
    name: "Fábio Teixeira",
    role: "Co-founder & Content Creator",
    role_pt: "Cofundador & Criador de Conteúdo",
    mobile: "+351 912 946 088",
    mobileHref: "tel:+351912946088",
    email: "fabio@muche.pt",
    linkedin: "@fabiocidteixeira",
    linkedinHref: "https://www.linkedin.com/in/fabiocidteixeira/",
    layers: [imgTeamBase, imgTeamOv1],
  },
  {
    name: "André Roma",
    role: "Co-founder & Art Director",
    role_pt: "Cofundador & Diretor de Arte",
    mobile: "+351 968 830 072",
    mobileHref: "tel:+351968830072",
    email: "andre@muche.pt",
    linkedin: "@andreroma",
    linkedinHref: "https://www.linkedin.com/in/andre-roma/",
    instagram: "@andreroma139",
    instagramHref: "https://www.instagram.com/andreroma139/",
    layers: [imgTeamBase, imgTeamOv1, imgTeamOv2],
  },
  {
    name: "Filipa Pereira",
    role: "Visual Designer",
    role_pt: "Designer Visual",
    mobile: "+351 939 350 275",
    mobileHref: "tel:+351939350275",
    email: "filipa@muche.pt",
    linkedin: "@filiparisopereira",
    linkedinHref: "https://www.linkedin.com/in/filipa-riso-pereira-84a284165/",
    layers: [imgTeamBase, imgTeamOv1, imgTeamOv2, imgTeamOv3],
  },
  {
    name: "Raquel Pedro",
    role: "Script Writer & Video Editor",
    role_pt: "Argumentista & Editora de Vídeo",
    mobile: "+351 969 059 124",
    mobileHref: "tel:+351969059124",
    email: "raquel@muche.pt",
    linkedin: "@raquelcostapedro",
    linkedinHref: "https://www.linkedin.com/in/raquelcostapedro/",
    layers: [imgTeamBase, imgTeamOv1, imgTeamOv2, imgTeamOv3, imgTeamOv4],
  },
]

function TeamInfoRow({ label, value, href }: { label: string; value: string; href?: string }) {
  const labelSt: React.CSSProperties = { fontFamily: SERIF, fontWeight: 300, color: GOLD, fontSize: "clamp(16px, 2.6vw, 38px)", lineHeight: 1, whiteSpace: "nowrap", letterSpacing: "0.01em" }
  const valSt:   React.CSSProperties = { fontFamily: CAMPTON_BOOK, fontWeight: 300, color: GOLD, fontSize: "clamp(11px, 1.56vw, 22px)", lineHeight: 1, textDecoration: "none", opacity: 0.85 }
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "clamp(8px, 1vw, 16px)", flexWrap: "wrap" }}>
      <span style={labelSt}>{label}</span>
      {href
        ? <motion.a href={href} style={valSt} initial={{ opacity: 0.85 }} whileHover={{ opacity: 1 }}>{value}</motion.a>
        : <span style={valSt}>{value}</span>
      }
    </div>
  )
}

function TeamPage() {
  const lang = useLang()
  const cTeam = COPY[lang].team
  const ref  = useRef<HTMLDivElement>(null)
  useHorizontalSwipeToScroll(ref)
  const [vpw, setVpw] = useState(() => window.innerWidth)
  useEffect(() => {
    const fn = () => setVpw(window.innerWidth)
    window.addEventListener("resize", fn)
    return () => window.removeEventListener("resize", fn)
  }, [])

  // Mesmo limite do PortfolioSection — tablet usa o carrossel vertical.
  const isMobile = vpw < 1024

  /* Desktop (scroll-jacked horizontal carousel) — inalterado. */
  const cardW   = vpw * 0.85
  const gap     = 56
  const targetX = -((TEAM_MEMBERS.length - 1) * (cardW + gap))
  const rawProgress    = useScrollProgress(ref, "end-end")
  const smoothProgress = useSpring(rawProgress, { stiffness: 55, damping: 22, restDelta: 0.0005 })
  const x              = useTransform(smoothProgress, [0, 1], [0, targetX])
  const photoW = "62.8%"
  const textW  = "calc(37.2% - 56px)"

  /* Mobile (carrossel por swipe) — foto vertical, mesmo tamanho para todos. */
  const mCardW = vpw * 0.82
  const mGap   = 20
  const mStep  = mCardW + mGap
  const { x: mx, dragConstraints, handleDragEnd } = useDragCarousel(TEAM_MEMBERS.length, mStep)

  if (isMobile) {
    return (
      <div style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ padding: "112px 0 40px", overflow: "hidden" }}>
          <motion.div
            drag="x"
            dragConstraints={dragConstraints}
            dragElastic={0.06}
            onDragEnd={handleDragEnd}
            style={{ x: mx, gap: `${mGap}px`, paddingLeft: `${(vpw - mCardW) / 2}px`, touchAction: "pan-y" }}
            className="flex items-stretch"
          >
            {TEAM_MEMBERS.map((m, i) => (
              <div key={i} className="shrink-0 flex flex-col" style={{ width: `${mCardW}px` }}>
                <div className="relative overflow-hidden shrink-0" style={{ width: "100%", aspectRatio: "4/5" }}>
                  <img src={m.layers[0]} alt="" className="absolute max-w-none" style={{ height: "115.34%", left: "11.66%", top: "-12.94%", width: "136%" }} draggable={false} />
                  {m.layers.slice(1).map((src, li) => (
                    <img key={li} src={src} alt="" className="absolute inset-0 size-full object-cover max-w-none" draggable={false} />
                  ))}
                </div>
                <div style={{ width: "100%", padding: "16px 4px 0" }}>
                  <h2 style={{ color: GOLD, fontFamily: SERIF, fontWeight: 400, fontStyle: "normal", fontSize: "clamp(28px, 5.7vw, 82px)", lineHeight: 1.0, marginBottom: "clamp(6px, 0.8vw, 12px)", letterSpacing: "0.01em" }}>
                    {m.name}
                  </h2>
                  <p style={{ color: GOLD, fontFamily: CAMPTON_BOOK, fontWeight: 300, fontSize: "clamp(13px, 1.56vw, 22px)", lineHeight: 1.3, opacity: 0.75, marginBottom: "clamp(20px, 3vw, 48px)" }}>
                    {lang === "pt" ? m.role_pt : m.role}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "clamp(8px, 1.2vw, 18px)" }}>
                    <TeamInfoRow label={cTeam.mobile} value={m.mobile} href={m.mobileHref} />
                    <TeamInfoRow label={cTeam.email} value={m.email} href={`mailto:${m.email}`} />
                    <TeamInfoRow label={cTeam.linkedin} value={m.linkedin} href={m.linkedinHref} />
                    {m.instagram && <TeamInfoRow label={cTeam.instagram} value={m.instagram} href={m.instagramHref} />}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} style={{ height: `${TEAM_MEMBERS.length * 140}vh`, position: "relative" }}>
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center">
        <motion.div style={{ x, gap: `${gap}px`, paddingLeft: "56px" }} className="flex items-end will-change-transform pt-28">
          {TEAM_MEMBERS.map((m, i) => (
            <motion.div
              key={i}
              className="shrink-0"
              style={{ width: `${cardW}px`, display: "flex", flexDirection: "row", alignItems: "flex-end", gap: "clamp(24px, 3.5vw, 56px)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
            >
              {/* Photo composite */}
              <div className="relative shrink-0 overflow-hidden" style={{ width: photoW, aspectRatio: "1003/887" }}>
                <img src={m.layers[0]} alt="" className="absolute max-w-none" style={{ height: "115.34%", left: "11.66%", top: "-12.94%", width: "136%" }} />
                {m.layers.slice(1).map((src, li) => (
                  <img key={li} src={src} alt="" className="absolute inset-0 size-full object-cover max-w-none" />
                ))}
              </div>

              {/* Text info */}
              <div style={{ width: textW, paddingBottom: "clamp(16px, 2vw, 32px)" }}>
                <h2 style={{ color: GOLD, fontFamily: SERIF, fontWeight: 400, fontStyle: "normal", fontSize: "clamp(28px, 5.7vw, 82px)", lineHeight: 1.0, marginBottom: "clamp(6px, 0.8vw, 12px)", letterSpacing: "0.01em" }}>
                  {m.name}
                </h2>
                <p style={{ color: GOLD, fontFamily: CAMPTON_BOOK, fontWeight: 300, fontSize: "clamp(13px, 1.56vw, 22px)", lineHeight: 1.3, opacity: 0.75, marginBottom: "clamp(20px, 3vw, 48px)" }}>
                  {lang === "pt" ? m.role_pt : m.role}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "clamp(8px, 1.2vw, 18px)" }}>
                  <TeamInfoRow label={cTeam.mobile} value={m.mobile} href={m.mobileHref} />
                  <TeamInfoRow label={cTeam.email} value={m.email} href={`mailto:${m.email}`} />
                  <TeamInfoRow label={cTeam.linkedin} value={m.linkedin} href={m.linkedinHref} />
                  {m.instagram && <TeamInfoRow label={cTeam.instagram} value={m.instagram} href={m.instagramHref} />}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}

/* ─── Blog ───────────────────────────────────────────────────────────────────
   Os componentes do blog vivem em `src/app/blog/` e não dependem do router
   nem do browser, para poderem ser renderizados no servidor. O que fica aqui
   são apenas os invólucros que ligam o router e o idioma a esses
   componentes. ───────────────────────────────────────────────────────────── */
function BlogPage() {
  const lang = useLang()
  const navigate = useNavigate()
  return <BlogListView posts={postsFor(lang)} lang={lang} onNavigate={navigate} />
}

function ArticlePage() {
  const lang = useLang()
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const post = slug ? postBySlug(slug, lang) : undefined

  useEffect(() => { window.scrollTo(0, 0) }, [slug])

  if (!post) return <ArticleNotFound lang={lang} onNavigate={navigate} />
  return <ArticleView post={post} lang={lang} onNavigate={navigate} />
}

/* ─── Home Page ──────────────────────────────────────────────────────────── */
function HomePage() {
  return (
    <div className="relative z-10">
      <ScrollBlock height="170vh"><HeroSection /></ScrollBlock>
      <ScrollBlock><ManifestoSection /></ScrollBlock>
      <PortfolioSection />
      <ContactSection />
    </div>
  )
}

/* ─── Reset scroll to top on every route change — avoids landing mid-page
   with a scroll position that no longer matches the new page's layout ──── */
function ScrollToTop() {
  const location = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" })
  }, [location.pathname])
  return null
}

/* ─── Layout (global background + nav + outlet) ──────────────────────────── */
function Layout() {
  /* O `pathname` só é observável aqui dentro do router — é o que permite ao
     idioma acompanhar a navegação por histórico (botão Voltar do browser),
     que o `initialLang()` do primeiro render não cobre. Ver `useLangFromPath`
     em `i18n.tsx`. */
  const { pathname } = useLocation()
  useLangFromPath(pathname)
  return (
    <div>
      <ScrollToTop />
      <BackgroundVideo />
      <SiteNav />
      <Outlet />
    </div>
  )
}

/* ─── Router ─────────────────────────────────────────────────────────────── */
const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true,          Component: HomePage },
      { path: "services",     Component: ServicesPage },
      { path: "team",         Component: TeamPage },
      { path: "blog",         Component: BlogPage },
      { path: "blog/:slug",   Component: ArticlePage },
      /* O blog em inglês vive debaixo de `/en` — os mesmos componentes, com o
         idioma imposto pelo caminho (ver `langFromPath` no `i18n.tsx`). Sem
         estas rotas, o HTML pré-renderizado em `/en/blog/...` aparecia e
         desaparecia: o router não encontrava nada e limpava o `<div id="root">`
         assim que o JavaScript montasse. */
      { path: "en/blog",       Component: BlogPage },
      { path: "en/blog/:slug", Component: ArticlePage },
    ],
  },
])

/* ─── Preloader — waits for the images and the hero video before it opens ───── */
const PRELOAD_IMAGES = [imgPort1, imgTeamBase, imgTeamOv1, imgTeamOv2, imgTeamOv3, imgTeamOv4]
/* Só o vídeo do hero bloqueia a abertura do site. Os vídeos do portfólio são
   carregados pelo <LazyVideo>, que só define o src quando a secção fica ativa. */
const PRELOAD_VIDEOS = [heroVideo]
const PRELOAD_TIMEOUT_MS = 15000

function useAssetPreloader() {
  const total = PRELOAD_IMAGES.length + PRELOAD_VIDEOS.length
  const [loaded, setLoaded] = useState(0)
  const [ready, setReady] = useState(total === 0)

  useEffect(() => {
    if (total === 0) return
    let cancelled = false
    let count = 0
    const bump = () => {
      if (cancelled) return
      count++
      setLoaded(count)
      if (count >= total) setReady(true)
    }

    PRELOAD_IMAGES.forEach(src => {
      const img = new Image()
      img.onload = bump
      img.onerror = bump
      img.src = src
    })
    PRELOAD_VIDEOS.forEach(src => {
      fetch(src).then(bump).catch(bump)
    })

    const fallback = setTimeout(() => { if (!cancelled) setReady(true) }, PRELOAD_TIMEOUT_MS)
    return () => { cancelled = true; clearTimeout(fallback) }
  }, [total])

  return { progress: total === 0 ? 1 : loaded / total, ready }
}

function LoadingScreen({ progress }: { progress: number }) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: DARK }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}>
        <NavHamburger />
      </motion.div>
      <div style={{ marginTop: "22px", color: GOLD, fontFamily: SANS, fontWeight: 300, fontSize: "11px", letterSpacing: "4px", textTransform: "uppercase", opacity: 0.5 }}>
        {Math.round(progress * 100)}%
      </div>
    </motion.div>
  )
}

/* As páginas do blog são pré-renderizadas em HTML. Se ficassem à espera do
   vídeo do hero, o visitante olhava para o ecrã de carregamento enquanto o
   texto já estava na página — por isso nestas rotas o preloader é ignorado. */
const isBlogPath = (pathname: string) => langFromPath(pathname) !== null

export default function App() {
  const { progress, ready } = useAssetPreloader()
  const isBlog = typeof window !== "undefined" && isBlogPath(window.location.pathname)
  const gated = ready || isBlog
  return (
    <LangProvider>
      <AnimatePresence>
        {!gated && <LoadingScreen key="loading" progress={progress} />}
      </AnimatePresence>
      {gated && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
          <RouterProvider router={router} />
        </motion.div>
      )}
    </LangProvider>
  )
}