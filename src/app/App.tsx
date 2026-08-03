import { useRef, useEffect, useState, type ReactNode, useMemo } from "react"
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "motion/react"
import { RouterProvider, createBrowserRouter, Outlet, useNavigate, useParams, useLocation } from "react-router"
import heroVideo from "@/imports/Hero_video.mp4"
import svgPaths from "@/imports/HomeFinal/svg-kkmjukgdk7"
import imgPort1 from "@/imports/HorizontalScroll/014471abff9def0ea5f6c8ea469567d04bd612e3.png"
import imgPort2 from "@/imports/HorizontalScroll/66a8dab35a123292bc1e2965a2b2ec70d30157b2.png"
import videoDecoProteste from "@/imports/Vi_deo_Natal_DecoPROteste_1200x628.mp4"
import videoLPCC from "@/imports/LPCC_PORTFOLIO.mp4"
import imgTeamBg   from "@/imports/Equipa/9e968e30d54dd8c86db81bbd440330d0c8bbd7af.png"
import imgTeamBase from "@/imports/Equipa/014471abff9def0ea5f6c8ea469567d04bd612e3.png"
import imgTeamOv1  from "@/imports/Equipa/dbd736375893729f1be8f01cc7ff334c18534a96.png"
import imgTeamOv2  from "@/imports/Equipa/147c0dc1f2d747da38ed29077bb5ca6a2131f401.png"
import imgTeamOv3  from "@/imports/Equipa/f54adf1f173bd3d652fbb4045cf6b96b0314465f.png"
import imgTeamOv4  from "@/imports/Equipa/6b262635396e81047e7283b201ec9ec494f79879.png"
import { LangProvider, useLang, useLangControls, COPY, translateCategory, translateDate, translateReadTime, type Lang } from "./i18n"

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

const GOLD = "#FFAA03"
const DARK = "#0b1c22"
const PALMORE      = "'Palmore', 'Cormorant Garamond', serif"
const CAMPTON_BOLD = "'Campton', 'Jost', sans-serif"
const CAMPTON_BOOK = "'Campton', 'Jost', sans-serif"
const SANS  = CAMPTON_BOOK
const SERIF = PALMORE

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
function LangSwitch({ variant = "nav" }: { variant?: "nav" | "menu" }) {
  const { lang, setLang } = useLangControls()
  const isMenu = variant === "menu"
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
      <button onClick={() => setLang("pt")} style={optionStyle(lang === "pt")}>PT</button>
      <span style={{ color: GOLD, opacity: 0.2, fontSize: isMenu ? "clamp(11px, 2.2vw, 13px)" : "clamp(10px, 0.85vw, 12px)" }}>/</span>
      <button onClick={() => setLang("en")} style={optionStyle(lang === "en")}>EN</button>
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
    { label: c.blog, fn: () => go("/blog") },
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
          <motion.button {...hoverProps} style={btnStyle} onClick={() => go("/blog")}>{c.blog}</motion.button>
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
              <LangSwitch variant="menu" />
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
  // Travão por pausa — suave, não uma parede: enquanto esta secção está
  // "ativa" e ainda não foi destrancada, o scroll continua a mexer-se, só
  // que bastante mais devagar (resistência), em vez de ficar completamente
  // preso. Uma pausa breve já destranca a velocidade normal.
  const PAUSE_MS = 120
  const RESISTANCE = 0.28 // fração da velocidade normal enquanto travado
  const gatedProgress = useMotionValue(0)
  const unlockedRef = useRef(false)
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // "Ativa" = já chegou ao topo (sticky preso) e ainda não saiu de vista.
    const isActive = () => {
      const r = el.getBoundingClientRect()
      return r.top <= 0 && r.bottom > 0
    }

    const attemptScroll = () => {
      if (unlockedRef.current) return true
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current)
      // Só destranca a flag — nunca escreve o progresso aqui. O blur só pode
      // mudar dentro de "onScroll" (disparado por um scroll a sério), nunca
      // como efeito secundário de um temporizador a terminar sozinho.
      pauseTimerRef.current = setTimeout(() => { unlockedRef.current = true }, PAUSE_MS)
      return false
    }

    let lastTouchY: number | null = null

    const onWheel = (e: WheelEvent) => {
      if (unlockedRef.current || !isActive()) return
      if (!attemptScroll()) {
        e.preventDefault()
        window.scrollBy(0, e.deltaY * RESISTANCE)
      }
    }
    const onTouchStart = (e: TouchEvent) => { lastTouchY = e.touches[0]?.clientY ?? null }
    const onTouchMove = (e: TouchEvent) => {
      if (unlockedRef.current || !isActive()) return
      const y = e.touches[0]?.clientY
      const delta = y != null && lastTouchY != null ? lastTouchY - y : 0
      lastTouchY = y ?? lastTouchY
      if (!attemptScroll()) {
        e.preventDefault()
        if (delta) window.scrollBy(0, delta * RESISTANCE)
      }
    }
    window.addEventListener("wheel", onWheel, { passive: false })
    window.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchmove", onTouchMove, { passive: false })

    const onScroll = () => {
      const r = el.getBoundingClientRect()
      if (r.top > window.innerHeight || r.bottom < 0) {
        // Saiu de vista dos dois lados — tranca de novo para a próxima visita.
        unlockedRef.current = false
        if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current)
      }
      gatedProgress.set(unlockedRef.current ? rawProgress.get() : 0)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()

    return () => {
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("scroll", onScroll)
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current)
    }
  }, [rawProgress, gatedProgress])

  const scrollYProgress = useSpring(gatedProgress, { stiffness: 45, damping: 26, restDelta: 0.001 })
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
function rectsOverlap(a: { left: number; right: number; top: number; bottom: number }, b: DOMRect) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

