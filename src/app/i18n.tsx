import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

export type Lang = "en" | "pt"

const STORAGE_KEY = "muche-lang"

export function detectLang(): Lang {
  if (typeof navigator === "undefined") return "en"
  const candidates = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]
  const hit = candidates.find(l => l?.toLowerCase().startsWith("pt"))
  return hit ? "pt" : "en"
}

/* ─── O idioma que o endereço impõe ──────────────────────────────────────────
   As páginas do blog são pré-renderizadas em HTML, uma por idioma: `/blog` e
   `/blog/<slug>` saem em português, `/en/blog` e `/en/blog/<slug>` em inglês.
   Esse HTML chega ao browser já escrito — e se a deteção automática dissesse
   outra coisa (um visitante com português no browser a abrir um endereço
   `/en`), o React montava por cima com o outro idioma e o texto trocava
   debaixo dos olhos de quem já estava a ler. Também não seria o que o motor
   de busca indexou.

   Por isso, nestes endereços, é o caminho que manda — à frente do
   `localStorage` e do `navigator`. O resto do site não tem endereços por
   idioma, e aí a escolha continua a ser a de sempre. ─────────────────────── */
const CAMINHO_BLOG = /^\/(en\/)?blog(\/|$)/

export function langFromPath(pathname: string): Lang | null {
  const m = CAMINHO_BLOG.exec(pathname)
  if (!m) return null
  return m[1] ? "en" : "pt"
}

/* O mesmo endereço no outro idioma, para o seletor PT/EN poder acompanhar.
   Devolve `null` fora do blog, onde não há par de endereços a trocar. */
export function blogPathIn(pathname: string, lang: Lang): string | null {
  const m = /^\/(?:en\/)?blog(\/.*)?$/.exec(pathname)
  if (!m) return null
  const resto = m[1] ?? ""
  return `${lang === "en" ? "/en" : ""}/blog${resto}`
}

function initialLang(): Lang {
  const doCaminho = typeof window !== "undefined" ? langFromPath(window.location.pathname) : null
  if (doCaminho) return doCaminho
  try {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null
    if (saved === "en" || saved === "pt") return saved
  } catch {
    // localStorage unavailable — fall through to auto-detection
  }
  return detectLang()
}

interface LangContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  /* Impõe o idioma sem o gravar: a escolha é do endereço, não do visitante. */
  forceLang: (lang: Lang) => void
}

const LangContext = createContext<LangContextValue>({ lang: "en", setLang: () => {}, forceLang: () => {} })

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)
  const setLang = (l: Lang) => {
    setLangState(l)
    try { localStorage.setItem(STORAGE_KEY, l) } catch {
      // ignore write failures (e.g. private browsing)
    }
  }
  /* O idioma é escolhido no cliente, por isso o <html lang> e o <title> que vêm
     no index.html ficam desatualizados assim que alguém troca para inglês.
     Mantém os dois a par do conteúdo que está realmente a ser mostrado. */
  useEffect(() => {
    const meta = COPY[lang].meta
    document.documentElement.lang = lang
    document.title = meta.title
    document.querySelector('meta[name="description"]')?.setAttribute("content", meta.description)
  }, [lang])

  return <LangContext.Provider value={{ lang, setLang, forceLang: setLangState }}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext).lang
}

/* ─── Manter o idioma a par do endereço depois da montagem ───────────────────
   O `initialLang` resolve o primeiro render — é ele que evita ver o texto
   trocar numa página pré-renderizada. Mas o endereço muda mais do que uma vez:
   o botão Voltar do browser desfaz a navegação do seletor PT/EN e devolvia um
   `/en/blog` com texto português e ligações para `/blog`, que é exatamente o
   desencontro que os endereços por idioma existem para evitar.

   Daí este efeito, a correr dentro do router, onde o `pathname` é observável.
   Usa o `forceLang`: o idioma vem do endereço, não é uma escolha a gravar. */
export function useLangFromPath(pathname: string) {
  const { lang, forceLang } = useContext(LangContext)
  useEffect(() => {
    const doCaminho = langFromPath(pathname)
    if (doCaminho && doCaminho !== lang) forceLang(doCaminho)
  }, [pathname, lang, forceLang])
}

export function useLangControls() {
  return useContext(LangContext)
}

