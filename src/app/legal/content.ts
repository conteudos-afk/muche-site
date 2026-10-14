import { marked } from 'marked'
import type { Lang } from '@/lib/blog/types'
import privacyPt from '../../../content/legal/privacy.pt.md?raw'
import privacyEn from '../../../content/legal/privacy.en.md?raw'
import cookiesPt from '../../../content/legal/cookies.pt.md?raw'
import cookiesEn from '../../../content/legal/cookies.en.md?raw'

/* ─── O texto das políticas ──────────────────────────────────────────────────
   Vive em Markdown, em `content/legal/`, uma página por idioma — é texto para
   ser lido, revisto e corrigido por quem não programa, e assim abre-se num
   ficheiro só dele. O título e a descrição de cada página estão no
   `scripts/legal.mjs`, junto dos endereços, porque o `head.mjs` precisa deles
   e não passa pelo compilador. */
export type LegalPage = 'privacy' | 'cookies'

const MARKDOWN: Record<LegalPage, Record<Lang, string>> = {
  privacy: { pt: privacyPt, en: privacyEn },
  cookies: { pt: cookiesPt, en: cookiesEn },
}

export const legalMarkdown = (page: LegalPage, lang: Lang): string => MARKDOWN[page][lang]

/* O mesmo `marked` e as mesmas opções do `parsePost` dos artigos, por isso o
   HTML sai com a mesma forma e o mesmo CSS (`BODY_CSS`) o veste. */
export const legalBodyHtml = (page: LegalPage, lang: Lang): string =>
  marked.parse(legalMarkdown(page, lang).trim(), { async: false }) as string