function MucheLogo() {
  const [hovered, setHovered] = useState(false)
  const paths = [svgPaths.p1f980480, svgPaths.p1e8d8a00, svgPaths.p14ba5b00, svgPaths.p32989c80, svgPaths.pe3f1e80, svgPaths.p3eb66200]
  // Direção-base de cada letra — repartida em ângulos uniformes (60° à parte)
  // à volta de um círculo, para que nenhum par de letras fique perto uma da
  // outra por partilharem uma direção parecida. A distância real e a
  // aleatoriedade são calculadas no momento do hover, e reduzidas até não
  // sobrepor nenhum outro elemento da página nem sair do ecrã.
  const baseDir = Array.from({ length: 6 }, (_, i) => {
    const angle = ((-150 + i * 60) * Math.PI) / 180
    return { x: Math.cos(angle), y: Math.sin(angle), rotate: (i % 2 === 0 ? -1 : 1) * (16 + i * 4) }
  })
  const svgRef = useRef<SVGSVGElement>(null)
  const pathRefs = useRef<(SVGPathElement | null)[]>([])
  const [scatter, setScatter] = useState(() => paths.map(() => ({ x: 0, y: 0, rotate: 0 })))

  const computeScatter = () => {
    const margin = 20
    // Zonas a evitar: o menu e o resto do conteúdo da hero (tagline + serviços) —
    // para as letras nunca ficarem em cima de texto legível.
    const keepOut: DOMRect[] = []
    const nav = document.querySelector("nav")
    if (nav) keepOut.push(nav.getBoundingClientRect())
    // svg -> motion.div (px-8...) -> coluna da hero (logo + tagline + serviços)
    const col = svgRef.current?.parentElement?.parentElement
    if (col) {
      Array.from(col.children).slice(1).forEach(child => keepOut.push(child.getBoundingClientRect()))
    }

    const next = paths.map((_, i) => {
      const el = pathRefs.current[i]
      const base = baseDir[i]
      // Aleatoriedade: ângulo ligeiramente rodado à volta da direção base e distância variável.
      const jitter = (Math.random() - 0.5) * 0.9
      const dx = base.x + jitter * (base.y === 0 ? 1 : base.y)
      const dy = base.y + jitter * (base.x === 0 ? 1 : base.x) * 0.6
      const len = Math.hypot(dx, dy) || 1
      const ux = dx / len
      const uy = dy / len
      const rotate = base.rotate * (0.7 + Math.random() * 0.6)
      if (!el) return { x: 0, y: 0, rotate }
      const r = el.getBoundingClientRect()
      const roomX = ux < 0 ? r.left - margin : window.innerWidth - margin - r.right
      const roomY = uy < 0 ? r.top - margin : window.innerHeight - margin - r.bottom
      const maxByX = ux !== 0 ? Math.max(0, roomX) / Math.abs(ux) : Infinity
      const maxByY = uy !== 0 ? Math.max(0, roomY) / Math.abs(uy) : Infinity
      let dist = Math.min(maxByX, maxByY) * (0.55 + Math.random() * 0.35)

      // Reduz a distância até a posição final não sobrepor nenhuma zona proibida.
      for (let tries = 0; tries < 12; tries++) {
        const x = ux * dist
        const y = uy * dist
        const testRect = { left: r.left + x, right: r.right + x, top: r.top + y, bottom: r.bottom + y }
        if (!keepOut.some(k => rectsOverlap(testRect, k))) break
        dist *= 0.75
      }
      return { x: ux * dist, y: uy * dist, rotate }
    })
    setScatter(next)
  }

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 877.256 207"
      fill="none"
      className="w-full max-w-[280px] sm:max-w-[400px] md:max-w-[520px] h-auto mx-auto cursor-pointer"
      style={{ overflow: "visible" }}
      onMouseEnter={() => { computeScatter(); setHovered(true) }}
      onMouseLeave={() => setHovered(false)}
    >
      {paths.map((d, i) => (
        <motion.path
          key={i}
          ref={el => { pathRefs.current[i] = el }}
          d={d}
          fill={GOLD}
          animate={hovered ? { x: scatter[i].x, y: scatter[i].y, rotate: scatter[i].rotate } : { x: 0, y: 0, rotate: 0 }}
          transition={{ type: "spring", stiffness: 170, damping: 14 }}
        />
      ))}
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
          <p style={{ color: GOLD, lineHeight: 0.75, marginBottom: "52px" }}>
            <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: sansSize }}>{c.lead}</span>
            <span style={{ fontFamily: SERIF, fontSize: serifSize, letterSpacing: "0.01em" }}>{c.leadItalic}</span>
            <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: sansSize }}>, {c.sub}</span>
          </p>
          <p style={{ color: GOLD, fontFamily: SERIF, fontWeight: 300, fontSize: serifSize, lineHeight: 0.75, letterSpacing: "0.01em" }}>
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
  | { video: string; client: string; services: string; concept: string; services_pt: string; concept_pt: string }

const PORTFOLIO: PortfolioItem[] = [
  { img: imgPort1, client: "Teentac", services: "Branding // Web Design", concept: "We created the full visual identity and website, balancing medical credibility with a vibrant, youth-centric design to turn complex health data into a supportive, empathetic experience.", services_pt: "Branding // Web Design", concept_pt: "Criámos a identidade visual completa e o website, equilibrando a credibilidade médica com um design vibrante e jovem, transformando dados de saúde complexos numa experiência acolhedora e empática." },
  { img: imgPort2, client: "Serenity", services: "Branding", concept: "We designed a visual identity that breathes sophistication and exclusivity, ensuring that the SER brand feels as premium and personalized as the medical service it represents.", services_pt: "Branding", concept_pt: "Desenhámos uma identidade visual que respira sofisticação e exclusividade, garantindo que a marca SER transmite o mesmo nível premium e personalizado do serviço médico que representa." },
  { video: videoLPCC, client: "LPCC", services: "Branding // Podcast // Web Design", concept: "Muche created the visual identity, website, and produced the podcast called Ligacoes.", services_pt: "Branding // Podcast // Web Design", concept_pt: "A Muche criou a identidade visual, o website, e produziu o podcast chamado Ligações." },
  { video: videoDecoProteste, client: "Deco Proteste", services: "Promotional Video", concept: "We created a cinematic piece that captures the holiday spirit while reinforcing the brand's commitment to consumers, ensuring their message stood out during the busiest time of the year.", services_pt: "Vídeo Promocional", concept_pt: "Criámos uma peça cinematográfica que capta o espírito natalício, reforçando o compromisso da marca com os consumidores e garantindo que a sua mensagem se destacou na época mais concorrida do ano." },
]

function portfolioText(item: PortfolioItem, lang: Lang) {
  return lang === "pt" ? { services: item.services_pt, concept: item.concept_pt } : { services: item.services, concept: item.concept }
}

