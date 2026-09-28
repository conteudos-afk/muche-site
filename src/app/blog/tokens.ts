/* ─── Tokens visuais do site ─────────────────────────────────────────────────
   Vinham de `src/app/App.tsx` e mudaram-se para aqui, sem alterar um único
   valor, para que os componentes do blog os possam usar sem importar o App
   inteiro (que depende do browser e não renderiza no servidor). O App.tsx
   passou a importá-los daqui, por isso continua a haver uma só definição de
   cada um. ────────────────────────────────────────────────────────────────── */

export const GOLD = "#FFAA03"
export const PALMORE      = "'Palmore', 'Cormorant Garamond', serif"
export const CAMPTON_BOLD = "'Campton', 'Jost', sans-serif"
export const CAMPTON_BOOK = "'Campton', 'Jost', sans-serif"
export const SANS  = CAMPTON_BOOK
export const SERIF = PALMORE
