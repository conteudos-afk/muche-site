import { createContext, useContext, useState, type ReactNode } from "react"

export type Lang = "en" | "pt"

const STORAGE_KEY = "muche-lang"

export function detectLang(): Lang {
  if (typeof navigator === "undefined") return "en"
  const candidates = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]
  const hit = candidates.find(l => l?.toLowerCase().startsWith("pt"))
  return hit ? "pt" : "en"
}

function initialLang(): Lang {
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
}

const LangContext = createContext<LangContextValue>({ lang: "en", setLang: () => {} })

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)
  const setLang = (l: Lang) => {
    setLangState(l)
    try { localStorage.setItem(STORAGE_KEY, l) } catch {
      // ignore write failures (e.g. private browsing)
    }
  }
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext).lang
}

export function useLangControls() {
  return useContext(LangContext)
}

/* ─── UI copy — structural / chrome text ─────────────────────────────────── */
export const COPY = {
  en: {
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
