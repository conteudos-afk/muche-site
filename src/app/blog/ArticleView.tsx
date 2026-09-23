import { motion } from "motion/react"
import { translateCategory, translateDate, translateReadTime, COPY } from "../i18n"
import type { Lang, Post } from "@/lib/blog/types"
import { GOLD, SANS, SERIF, CAMPTON_BOOK } from "./tokens"
import { blogHref, linkProps, type OnNavigate } from "./navigate"

/* ─── Estilos do corpo do artigo ─────────────────────────────────────────────
   Antes da migração para Markdown o corpo era um array de blocos e os estilos
   eram aplicados inline em cada <h2> e <p>. Agora o corpo chega como HTML já
   convertido, por isso os mesmos valores passam a viver numa regra de CSS.
   São exatamente os mesmos números:

     wrapper do bloco  → marginBottom: 32px   (fica no <p>, que fecha o bloco)
     h2                → SERIF/300, clamp(20px, 2vw, 30px), lh 1.2,
                         letterSpacing 0.01em, marginBottom 14px, opacity 0.9
     p                 → CAMPTON_BOOK/300, clamp(14px, 1.15vw, 18px),
                         lh 1.85, opacity 0.65

   A regra não está dentro de `@layer`, por isso ganha às predefinições de
   h2 que o `src/styles/theme.css` declara em `@layer base`. ─────────────── */
const BODY_CLASS = "blog-article-body"
const BODY_CSS = `
.${BODY_CLASS} h2 {
  color: ${GOLD};
  font-family: ${SERIF};
  font-weight: 300;
  font-size: clamp(20px, 2vw, 30px);
  line-height: 1.2;
  letter-spacing: 0.01em;
  margin: 0 0 14px;
  opacity: 0.9;
}
.${BODY_CLASS} p {
  color: ${GOLD};
  font-family: ${CAMPTON_BOOK};
  font-weight: 300;
  font-size: clamp(14px, 1.15vw, 18px);
  line-height: 1.85;
  opacity: 0.65;
  margin: 0 0 32px;
}
`

export function ArticleView({ post, lang, onNavigate }: { post: Post; lang: Lang; onNavigate?: OnNavigate }) {
  const cBlog = COPY[lang].blog
  /* O destino depende do idioma: `/blog` em pt, `/en/blog` em inglês. */
  const toBlog = linkProps(blogHref(lang), onNavigate)

  return (
    <div className="min-h-screen relative z-10">
      {/* Frosted top overlay for readability */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: "linear-gradient(to bottom, rgba(6,15,19,0.55) 0%, rgba(6,15,19,0.82) 40%, rgba(6,15,19,0.92) 100%)" }} />

      <div className="relative z-10 max-w-3xl mx-auto px-5 sm:px-8 pt-28 md:pt-36 pb-20 md:pb-32">
        {/* Back */}
        <motion.a
          {...toBlog}
          whileHover={{ x: -3 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          style={{ color: GOLD, fontFamily: SANS, fontWeight: 300, fontSize: "13px", letterSpacing: "3px", textTransform: "uppercase", opacity: 0.5, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", marginBottom: "56px", textDecoration: "none", width: "fit-content" }}
        >
          <span>←</span> {cBlog.title}
        </motion.a>

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
          {post.title}
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
          <style dangerouslySetInnerHTML={{ __html: BODY_CSS }} />
          <div className={BODY_CLASS} dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />
        </motion.div>

        {/* Footer divider + back */}
        <div style={{ marginTop: "64px", paddingTop: "32px", borderTop: `1px solid ${GOLD}1a` }}>
          <motion.a
            {...toBlog}
            whileHover={{ x: -3 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            style={{ color: GOLD, fontFamily: SANS, fontWeight: 300, fontSize: "13px", letterSpacing: "3px", textTransform: "uppercase", opacity: 0.4, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", width: "fit-content" }}
          >
            <span>←</span> {cBlog.backToBlog}
          </motion.a>
        </div>
      </div>
    </div>
  )
}
