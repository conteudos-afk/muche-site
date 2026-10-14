import { motion } from "motion/react"
import { COPY, translateFullDate } from "../i18n"
import type { Lang } from "@/lib/blog/types"
import { GOLD, SANS, SERIF, CAMPTON_BOOK } from "../blog/tokens"
import { linkProps, type OnNavigate } from "../blog/navigate"
import { BODY_CLASS, BODY_CSS } from "../blog/ArticleView"
import { legalBodyHtml, type LegalPage } from "./content"
import { PageFooter } from "./LegalFooter"
import { LEGAL_UPDATED, legalMeta, legalPath } from "../../../scripts/legal.mjs"

/* ─── Uma página legal ───────────────────────────────────────────────────────
   Faz o que o `ArticleView` faz para um artigo — mesmo esqueleto, mesmo corpo
   estilado pelo mesmo CSS — mas sem categoria, tempo de leitura nem ligação
   ao blog: o título, a data da última revisão, o texto e o caminho para a
   outra política. Não depende do router nem do browser, por isso também
   renderiza no servidor (ver `entry-server.tsx`).

   `instant`: a página já está pintada (veio pré-renderizada) e o `motion` não
   deve voltar a animar a entrada — ver `primeiraPintura.ts`. */
export function LegalView({ page, lang, onNavigate, instant = false }: { page: LegalPage; lang: Lang; onNavigate?: OnNavigate; instant?: boolean }) {
  const entra = <T,>(inicial: T): T | false => (instant ? false : inicial)
  const { title } = legalMeta(page, lang)
  const outra: LegalPage = page === "privacy" ? "cookies" : "privacy"

  return (
    <div className="min-h-screen relative z-10 flex flex-col">
      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: "linear-gradient(to bottom, rgba(6,15,19,0.55) 0%, rgba(6,15,19,0.82) 40%, rgba(6,15,19,0.92) 100%)" }} />

      <div className="relative z-10 w-full max-w-3xl mx-auto px-5 sm:px-8 pt-28 md:pt-36 pb-20 md:pb-32 flex-1">
        <motion.a
          {...linkProps("/", onNavigate)}
          whileHover={{ x: -3 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          style={{ color: GOLD, fontFamily: SANS, fontWeight: 300, fontSize: "13px", letterSpacing: "3px", textTransform: "uppercase", opacity: 0.5, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", marginBottom: "56px", textDecoration: "none", width: "fit-content" }}
        >
          <span>←</span> {COPY[lang].back}
        </motion.a>

        <motion.div initial={entra({ opacity: 0, y: 16 })} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }}>
          <p style={{ color: GOLD, fontFamily: CAMPTON_BOOK, fontWeight: 300, fontSize: "12px", opacity: 0.4, marginBottom: "28px" }}>
            {COPY[lang].legal.updated}: {translateFullDate(LEGAL_UPDATED, lang)}
          </p>
        </motion.div>

        <motion.h1
          initial={entra({ opacity: 0, y: 24 })}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          style={{ color: GOLD, fontFamily: SERIF, fontWeight: 300, fontSize: "clamp(26px, 4.5vw, 64px)", lineHeight: 1.08, letterSpacing: "0.01em", marginBottom: "36px" }}
        >
          {title}
        </motion.h1>

        <motion.div initial={entra({ scaleX: 0 })} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }} style={{ height: "1px", background: `${GOLD}25`, marginBottom: "48px", transformOrigin: "left" }} />

        <motion.div initial={entra({ opacity: 0, y: 20 })} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}>
          <style dangerouslySetInnerHTML={{ __html: BODY_CSS }} />
          <div className={BODY_CLASS} dangerouslySetInnerHTML={{ __html: legalBodyHtml(page, lang) }} />
        </motion.div>

        <div style={{ marginTop: "64px", paddingTop: "32px", borderTop: `1px solid ${GOLD}1a` }}>
          <motion.a
            {...linkProps(legalPath(outra, lang), onNavigate)}
            whileHover={{ x: 3 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            style={{ color: GOLD, fontFamily: SANS, fontWeight: 300, fontSize: "13px", letterSpacing: "3px", textTransform: "uppercase", opacity: 0.6, display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", width: "fit-content" }}
          >
            {legalMeta(outra, lang).title} <span>→</span>
          </motion.a>
        </div>
      </div>

      <PageFooter lang={lang} onNavigate={onNavigate} />
    </div>
  )
}