function PortfolioSection() {
  const lang = useLang()
  const c = COPY[lang].portfolio
  const ref = useRef<HTMLDivElement>(null)
  useHorizontalSwipeToScroll(ref)
  const [vpw, setVpw] = useState(() => window.innerWidth)
  useEffect(() => {
    const onResize = () => setVpw(window.innerWidth)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const isMobile = vpw < 640
  const cardW    = isMobile ? vpw * 0.88 : vpw * 0.80
  const gap      = isMobile ? 28 : 96
  const targetX  = -(3 * (cardW + gap))

  const rawProgress    = useScrollProgress(ref, "end-end")
  const smoothProgress = useSpring(rawProgress, { stiffness: 55, damping: 22, restDelta: 0.0005 })
  const x              = useTransform(smoothProgress, [0, 1], [0, targetX])
  const hintOpacity    = useTransform(rawProgress, [0, 0.06], [1, 0])

  return (
    <div ref={ref} id="work" style={{ height: isMobile ? "680vh" : "560vh", position: "relative" }}>
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center" style={{ paddingTop: "9vh" }}>
        <motion.div
          style={{ x, gap: `${gap}px`, paddingLeft: isMobile ? `${vpw * 0.06}px` : "56px" }}
          className="flex items-stretch will-change-transform"
        >
          {PORTFOLIO.map((item, i) => {
            const { services, concept } = portfolioText(item, lang)
            return isMobile ? (
              /* ── Mobile: image on top, text below (auto height — nunca corta) ── */
              <div key={i} className="shrink-0 flex flex-col overflow-hidden" style={{ width: `${cardW}px`, borderRadius: "20px" }}>
                <div className="relative overflow-hidden shrink-0" style={{ width: "100%", aspectRatio: "4/3" }}>
                  {"video" in item
                    ? <LazyVideo src={item.video} className="size-full object-cover" style={{ background: "#060f13" }} />
                    : <img src={(item as { img: string }).img} alt={item.client} className="size-full object-cover" />
                  }
                </div>
                <div style={{ padding: "16px 20px 20px", background: "rgba(6,15,19,0.45)", backdropFilter: "blur(8px)", display: "flex", flexDirection: "column", gap: "10px", flexShrink: 0 }}>
                  <div>
                    <p style={{ color: GOLD, fontFamily: CAMPTON_BOOK, fontWeight: 300, fontSize: "10px", letterSpacing: "3px", textTransform: "uppercase", opacity: 0.5, marginBottom: "6px" }}>{services}</p>
                    <div style={{ color: GOLD, fontFamily: CAMPTON_BOLD, fontWeight: 700, fontSize: "clamp(26px, 7vw, 44px)", lineHeight: 1.0, letterSpacing: "-0.5px" }}>{item.client}</div>
                  </div>
                  <p style={{ color: "#fff", fontFamily: CAMPTON_BOOK, fontWeight: 300, fontSize: "12px", lineHeight: 1.6, opacity: 0.6 }}>{concept}</p>
                </div>
              </div>
            ) : (
              /* ── Desktop: image on top (altura limitada por vh), texto por baixo ── */
              <div key={i} className="shrink-0 flex flex-col" style={{ width: `${cardW}px` }}>
                <div className="relative overflow-hidden shrink-0" style={{ width: "100%", height: "68vh", borderRadius: "6px", background: "#060f13" }}>
                  {"video" in item
                    ? <LazyVideo src={item.video} className="size-full object-cover" style={{ background: "#060f13" }} />
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
  const cBack = COPY[lang].back
  const cTeam = COPY[lang].team
  const navigate = useNavigate()
  const ref  = useRef<HTMLDivElement>(null)
  useHorizontalSwipeToScroll(ref)
  const [vpw, setVpw] = useState(() => window.innerWidth)
  useEffect(() => {
    const fn = () => setVpw(window.innerWidth)
    window.addEventListener("resize", fn)
    return () => window.removeEventListener("resize", fn)
  }, [])

  const isMobile = vpw < 640

  /* Card: 85vw wide desktop, 92vw mobile, aspect 1597:887 */
  const cardW   = isMobile ? vpw * 0.92 : vpw * 0.85
  const gap     = isMobile ? 24 : 56
  const targetX = -((TEAM_MEMBERS.length - 1) * (cardW + gap))

  const rawProgress    = useScrollProgress(ref, "end-end")
  const smoothProgress = useSpring(rawProgress, { stiffness: 55, damping: 22, restDelta: 0.0005 })
  const x              = useTransform(smoothProgress, [0, 1], [0, targetX])

  /* Photo area = 62.8% of card width; text area = rest */
  const photoW = "62.8%"
  const textW  = "calc(37.2% - 56px)"

  return (
    <div ref={ref} style={{ height: `${TEAM_MEMBERS.length * 140}vh`, position: "relative" }}>
      <motion.button onClick={() => navigate("/")} whileHover={{ x: -3 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="fixed top-24 left-6 md:top-32 md:left-14 z-20" style={{ color: GOLD, fontFamily: SANS, fontWeight: 300, fontSize: "13px", letterSpacing: "3px", textTransform: "uppercase", opacity: 0.5, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
        <span>←</span> {cBack}
      </motion.button>
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center">
        <motion.div style={{ x, gap: `${gap}px`, paddingLeft: isMobile ? "16px" : "56px" }} className="flex items-end will-change-transform pt-28">
          {TEAM_MEMBERS.map((m, i) => (
            <motion.div
              key={i}
              className="shrink-0"
              style={{ width: `${cardW}px`, display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "flex-end", gap: isMobile ? 0 : "clamp(24px, 3.5vw, 56px)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
            >
              {/* Photo composite */}
              {isMobile ? (
                <div className="relative overflow-hidden" style={{ width: "100%", aspectRatio: "16/9" }}>
                  <img src={m.layers[0]} alt="" className="absolute max-w-none" style={{ height: "115.34%", left: "11.66%", top: "-12.94%", width: "136%" }} />
                  {m.layers.slice(1).map((src, li) => (
                    <img key={li} src={src} alt="" className="absolute inset-0 size-full object-cover max-w-none" />
                  ))}
                </div>
              ) : (
                <div className="relative shrink-0 overflow-hidden" style={{ width: photoW, aspectRatio: "1003/887" }}>
                  <img src={m.layers[0]} alt="" className="absolute max-w-none" style={{ height: "115.34%", left: "11.66%", top: "-12.94%", width: "136%" }} />
                  {m.layers.slice(1).map((src, li) => (
                    <img key={li} src={src} alt="" className="absolute inset-0 size-full object-cover max-w-none" />
                  ))}
                </div>
              )}

              {/* Text info */}
              {isMobile ? (
                <div style={{ width: "100%", padding: "16px", paddingBottom: "24px" }}>
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
              ) : (
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
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}

/* ─── Blog data ──────────────────────────────────────────────────────────── */
const BLOG_CATEGORIES = [
  "Branding & Visual Identity",
  "Graphic Design",
  "Video Production",
  "Web Design",
  "Photography & Events",
  "Podcasts",
] as const

type BlogCategory = typeof BLOG_CATEGORIES[number]

interface Post {
  slug: string
  category: BlogCategory
  date: string
  title: string
  title_pt: string
  excerpt: string
  excerpt_pt: string
  readTime: string
  body: { heading?: string; text: string }[]
}

const POSTS: Post[] = [
  {
    slug: "visual-identity-business-asset",
    category: "Branding & Visual Identity",
    date: "July 2026",
    title: "Why visual identity is your most underrated business asset",
    title_pt: "Porque é que a identidade visual é o ativo mais subestimado do seu negócio",
    excerpt: "A great logo is the start, not the finish. We explore what a truly cohesive brand identity means for growth — and why companies that invest in it outperform those that don't.",
    excerpt_pt: "Um bom logótipo é o início, não o fim. Exploramos o que significa uma identidade de marca verdadeiramente coesa para o crescimento — e porque é que as empresas que investem nisso superam as que não o fazem.",
    readTime: "5 min read",
    body: [
      { text: "Most companies treat their visual identity as a one-time expense. They commission a logo, pick a colour palette, and consider the job done. What they're missing is that identity is not a deliverable — it is a living system that, when managed with discipline, becomes one of the most powerful drivers of commercial value they have." },
      { heading: "Recognition compounds over time", text: "Every touchpoint — a business card, a social post, a proposal cover, an invoice — is either reinforcing or eroding your brand. Consistency across all of them builds familiarity, and familiarity builds trust. Research consistently shows that it takes between five and seven impressions for a brand to become memorable. A fragmented identity resets that counter every time." },
      { heading: "Design signals quality before words do", text: "Before a client reads a single line of your copy, they have already formed an opinion based on what they see. Typography, spacing, colour choice, and photography style all communicate competence, care, and positioning. A premium product sold through mediocre design will always struggle to command a premium price." },
      { heading: "The system matters more than the logo", text: "A logo is one element. What truly moves the needle is the system that surrounds it: how colour is used across contexts, how typography scales from headline to footnote, how imagery is selected and treated, how all of it behaves in digital versus print. When that system is coherent, every piece of communication feels like it comes from the same confident source." },
      { text: "Visual identity is not a cost centre. It is the silent salesperson that works every hour of every day, across every medium, making the case for why your brand deserves attention and trust. The companies that understand this invest accordingly — and it shows." },
    ],
  },
  {
    slug: "psychology-of-colour-brand-strategy",
    category: "Branding & Visual Identity",
    date: "May 2026",
    title: "The psychology of colour in brand strategy",
    title_pt: "A psicologia da cor na estratégia de marca",
    excerpt: "Colours are not decorative — they are decisions. We break down how leading brands use colour to trigger emotion, build recognition, and command premium positioning.",
    excerpt_pt: "As cores não são decorativas — são decisões. Explicamos como as marcas de referência usam a cor para despertar emoção, construir reconhecimento e conquistar um posicionamento premium.",
    readTime: "7 min read",
    body: [
      { text: "Colour is one of the most immediate and powerful tools in a brand's arsenal. Before a customer reads your tagline or understands what you do, they have already registered a feeling based on the colours they see. This happens in milliseconds, and it shapes everything that follows." },
      { heading: "Emotion before logic", text: "Studies show that up to 90% of snap judgements about products can be based on colour alone. Warm tones like gold and amber suggest warmth, quality, and tradition. Cool blues communicate trust and precision. Deep greens evoke nature and ethics. None of this is accidental in the brands you admire — it is engineered." },
      { heading: "Owning a colour", text: "Some of the world's most valuable brands have effectively claimed a colour as proprietary territory. This is not about trademarking a shade — it is about being so consistent and so present in a colour that the association becomes automatic. That level of recognition is enormously valuable and takes years of disciplined application to build." },
      { heading: "The mistake most brands make", text: "The most common colour error is selecting shades based on personal preference rather than strategic intent. Your favourite colour may not be the colour that best serves your positioning. The second most common error is inconsistency — using slightly different shades across digital and print, or letting teams apply colour without clear guidelines." },
      { text: "When we approach colour strategy with clients, we start by mapping the emotional territory we want to occupy, then audit what competitors are doing, and finally define a palette — primary, secondary, and functional — that can be applied with absolute consistency across every medium. Colour should be a decision made once, with rigour, and then protected." },
    ],
  },
  {
    slug: "rebranding-without-losing-audience",
    category: "Branding & Visual Identity",
    date: "March 2026",
    title: "Rebranding without losing your audience",
    title_pt: "Fazer rebranding sem perder o seu público",
    excerpt: "Evolution versus revolution: how to modernise a brand identity while keeping the trust and familiarity your customers already associate with you.",
    excerpt_pt: "Evolução versus revolução: como modernizar uma identidade de marca mantendo a confiança e a familiaridade que os seus clientes já associam a si.",
    readTime: "6 min read",
    body: [
      { text: "Every brand reaches a moment when its visual identity no longer reflects who it has become. The design that felt fresh five years ago now feels dated. The logo that worked at launch doesn't scale to a new digital context. The colour palette that made sense for one market no longer serves a broader audience. The question is not whether to evolve — it is how to do it without alienating the people who already trust you." },
      { heading: "Audit before you redesign", text: "Before touching anything visual, understand what your brand has built. Survey existing customers. Identify which elements carry genuine equity — often it is not the logo itself but a colour, a typeface, or a visual rhythm that people have come to associate with you. These are the things you protect. Everything else is open to change." },
      { heading: "Evolution, not revolution", text: "The most successful rebrands are evolutionary. They take the best of what exists and sharpen it — better proportions, cleaner execution, a more considered palette — while preserving the DNA that made the brand recognisable. The audience may not even notice the change immediately, but they will feel it: a sense that the brand has grown up without abandoning what made it trusted." },
      { heading: "Communication is part of the work", text: "How you launch a rebrand matters as much as the rebrand itself. Customers who feel that change has been done to them react differently from those who feel invited into it. The narrative around why the brand is evolving — what it has learned, where it is going — turns a visual update into a statement of intent." },
      { text: "Rebranding done well is a signal of confidence, not confusion. It tells your market that you are paying attention, that you are growing, and that you take the experience of engaging with your brand seriously. Done poorly, it erases equity that took years to build. The difference lies entirely in process." },
    ],
  },
  {
    slug: "discipline-of-editorial-design",
    category: "Graphic Design",
    date: "June 2026",
    title: "Less is more — the discipline of editorial design",
    title_pt: "Menos é mais — a disciplina do design editorial",
    excerpt: "White space, hierarchy, and restraint. The principles that separate design that communicates from design that merely decorates.",
    excerpt_pt: "Espaço em branco, hierarquia e contenção. Os princípios que separam o design que comunica do design que apenas decora.",
    readTime: "4 min read",
    body: [
      { text: "The hardest thing to do in design is also the most powerful: leave space. Not because you have run out of ideas, but because you understand that space is not empty — it is active. It gives elements room to breathe, directs the eye, and signals confidence. Cluttered design is almost always the product of insecurity." },
      { heading: "Hierarchy is the architecture of attention", text: "Every piece of communication needs to answer one question above all others: what do I want the reader to see first? Hierarchy is the answer to that question, expressed visually through size, weight, contrast, and position. Without a clear hierarchy, the reader is left to navigate chaos — and they won't bother." },
      { heading: "Restraint as a creative act", text: "Using fewer elements, colours, and typefaces requires more skill than using many. Each choice carries more weight. A single well-chosen typeface used with precision says more than five typefaces fighting for attention. A two-colour palette applied with discipline is more memorable than a rainbow." },
      { text: "Editorial design at its best disappears. The reader does not think about the layout — they simply read, understand, and feel. That invisibility is the highest compliment a designer can receive. It means the work did its job so well that it got out of the way." },
    ],
  },
  {
    slug: "typography-as-personality",
    category: "Graphic Design",
    date: "April 2026",
    title: "Typography as personality: choosing typefaces that speak",
    title_pt: "A tipografia como personalidade: escolher tipos de letra que falam",
    excerpt: "Every typeface carries a voice. Here is how to match type to tone — and avoid the most common pairing mistakes we see from brands every week.",
    excerpt_pt: "Cada tipo de letra tem uma voz. Aqui explicamos como fazer corresponder o tipo ao tom — e evitar os erros de combinação mais comuns que vemos todas as semanas nas marcas.",
    readTime: "5 min read",
    body: [
      { text: "Typography is one of the most under-appreciated brand decisions a company makes. Most businesses choose a typeface based on what looks nice on a screen in a presentation. Very few ask the deeper question: what does this typeface say about us? Every typeface carries a personality, a history, and a set of connotations — and whether you intend it or not, those connotations transfer to your brand." },
      { heading: "Serifs, sans-serifs, and what they signal", text: "Serif typefaces — those with small strokes at the ends of letterforms — tend to communicate tradition, authority, and refinement. Sans-serifs communicate modernity, clarity, and directness. Neither is better than the other; the question is which better serves your positioning. A luxury brand using a geometric sans-serif is making a deliberate statement about contemporary elegance. A heritage brand using a modern grotesque is saying it has evolved." },
      { heading: "The pairing problem", text: "Most brands use at least two typefaces — one for headlines, one for body text. The most common mistake is choosing two typefaces that are too similar (creating visual monotony) or too different (creating visual conflict). A good pairing creates productive contrast: one typeface expressive and distinctive, the other quiet and highly legible." },
      { heading: "System before aesthetics", text: "Before falling in love with a typeface, verify that it works as a system. Does it have sufficient weights — light, regular, medium, bold — to handle all your communication needs? Does it render well on screen at small sizes? Does it include the character sets you need for your markets? A beautiful typeface that fails in context is useless." },
      { text: "Type is not decoration. It is the voice of your brand rendered visually. Choose it with the same rigour you would apply to any other significant brand decision." },
    ],
  },
  {
    slug: "anatomy-of-cinematic-brand-film",
    category: "Video Production",
    date: "July 2026",
    title: "The anatomy of a cinematic brand film",
    title_pt: "A anatomia de um filme de marca cinematográfico",
    excerpt: "Breaking down what separates a memorable brand film from stock-footage filler — and how to brief your agency so the result actually reflects your brand.",
    excerpt_pt: "Analisamos o que separa um filme de marca memorável de imagens de stock genéricas — e como preparar o briefing para a sua agência, para que o resultado reflita realmente a sua marca.",
    readTime: "8 min read",
    body: [
      { text: "A great brand film does not feel like an advertisement. It feels like a window — into a world, a set of values, a way of seeing. The brands that achieve this understand something fundamental: the goal is not to show what you do. It is to make the viewer feel what it means to be part of what you do." },
      { heading: "Story before production value", text: "The most common mistake in brand filmmaking is investing heavily in production value — beautiful cinematography, expensive locations, polished post-production — while neglecting story. A technically stunning film with nothing to say will be forgotten the moment it ends. A film with a clear, specific, emotionally resonant idea will be remembered and shared, even if the budget was modest." },
      { heading: "The brief is where the film is made", text: "An imprecise brief produces an imprecise film. Before any camera rolls, you need to be able to articulate: what is the one thing this film must communicate? Who is it for, specifically? What do we want the viewer to feel, and then do? What must we never show or say? The answers to these questions are the architecture of the film. Everything else — locations, casting, music, pacing — is in service of them." },
      { heading: "Casting is storytelling", text: "The people who appear in a brand film are its most powerful communicators. They carry authenticity or destroy it. Real customers and employees almost always outperform actors for brand credibility, but they need direction, patience, and a controlled environment. The choice between authentic and aspirational — real people versus a constructed ideal — is one of the most important creative decisions you will make." },
      { heading: "Music is not an afterthought", text: "Music accounts for a disproportionate share of the emotional impact of any film. It shapes how images are interpreted, sets pace, and triggers memory. It should be chosen as part of the creative process, not licensed from a library at the end of the edit. The best brand films treat music as a foundational creative decision." },
      { text: "A cinematic brand film, done well, is one of the highest-ROI investments a brand can make. It works across every digital platform, anchors campaign thinking, and continues generating value long after the initial media spend. But it requires the same discipline and strategic clarity as any other brand investment. Treat it as production first and strategy second, and you will get a beautiful film that moves no one." },
    ],
  },
  {
    slug: "short-form-video-brand-strategy",
    category: "Video Production",
    date: "May 2026",
    title: "Why short-form video is now a brand strategy tool",
    title_pt: "Porque é que o vídeo curto é agora uma ferramenta de estratégia de marca",
    excerpt: "Reels, Shorts, TikToks — the format has matured. We look at how brands are using short-form video not just for reach, but for positioning and loyalty.",
    excerpt_pt: "Reels, Shorts, TikToks — o formato amadureceu. Analisamos como as marcas usam o vídeo curto não só para alcance, mas para posicionamento e fidelização.",
    readTime: "5 min read",
    body: [
      { text: "Short-form video began as an entertainment format and has become a primary channel for brand building. The brands that understood this early — that treated their Reels and Shorts as genuine brand expressions rather than repurposed long-form content — have built audiences and relationships that traditional advertising cannot replicate." },
      { heading: "Native, not repurposed", text: "The most effective short-form video is designed for the format from the start. It is not a trimmed-down TV ad or a vertical crop of a landscape video. It understands how people watch — passively, fast, with their thumb ready to scroll — and it earns attention in the first two seconds or loses it entirely." },
      { heading: "Consistency builds positioning", text: "Short-form video's power for brand strategy lies in frequency and consistency. A brand that shows up every week with content that reflects a clear point of view — an aesthetic, a tone, a set of values — builds familiarity and positioning over time. Each video is a small deposit in the bank of brand recognition." },
      { heading: "The role of series thinking", text: "The brands doing this best are not thinking in individual posts. They are thinking in series — recurring formats, recognisable structures, consistent visual treatment. This makes production more efficient and gives audiences something to anticipate. A recurring format becomes a ritual." },
      { text: "Short-form video is not a social media tactic. It is a brand-building tool with a different cadence and grammar than traditional media. The brands that treat it as such — with the same strategic rigour they apply to their identity or their long-form content — are seeing returns that make traditional advertising look expensive and slow." },
    ],
  },
  {
    slug: "pre-production-great-videos",
    category: "Video Production",
    date: "February 2026",
    title: "Pre-production is where great videos are made",
    title_pt: "É na pré-produção que se fazem os grandes vídeos",
    excerpt: "Most video failures happen before the camera rolls. A look at the planning, scripting, and casting decisions that determine whether a production succeeds.",
    excerpt_pt: "A maioria das falhas em vídeo acontece antes de a câmara começar a gravar. Um olhar sobre as decisões de planeamento, argumento e casting que determinam o sucesso de uma produção.",
    readTime: "6 min read",
    body: [
      { text: "The most persistent myth in video production is that great results come from great execution on the day. In reality, the day of the shoot is where you either harvest or lose what you built in pre-production. By the time the camera rolls, a well-run production is simply executing a plan that has already solved most of the problems." },
      { heading: "The script is the foundation", text: "Every minute of screen time requires roughly ten minutes of pre-production thinking. A script — whether for a spoken narrative, a visual sequence, or a structured interview — defines what must be captured and what the edit will need. Shooting without one is asking your editor to build a house from randomly collected bricks." },
      { heading: "Location is not a backdrop", text: "The space in which you film communicates as powerfully as the words spoken. A location that genuinely belongs to the brand — an actual workspace, a real environment, a meaningful place — reads differently from a hired studio dressed to look like one. Whenever possible, choose authentic over constructed." },
      { heading: "Shot lists and call sheets", text: "A shot list is the translation of the script into specific camera instructions. A call sheet tells every person on the production when to be where, what to bring, and what happens in what order. These are not bureaucratic documents — they are the difference between a focused, efficient day and a chaotic, expensive one." },
      { text: "The investment in thorough pre-production always pays back more than it costs. It reduces the risk of expensive re-shoots, gives clients confidence, and creates the conditions for the creative team to do their best work. Good films are planned into existence. They are not improvised." },
    ],
  },
  {
    slug: "designing-for-emotion",
    category: "Web Design",
    date: "June 2026",
    title: "Designing for emotion, not just function",
    title_pt: "Desenhar para a emoção, não só para a função",
    excerpt: "The best websites don't just work — they feel right. A look at the micro-decisions that shape that feeling: motion, spacing, contrast, and tone.",
    excerpt_pt: "Os melhores websites não se limitam a funcionar — têm de parecer certos. Um olhar sobre as micro-decisões que moldam essa sensação: movimento, espaçamento, contraste e tom.",
    readTime: "5 min read",
    body: [
      { text: "A website can be technically excellent — fast, accessible, logically structured — and still leave visitors cold. Function is the floor, not the ceiling. The websites that convert and retain visitors do something beyond working correctly: they create a feeling that aligns with what the brand promises. That feeling is designed, not accidental." },
      { heading: "Motion as communication", text: "Subtle animation — how elements enter the screen, how interactions respond to cursor movement, how transitions between states feel — is one of the most powerful tools for communicating a brand's personality. A brand that values precision and quality should move differently from a brand that values energy and spontaneity. Motion design is brand design." },
      { heading: "Spacing signals confidence", text: "Generous whitespace is the most immediately legible signal of a premium brand online. It says: we are not afraid to leave room. We trust that what we have is enough. Cramped, information-dense layouts signal anxiety. Breathing room signals confidence." },
      { heading: "Typography at scale", text: "Headlines on web are not just big text — they are the first and often only thing a visitor reads before deciding whether to continue. The scale, weight, and line-height of a headline shapes the emotional register of the entire page. Getting this right is as much a brand decision as it is a typographic one." },
      { text: "The websites we are proudest of are the ones where clients tell us they don't know exactly why it feels so right — it just does. That feeling is the product of hundreds of small decisions made with care and coherence. It is invisible when it works. It is immediately obvious when it doesn't." },
    ],
  },
  {
    slug: "hidden-cost-slow-website",
    category: "Web Design",
    date: "March 2026",
    title: "The hidden cost of a slow website",
    title_pt: "O custo escondido de um website lento",
    excerpt: "Every second of load time costs conversions. We examine what performance really means for brand perception — and the simple changes that make the biggest difference.",
    excerpt_pt: "Cada segundo de tempo de carregamento custa conversões. Analisamos o que a performance realmente significa para a perceção da marca — e as mudanças simples que fazem a maior diferença.",
    readTime: "4 min read",
    body: [
      { text: "Speed is invisible when it is there and unbearable when it is not. A fast website is not noticed — it simply allows the experience to begin. A slow website is noticed immediately, and the judgment it provokes is disproportionately harsh: if this company cannot be bothered to make their website fast, what does that say about how they treat other details?" },
      { heading: "The numbers are stark", text: "Google's data has consistently shown that a one-second delay in page load time can reduce conversions by up to 20%. For mobile users — now the majority of web traffic — the tolerance is even lower. A page that takes more than three seconds to load on mobile will lose over half of its visitors before they have seen a single word of content." },
      { heading: "Performance is a brand value", text: "Beyond conversion data, performance is a signal. A fast, smooth, responsive website communicates that the company behind it is competent, modern, and respectful of the visitor's time. A slow, stuttering experience does the opposite — regardless of how beautiful the design might be once it finally loads." },
      { heading: "Where the gains are", text: "The most common performance problems are also the easiest to fix: oversized images that have not been compressed or served in modern formats, JavaScript that blocks rendering, fonts loaded inefficiently, and server response times that are needlessly slow. In most cases, addressing these four areas alone produces dramatic improvements without any redesign." },
      { text: "Performance is not a technical afterthought. It is a brand decision, and it should be treated as such from the start of every web project." },
    ],
  },
  {
    slug: "event-photography-tells-story",
    category: "Photography & Events",
    date: "June 2026",
    title: "Event photography that tells the story, not just the moment",
    title_pt: "Fotografia de eventos que conta a história, não só o momento",
    excerpt: "Good event photography captures faces. Great event photography captures meaning. Here is the briefing process we use to ensure every shoot delivers narrative value.",
    excerpt_pt: "Uma boa fotografia de evento capta rostos. Uma ótima fotografia de evento capta significado. Aqui está o processo de briefing que usamos para garantir que cada sessão entrega valor narrativo.",
    readTime: "4 min read",
    body: [
      { text: "Events generate photography. Almost every company that runs a conference, a product launch, or a client dinner walks away with hundreds of images. Very few walk away with a story. The difference lies entirely in the briefing and intent that go into the shoot." },
      { heading: "Define the narrative before the event", text: "Before the day, ask: what is the story this event is telling? What do we want someone who was not there to understand and feel when they see the images? The answers shape everything — which moments the photographer prioritises, which details they capture, which people they follow." },
      { heading: "The hierarchy of moments", text: "Not all moments at an event are equal. There are the official moments — the speaker on stage, the award being presented — and then there are the real moments: the conversation in the corridor, the genuine reaction, the small detail that captures the atmosphere. A great event photographer knows that the second category is often more valuable than the first." },
      { heading: "The brief is a collaboration", text: "Share the event programme in advance. Walk the photographer through the venue. Identify the people and moments that must be captured. Discuss the intended use of the images — social media requires different framing than a printed report. The more context the photographer has, the better their decisions will be in the moment." },
      { text: "Event photography, done well, extends the life and reach of the event itself. Images that tell a story are shared, remembered, and used. Images that merely document are filed and forgotten." },
    ],
  },
  {
    slug: "product-photography-losing-sales",
    category: "Photography & Events",
    date: "April 2026",
    title: "Why your product photography might be losing you sales",
    title_pt: "Porque é que a sua fotografia de produto pode estar a fazer-lhe perder vendas",
    excerpt: "In e-commerce, photography is the product experience. We look at the lighting, styling, and context decisions that convert browsers into buyers.",
    excerpt_pt: "No e-commerce, a fotografia é a experiência do produto. Analisamos as decisões de iluminação, styling e contexto que convertem visitantes em compradores.",
    readTime: "5 min read",
    body: [
      { text: "In a physical store, a customer can pick up a product, feel its weight, read its label, and examine it from every angle. Online, they have only the photograph. This means product photography is not a support element of the e-commerce experience — it is the experience. And yet most brands treat it as a commodity, a box to be ticked at the lowest possible cost." },
      { heading: "Lighting is the difference between cheap and premium", text: "The single most impactful variable in product photography is lighting. Soft, directional light that models the form of an object communicates quality. Flat, overhead light that washes out texture and depth communicates the opposite. This is true regardless of the product itself — the same item photographed in good light and poor light reads as two different products at two different price points." },
      { heading: "Context sells the aspiration", text: "Pure white-background studio shots are necessary but not sufficient. They show the product; they do not sell the life the product enables. Lifestyle photography — the product in use, in an environment that resonates with the target customer — creates desire rather than just awareness. The most effective e-commerce strategies use both in combination." },
      { heading: "Consistency is a brand signal", text: "When every product image follows the same lighting approach, the same styling language, the same proportion and framing, the overall effect is one of a brand that is in control and takes quality seriously. Inconsistent product photography — different lighting, different backgrounds, different scales — signals the opposite, even if each individual image is technically competent." },
      { text: "Photography is not a cost to be minimised. For any brand selling online, it is one of the highest-leverage investments available. The question is not whether to invest in good photography, but how long you can afford not to." },
    ],
  },
  {
    slug: "what-makes-podcast-worth-listening",
    category: "Podcasts",
    date: "May 2026",
    title: "What makes a podcast worth listening to?",
    title_pt: "O que torna um podcast digno de ser ouvido?",
    excerpt: "Audio storytelling is having a moment. Here is what the best brand podcasts get right — and the production and editorial choices that separate the memorable from the forgettable.",
    excerpt_pt: "A narrativa em áudio está em alta. Eis o que os melhores podcasts de marca fazem bem — e as escolhas de produção e edição que separam o memorável do esquecível.",
    readTime: "6 min read",
    body: [
      { text: "There are now more podcasts than any listener could explore in multiple lifetimes. Most of them are not bad — they are simply unnecessary. They exist because someone decided their brand should have a podcast, without asking the harder question: what would make this worth someone's time and attention? That question is where all great podcasts begin." },
      { heading: "The gift of genuine perspective", text: "The podcasts that build loyal audiences have a point of view. They do not try to be all things to all people. They say: this is what we believe, this is the lens through which we see the world, and we are going to share it with consistency and conviction. This specificity is what converts casual listeners into devoted ones." },
      { heading: "Sound design is not optional", text: "Audio quality is table stakes. A podcast recorded in a room with poor acoustics, with background noise, with level inconsistencies between speakers, communicates carelessness regardless of how good the content is. But sound design goes beyond technical quality — it includes music, transitions, and the overall sonic identity of the show. These elements make the experience cohesive and memorable." },
      { heading: "The edit is where the podcast is made", text: "A one-hour conversation rarely makes a one-hour podcast. The edit is where rambling becomes clarity, where pace is controlled, where the best 40 minutes of a 90-minute conversation is preserved and everything else is removed. Good editing is invisible. It makes the listener feel the conversation was always this tight." },
      { text: "A brand podcast that earns genuine listeners is an extraordinary asset. It places your thinking directly in someone's ears while they commute, exercise, or cook. That level of intimacy and sustained attention is something no other medium can replicate. But it requires the same respect for the audience's time that any worthwhile creative work demands." },
    ],
  },
  {
    slug: "podcast-strategy-before-production",
    category: "Podcasts",
    date: "January 2026",
    title: "Podcast strategy before production: defining your audience and format",
    title_pt: "Estratégia de podcast antes da produção: definir o seu público e formato",
    excerpt: "Before you record a single episode, the decisions you make about format, cadence, and positioning will determine whether your podcast grows or stalls.",
    excerpt_pt: "Antes de gravar um único episódio, as decisões que tomar sobre formato, cadência e posicionamento vão determinar se o seu podcast cresce ou estagna.",
    readTime: "7 min read",
    body: [
      { text: "The most common reason brand podcasts fail is not poor production or bad content. It is the absence of strategy. They are launched without a clear answer to who they are for, what they are trying to achieve, and how they will sustain themselves beyond the first three episodes. These are questions that must be answered before a microphone is ever switched on." },
      { heading: "Audience before topic", text: "Most podcasts are defined by their topic: a show about marketing, a show about entrepreneurship, a show about wellness. The better approach is to define the audience first and then find the angle on the topic that is most useful and distinctive to that specific group of people. The more precisely you can describe your listener, the more precisely you can serve them." },
      { heading: "Format is a commitment", text: "Interview shows, solo narrative, roundtable, documentary — each format has different production demands, different audience expectations, and different creative possibilities. The format you choose is a commitment you will live with for as long as the show runs. Choose it based on what you can sustain and what best serves the content, not based on what seems most impressive." },
      { heading: "Cadence sets expectations", text: "Weekly, fortnightly, monthly — whatever cadence you commit to, your audience will internalise it. Breaking that cadence without warning erodes trust. Before launching, be honest about your capacity to produce episodes consistently over time. A fortnightly show maintained for two years is worth more than a weekly show that goes dark after six months." },
      { heading: "The first ten episodes are the hardest", text: "Podcast growth is slow and non-linear. Most shows that become successful did not feel successful in the first three months. The brands that succeed with podcasting are the ones that commit to a long enough window to find their voice, build their audience, and refine their format. Twelve months is a minimum. Two years is where the real returns begin to compound." },
      { text: "A podcast is a significant investment of time and creative energy. Approached with strategy, it is one of the most powerful brand-building tools available. Approached without it, it is an expensive experiment that produces three episodes and a lesson learned the hard way." },
    ],
  },
]

/* ─── Blog list page ─────────────────────────────────────────────────────── */
function BlogPage() {
  const lang = useLang()
  const cBack = COPY[lang].back
  const cBlog = COPY[lang].blog
  const navigate = useNavigate()
  const [active, setActive] = useState<BlogCategory | null>(null)

  const filtered = useMemo(
    () => active ? POSTS.filter(p => p.category === active) : POSTS,
    [active]
  )

  return (
    <div className="min-h-screen pt-28 md:pt-36 pb-20 md:pb-32 px-6 md:px-14 relative z-10">
      {/* Overlay escuro para melhor legibilidade sobre o vídeo de fundo */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: "linear-gradient(to bottom, rgba(6,15,19,0.55) 0%, rgba(6,15,19,0.82) 40%, rgba(6,15,19,0.92) 100%)" }} />

      <div className="relative z-10">
        {/* Back */}
        <motion.button
          onClick={() => navigate("/")}
          whileHover={{ x: -3 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          style={{ color: GOLD, fontFamily: SANS, fontWeight: 300, fontSize: "13px", letterSpacing: "3px", textTransform: "uppercase", opacity: 0.5, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", marginBottom: "32px" }}
        >
          <span>←</span> {cBack}
        </motion.button>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}>
          <h1 style={{ color: GOLD, fontFamily: SERIF, fontWeight: 300, fontSize: "clamp(36px, 7vw, 100px)", letterSpacing: "0.01em", lineHeight: 0.9, marginBottom: "52px" }}>
            {cBlog.title}
          </h1>
        </motion.div>

        {/* Category filters */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
          className="flex flex-wrap gap-3"
          style={{ marginBottom: "56px" }}
        >
          <button
            onClick={() => setActive(null)}
            style={{
              background: "none",
              border: `1px solid ${GOLD}${active === null ? "ff" : "30"}`,
              color: GOLD,
              fontFamily: CAMPTON_BOOK,
              fontWeight: 300,
              fontSize: "11px",
              letterSpacing: "3px",
              textTransform: "uppercase",
              padding: "8px 18px",
              cursor: "pointer",
              opacity: active === null ? 1 : 0.45,
              transition: "opacity 0.25s, border-color 0.25s",
            }}
          >
            {cBlog.all}
          </button>
          {BLOG_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActive(active === cat ? null : cat)}
              style={{
                background: "none",
                border: `1px solid ${GOLD}${active === cat ? "ff" : "30"}`,
                color: GOLD,
                fontFamily: CAMPTON_BOOK,
                fontWeight: 300,
                fontSize: "11px",
                letterSpacing: "3px",
                textTransform: "uppercase",
                padding: "8px 18px",
                cursor: "pointer",
                opacity: active === cat ? 1 : 0.45,
                transition: "opacity 0.25s, border-color 0.25s",
              }}
            >
              {translateCategory(cat, lang)}
            </button>
          ))}
        </motion.div>

        {/* Article list */}
        <div style={{ borderTop: `1px solid ${GOLD}1a` }}>
          {filtered.map((post, i) => (
            <motion.div
              key={post.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
              onClick={() => navigate(`/blog/${post.slug}`)}
              className="group cursor-pointer flex flex-col sm:flex-row sm:items-start sm:justify-between sm:gap-16 py-8 md:py-10"
              style={{ borderBottom: `1px solid ${GOLD}1a` }}
            >
              {/* Meta */}
              <div style={{ flex: "0 0 auto", minWidth: "140px", marginBottom: "8px" }}>
                <p style={{ color: GOLD, fontFamily: CAMPTON_BOOK, fontWeight: 300, fontSize: "10px", letterSpacing: "3px", textTransform: "uppercase", opacity: 0.6, marginBottom: "8px" }}>{translateCategory(post.category, lang)}</p>
                <p style={{ color: GOLD, fontFamily: CAMPTON_BOOK, fontWeight: 300, fontSize: "12px", opacity: 0.5, marginBottom: "6px" }}>{translateDate(post.date, lang)}</p>
                <p style={{ color: GOLD, fontFamily: CAMPTON_BOOK, fontWeight: 300, fontSize: "11px", opacity: 0.45 }}>{translateReadTime(post.readTime, lang)}</p>
              </div>
              {/* Content */}
              <div style={{ flex: 1 }}>
                <h3
                  className="group-hover:opacity-75 transition-opacity duration-300"
                  style={{ color: GOLD, fontFamily: SERIF, fontWeight: 300, fontSize: "clamp(22px, 2.4vw, 38px)", lineHeight: 1.1, marginBottom: "14px", letterSpacing: "0.01em" }}
                >
                  {lang === "pt" ? post.title_pt : post.title}
                </h3>
                <p style={{ color: GOLD, fontFamily: CAMPTON_BOOK, fontWeight: 300, fontSize: "clamp(13px, 1vw, 16px)", lineHeight: 1.7, opacity: 0.75 }}>
                  {lang === "pt" ? post.excerpt_pt : post.excerpt}
                </p>
              </div>
              {/* Arrow */}
              <span
                className="hidden sm:block group-hover:opacity-60 transition-opacity duration-300"
                style={{ color: GOLD, opacity: 0.2, fontSize: "22px", flexShrink: 0, paddingTop: "4px" }}
              >
                →
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Article page ───────────────────────────────────────────────────────── */
function ArticlePage() {
  const lang = useLang()
  const cBlog = COPY[lang].blog
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const post = POSTS.find(p => p.slug === slug)

  useEffect(() => { window.scrollTo(0, 0) }, [slug])

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center relative z-10">
        <div className="text-center">
          <p style={{ color: GOLD, fontFamily: SANS, fontSize: "12px", letterSpacing: "4px", textTransform: "uppercase", opacity: 0.4, marginBottom: "24px" }}>{cBlog.notFound}</p>
          <motion.button onClick={() => navigate("/blog")} whileHover={{ x: -3 }} style={{ color: GOLD, fontFamily: SANS, fontWeight: 300, fontSize: "13px", letterSpacing: "3px", textTransform: "uppercase", opacity: 0.6, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", margin: "0 auto" }}>
            <span>←</span> {cBlog.backToBlog}
          </motion.button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative z-10">
      {/* Frosted top overlay for readability */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: "linear-gradient(to bottom, rgba(6,15,19,0.55) 0%, rgba(6,15,19,0.82) 40%, rgba(6,15,19,0.92) 100%)" }} />

      <div className="relative z-10 max-w-3xl mx-auto px-5 sm:px-8 pt-28 md:pt-36 pb-20 md:pb-32">
        {/* Back */}
        <motion.button
          onClick={() => navigate("/blog")}
          whileHover={{ x: -3 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          style={{ color: GOLD, fontFamily: SANS, fontWeight: 300, fontSize: "13px", letterSpacing: "3px", textTransform: "uppercase", opacity: 0.5, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", marginBottom: "56px" }}
        >
          <span>←</span> {cBlog.title}
        </motion.button>

        {/* Meta */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }}>
          <div className="flex flex-wrap items-center gap-3 md:gap-6" style={{ marginBottom: "28px" }}>
            <span style={{ color: GOLD, fontFamily: CAMPTON_BOOK, fontWeight: 300, fontSize: "10px", letterSpacing: "3px", textTransform: "uppercase", opacity: 0.4 }}>{translateCategory(post.category, lang)}</span>
            <span className="hidden sm:inline" style={{ color: GOLD, opacity: 0.2, fontSize: "10px" }}>·</span>
            <span style={{ color: GOLD, fontFamily: CAMPTON_BOOK, fontWeight: 300, fontSize: "12px", opacity: 0.3 }}>{translateDate(post.date, lang)}</span>
            <span className="hidden sm:inline" style={{ color: GOLD, opacity: 0.2, fontSize: "10px" }}>·</span>
            <span style={{ color: GOLD, fontFamily: CAMPTON_BOOK, fontWeight: 300, fontSize: "11px", opacity: 0.25 }}>{translateReadTime(post.readTime, lang)}</span>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          style={{ color: GOLD, fontFamily: SERIF, fontWeight: 300, fontSize: "clamp(26px, 4.5vw, 64px)", lineHeight: 1.08, letterSpacing: "0.01em", marginBottom: "20px" }}
        >
          {lang === "pt" ? post.title_pt : post.title}
        </motion.h1>

        {lang === "pt" && (
          <p style={{ color: GOLD, fontFamily: CAMPTON_BOOK, fontWeight: 300, fontSize: "12px", opacity: 0.4, fontStyle: "italic", marginBottom: "36px" }}>
            O texto completo deste artigo está disponível apenas em inglês.
          </p>
        )}

        {/* Divider */}
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }} style={{ height: "1px", background: `${GOLD}25`, marginBottom: "48px", transformOrigin: "left" }} />

        {/* Body */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}>
          {post.body.map((block, i) => (
            <div key={i} style={{ marginBottom: "32px" }}>
              {block.heading && (
                <h2 style={{ color: GOLD, fontFamily: SERIF, fontWeight: 300, fontSize: "clamp(20px, 2vw, 30px)", lineHeight: 1.2, letterSpacing: "0.01em", marginBottom: "14px", opacity: 0.9 }}>
                  {block.heading}
                </h2>
              )}
              <p style={{ color: GOLD, fontFamily: CAMPTON_BOOK, fontWeight: 300, fontSize: "clamp(14px, 1.15vw, 18px)", lineHeight: 1.85, opacity: 0.65 }}>
                {block.text}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Footer divider + back */}
        <div style={{ marginTop: "64px", paddingTop: "32px", borderTop: `1px solid ${GOLD}1a` }}>
          <motion.button
            onClick={() => navigate("/blog")}
            whileHover={{ x: -3 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            style={{ color: GOLD, fontFamily: SANS, fontWeight: 300, fontSize: "13px", letterSpacing: "3px", textTransform: "uppercase", opacity: 0.4, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <span>←</span> {cBlog.backToBlog}
          </motion.button>
        </div>
      </div>
    </div>
  )
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
    ],
  },
])

/* ─── Preloader — waits for every image/video used on the site before it opens ── */
const PRELOAD_IMAGES = [imgPort1, imgPort2, imgTeamBase, imgTeamOv1, imgTeamOv2, imgTeamOv3, imgTeamOv4]
const PRELOAD_VIDEOS = [heroVideo, videoLPCC, videoDecoProteste]
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

export default function App() {
  const { progress, ready } = useAssetPreloader()
  return (
    <LangProvider>
      <AnimatePresence>
        {!ready && <LoadingScreen key="loading" progress={progress} />}
      </AnimatePresence>
      {ready && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
          <RouterProvider router={router} />
        </motion.div>
      )}
    </LangProvider>
  )
}