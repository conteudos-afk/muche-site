import { motion } from "motion/react"
import { COPY } from "../i18n"
import type { Lang } from "@/lib/blog/types"
import { GOLD, SANS } from "./tokens"
import { blogHref, linkProps, type OnNavigate } from "./navigate"

export function ArticleNotFound({ lang, onNavigate }: { lang: Lang; onNavigate?: OnNavigate }) {
  const cBlog = COPY[lang].blog

  return (
    <div className="min-h-screen flex items-center justify-center relative z-10">
      <div className="text-center">
        <p style={{ color: GOLD, fontFamily: SANS, fontSize: "12px", letterSpacing: "4px", textTransform: "uppercase", opacity: 0.4, marginBottom: "24px" }}>{cBlog.notFound}</p>
        <motion.a {...linkProps(blogHref(lang), onNavigate)} whileHover={{ x: -3 }} style={{ color: GOLD, fontFamily: SANS, fontWeight: 300, fontSize: "13px", letterSpacing: "3px", textTransform: "uppercase", opacity: 0.6, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", margin: "0 auto", textDecoration: "none", width: "fit-content" }}>
          <span>←</span> {cBlog.backToBlog}
        </motion.a>
      </div>
    </div>
  )
}
