import type { CSSProperties } from "react"
import { COPY } from "../i18n"
import type { Lang } from "@/lib/blog/types"
import { GOLD, SANS } from "../blog/tokens"
import { linkProps, type OnNavigate } from "../blog/navigate"
import { legalPath } from "../../../scripts/legal.mjs"

/* ─── As ligações legais do rodapé ───────────────────────────────────────────
   Privacidade e Cookies são páginas do próprio site, nos dois idiomas, com
   `<a href>` a sério (o que funciona sem JavaScript) e, quando há router, a
   navegação sem recarregar. Os Termos continuam a ser uma página externa, na
   iubenda, e abrem noutro separador. */
export const TERMOS_HREF = "https://www.iubenda.com/termos-e-condicoes/48985541"

export const footerLink: CSSProperties = {
  color: GOLD, fontFamily: SANS, fontWeight: 300, fontSize: "clamp(11px, 0.85vw, 13px)",
  opacity: 0.4, letterSpacing: "2px", textTransform: "uppercase", textDecoration: "none",
}

export function LegalLinks({ lang, onNavigate }: { lang: Lang; onNavigate?: OnNavigate }) {
  const c = COPY[lang].contact
  return (
    <>
      <a {...linkProps(legalPath("privacy", lang), onNavigate)} style={footerLink}>{c.privacy}</a>
      <a {...linkProps(legalPath("cookies", lang), onNavigate)} style={footerLink}>{c.cookies}</a>
      <a href={TERMOS_HREF} target="_blank" rel="noopener noreferrer" style={footerLink}>{c.terms}</a>
    </>
  )
}

/* O rodapé do site só existia na página inicial. Nas outras (blog, equipa,
   serviços, as próprias políticas) quem quisesse ler a política de
   privacidade não tinha por onde chegar a ela; este é o mesmo rodapé, em
   pequeno, para essas páginas. */
export function PageFooter({ lang, onNavigate }: { lang: Lang; onNavigate?: OnNavigate }) {
  return (
    <footer className="relative z-10 px-6 md:px-14 pb-10">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-5 gap-4" style={{ borderTop: `1px solid ${GOLD}1a` }}>
        <nav className="flex flex-col sm:flex-row gap-3 sm:gap-8" aria-label={lang === "pt" ? "Informação legal" : "Legal information"}>
          <LegalLinks lang={lang} onNavigate={onNavigate} />
        </nav>
        <span style={{ color: GOLD, fontFamily: SANS, fontWeight: 300, fontSize: "12px", opacity: 0.4 }}>©2026 MUCHE</span>
      </div>
    </footer>
  )
}