/* ─── UI copy — structural / chrome text ─────────────────────────────────── */
export const COPY = {
  en: {
    meta: {
      title: "Muche — The Creative Agency",
      description: "Creative agency in Portugal. Video, photography, branding, design, web and podcast — we turn challenges into thoughtful, effective creative work.",
    },
    nav: { work: "Work", services: "Services", team: "Team", blog: "Blog", hub: "Digital Hub", talk: "Let's Talk" },
    hero: {
      tagline: "The Creative Agency",
      tags: ["Video", "Photography", "Branding", "Design", "Web", "Podcast"],
    },
    manifesto: {
      heading: { line1: "Relaxing", small: ["as a"], big: "Spa" },
      lead: "We create ",
      leadItalic: "everything image related",
      sub: "always guided by the same principle:",
      quote: "Have you relax while we turn challenges into thoughtful, effective creative work.",
    },
    portfolio: { concept: "Concept", client: "Client", scroll: "Scroll" },
    contact: {
      heading: ["let's", "Talk?"],
      email: "Email",
      contact: "Contact",
      social: "Social Media",
      privacy: "Privacy",
      cookies: "Cookies",
      terms: "Terms",
    },
    back: "Back",
    services: {
      scrollHint: "Scroll to explore",
    },
    team: { mobile: "Mobile:", email: "Email:", linkedin: "LinkedIn:", instagram: "Instagram:" },
    blog: { title: "Blog", all: "All", notFound: "Article not found", backToBlog: "Back to Blog" },
  },
  pt: {
    meta: {
      title: "Muche — Agência Criativa",
      description: "Agência criativa em Portugal. Vídeo, fotografia, branding, design, web e podcast — transformamos desafios em propostas criativas, cuidadas e eficazes.",
    },
    nav: { work: "Trabalho", services: "Serviços", team: "Equipa", blog: "Blog", hub: "Digital Hub", talk: "Fala Connosco" },
    hero: {
      tagline: "A Agência Criativa",
      tags: ["Vídeo", "Fotografia", "Branding", "Design", "Web", "Podcast"],
    },
    manifesto: {
      heading: { line1: "Relaxante", small: ["como", "um"], big: "Spa" },
      lead: "Criamos ",
      leadItalic: "tudo o que está ligado à imagem",
      sub: "sempre guiados pelo mesmo princípio:",
      quote: "Relaxar os nossos clientes enquanto transformamos os desafios em propostas criativas, cuidadas e eficazes.",
    },
    portfolio: { concept: "Conceito", client: "Cliente", scroll: "Scroll" },
    contact: {
      heading: ["vamos", "Falar?"],
      email: "Email",
      contact: "Contacto",
      social: "Redes Sociais",
      privacy: "Privacidade",
      cookies: "Cookies",
      terms: "Termos",
    },
    back: "Voltar",
    services: {
      scrollHint: "Desliza para explorar",
    },
    team: { mobile: "Telemóvel:", email: "Email:", linkedin: "LinkedIn:", instagram: "Instagram:" },
    blog: { title: "Blog", all: "Todos", notFound: "Artigo não encontrado", backToBlog: "Voltar ao Blog" },
  },
} as const

/* ─── Blog category labels — the underlying `category` value on each post
   stays in English as the canonical key used for filtering; only the
   on-screen label is translated. ──────────────────────────────────────── */
const CATEGORY_PT: Record<string, string> = {
  "Branding & Visual Identity": "Branding & Identidade Visual",
  "Graphic Design": "Design Gráfico",
  "Video Production": "Produção de Vídeo",
  "Web Design": "Web Design",
  "Photography & Events": "Fotografia & Eventos",
  "Podcasts": "Podcasts",
}

export function translateCategory(category: string, lang: Lang): string {
  return lang === "pt" ? CATEGORY_PT[category] ?? category : category
}

const MONTHS_PT: Record<string, string> = {
  January: "janeiro", February: "fevereiro", March: "março", April: "abril",
  May: "maio", June: "junho", July: "julho", August: "agosto",
  September: "setembro", October: "outubro", November: "novembro", December: "dezembro",
}

export function translateDate(date: string, lang: Lang): string {
  if (lang !== "pt") return date
  const [month, year] = date.split(" ")
  const pt = MONTHS_PT[month]
  return pt ? `${pt} de ${year}` : date
}

export function translateReadTime(readTime: string, lang: Lang): string {
  if (lang !== "pt") return readTime
  const n = readTime.match(/\d+/)?.[0]
  return n ? `${n} min de leitura` : readTime
}
