import { useMemo, useState } from "react"
import { motion } from "motion/react"
import { translateCategory, translateDate, translateReadTime, COPY } from "../i18n"
import type { Lang, Post } from "@/lib/blog/types"
import { GOLD, SANS, SERIF, CAMPTON_BOOK } from "./tokens"

/* ─── Blog data ──────────────────────────────────────────────────────────── */
export const BLOG_CATEGORIES = [
  "Branding & Visual Identity",
  "Graphic Design",
  "Video Production",
  "Web Design",
  "Photography & Events",
  "Podcasts",
] as const

type BlogCategory = typeof BLOG_CATEGORIES[number]

export function BlogListView({ posts, lang }: { posts: Post[]; lang: Lang }) {
  const cBack = COPY[lang].back
  const cBlog = COPY[lang].blog
  const [active, setActive] = useState<BlogCategory | null>(null)

  const filtered = useMemo(
    () => active ? posts.filter(p => p.category === active) : posts,
    [active, posts]
  )

  return (
    <div className="min-h-screen pt-28 md:pt-36 pb-20 md:pb-32 px-6 md:px-14 relative z-10">
      {/* Overlay escuro para melhor legibilidade sobre o vídeo de fundo */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: "linear-gradient(to bottom, rgba(6,15,19,0.55) 0%, rgba(6,15,19,0.82) 40%, rgba(6,15,19,0.92) 100%)" }} />

      <div className="relative z-10">
        {/* Back */}
        <motion.a
          href="/"
          whileHover={{ x: -3 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          style={{ color: GOLD, fontFamily: SANS, fontWeight: 300, fontSize: "13px", letterSpacing: "3px", textTransform: "uppercase", opacity: 0.5, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", marginBottom: "32px", textDecoration: "none", width: "fit-content" }}
        >
          <span>←</span> {cBack}
        </motion.a>

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
            <motion.a
              key={post.slug}
              href={`/blog/${post.slug}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
              className="group cursor-pointer flex flex-col sm:flex-row sm:items-start sm:justify-between sm:gap-16 py-8 md:py-10"
              style={{ borderBottom: `1px solid ${GOLD}1a`, textDecoration: "none" }}
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
                  {post.title}
                </h3>
                <p style={{ color: GOLD, fontFamily: CAMPTON_BOOK, fontWeight: 300, fontSize: "clamp(13px, 1vw, 16px)", lineHeight: 1.7, opacity: 0.75 }}>
                  {post.excerpt}
                </p>
              </div>
              {/* Arrow */}
              <span
                className="hidden sm:block group-hover:opacity-60 transition-opacity duration-300"
                style={{ color: GOLD, opacity: 0.2, fontSize: "22px", flexShrink: 0, paddingTop: "4px" }}
              >
                →
              </span>
            </motion.a>
          ))}
        </div>
      </div>
    </div>
  )
}
