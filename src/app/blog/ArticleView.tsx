import { motion } from "motion/react"
import { translateCategory, translateDate, translateReadTime, COPY } from "../i18n"
import type { Lang, Post } from "@/lib/blog/types"
import { GOLD, SANS, SERIF, CAMPTON_BOOK } from "./tokens"
import { blogHref, linkProps, type OnNavigate } from "./navigate"

/* ─── Estilos do corpo do artigo ─────────────────────────────────────────────
   Antes da migração para Markdown o corpo era um array de blocos e os estilos
   eram aplicados inline em cada <h2> e <p>. Agora o corpo chega como HTML já
   convertido, por isso os mesmos valores passam a viver numa regra de CSS.
   Os números de h2 e de p são exatamente os mesmos de então:

     wrapper do bloco  → marginBottom: 32px   (fica no <p>, que fecha o bloco)
     h2                → SERIF/300, clamp(20px, 2vw, 30px), lh 1.2,
                         letterSpacing 0.01em, marginBottom 14px, opacity 0.9
     p                 → CAMPTON_BOOK/300, clamp(14px, 1.15vw, 18px),
                         lh 1.85, opacity 0.65

   A regra não está dentro de `@layer`, por isso ganha às predefinições de
   h2/h3 que o `src/styles/theme.css` declara em `@layer base` e à reposição
   do Tailwind, que tira marcadores às listas e peso aos títulos.

   O QUE O `marked` PRODUZ. Os artigos não têm imagens: a legibilidade vem da
   estrutura, e o gerador pede subtítulos, listas e ênfase. Por isso o corpo
   tem de estilar tudo o que o Markdown consegue emitir — h2/h3, p, ul/ol/li,
   strong, em, a, blockquote, code e pre, hr, e ainda a tabela e a imagem, que
   o gerador não pede mas que um artigo escrito à mão pode trazer. Numa lista
   «solta» (itens separados por linha em branco) o `marked` mete um <p> dentro
   de cada <li>; por isso há regras para `li > p`.

   A OPACIDADE PASSOU PARA A COR. O texto corrido era `opacity: 0.65`, mas a
   opacidade multiplica-se com a dos filhos: um <strong> dentro de um <p> a
   0.65 nunca podia ficar mais claro do que o texto à volta, e o negrito só se
   distinguia pelo peso. Com a transparência na própria cor (`GOLD` + alfa),
   o texto corrido fica visualmente igual e o destaque pode subir de tom.
   Os títulos mantêm a `opacity` de sempre — nada lá dentro precisa de ser
   mais claro do que eles. ─────────────────────────────────────────────────── */
const BODY_CLASS = "blog-article-body"

/* Tons do texto, em alfa sobre o dourado: corrido 65 % (o antigo
   `opacity: 0.65`), destaque 95 %, citação 85 %, marcadores e filetes mais
   baixos. */
const INK = `${GOLD}a6`
const INK_STRONG = `${GOLD}f2`
const INK_QUOTE = `${GOLD}d9`
const INK_FAINT = `${GOLD}73`
const RULE = `${GOLD}25`

/* Tipografia do texto corrido, partilhada por <p> e <li> para que uma lista
   se leia com a mesma voz do parágrafo que a antecede. */
const BODY_TEXT = `
  color: ${INK};
  font-family: ${CAMPTON_BOOK};
  font-weight: 300;
  font-size: clamp(14px, 1.15vw, 18px);
  line-height: 1.85;
`

const BODY_CSS = `
.${BODY_CLASS} { overflow-wrap: break-word; }

/* ── Títulos ── */
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
/* O h3 não repete o serifado do h2: o Palmore tem x-height muito baixo e,
   a 17–19px, lê-se mais pequeno do que o texto corrido. Fica no registo das
   etiquetas do site (Campton em maiúsculas espaçadas, como a categoria e o
   «voltar»), mas com mais corpo e opacidade, porque aqui é um título. Assim
   distingue-se do h2 pela família e não só por uns pixéis de tamanho. */
.${BODY_CLASS} h3 {
  color: ${GOLD};
  font-family: ${SANS};
  font-weight: 400;
  font-size: clamp(12px, 1.05vw, 14px);
  line-height: 1.5;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  margin: 0 0 12px;
  opacity: 0.85;
}
/* h4–h6: o gerador não os pede, mas o Markdown aceita-os. Mesmo registo do
   h3, mais leve e mais apagado, para ficarem abaixo dele. */
.${BODY_CLASS} h4,
.${BODY_CLASS} h5,
.${BODY_CLASS} h6 {
  color: ${GOLD};
  font-family: ${SANS};
  font-weight: 300;
  font-size: 12px;
  line-height: 1.5;
  letter-spacing: 3px;
  text-transform: uppercase;
  margin: 0 0 12px;
  opacity: 0.55;
}

/* ── Texto corrido ── */
.${BODY_CLASS} p {
${BODY_TEXT}  margin: 0 0 32px;
}

/* ── Ênfase e ligações ── */
/* Peso 600 existe nas duas fontes (Campton SemiBold e Jost 600). O mesmo
   estilo serve o negrito de abertura de um item («**Duração.** …») e o de um
   parágrafo («**Uma escala.** …»): é sempre uma entrada a destacar. */
.${BODY_CLASS} strong,
.${BODY_CLASS} b {
  color: ${INK_STRONG};
  font-weight: 600;
}
.${BODY_CLASS} em,
.${BODY_CLASS} i {
  font-style: italic;
}
/* A ligação tem de se distinguir sem depender só da cor (o texto à volta já é
   dourado): sublinhado fino, afastado da linha de base, com o filete a meia
   opacidade em repouso e inteiro ao passar o rato ou ao focar. */
.${BODY_CLASS} a {
  color: ${INK_STRONG};
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.24em;
  text-decoration-color: ${INK_FAINT};
  overflow-wrap: anywhere;
}
.${BODY_CLASS} a:hover,
.${BODY_CLASS} a:focus-visible {
  text-decoration-color: ${GOLD};
}
.${BODY_CLASS} a:focus-visible {
  outline: 1px solid ${INK_FAINT};
  outline-offset: 3px;
  border-radius: 2px;
}

/* ── Listas ──
   A reposição de CSS do site tira os marcadores e o recuo. Os itens têm ritmo
   próprio: 14px entre eles, contra os 32px entre parágrafos, para a lista se
   ler como um grupo; a margem de 32px mantém-se à volta do grupo inteiro.
   Marcador das ul: um traço fino de 0.65em a meia opacidade, no registo do
   filete do artigo, em vez do disco, que num fundo escuro pesa demais.
   Nas ol fica o marcador nativo (só estilado), porque é ele que respeita o
   atributo \`start\` que o \`marked\` emite e a semântica de lista. */
.${BODY_CLASS} ul,
.${BODY_CLASS} ol {
  margin: 0 0 32px;
  padding: 0;
}
.${BODY_CLASS} ul { list-style: none; }
.${BODY_CLASS} ol { list-style: decimal outside; }
.${BODY_CLASS} li {
${BODY_TEXT}  margin: 0 0 14px;
}
.${BODY_CLASS} li:last-child { margin-bottom: 0; }
.${BODY_CLASS} ul > li {
  position: relative;
  padding-left: 1.9em;
}
/* O recuo da ol vai na margem do <li>, e não no padding da <ol>, para ser em
   «em» do texto do item (14–18px) e alinhar com o das ul; o padding da <ol>
   seria em «em» do corpo herdado (16px). */
.${BODY_CLASS} ol > li { margin-left: 1.9em; }
.${BODY_CLASS} ul > li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.95em;
  width: 0.65em;
  height: 1px;
  background: ${GOLD};
  opacity: 0.5;
}
.${BODY_CLASS} ol > li::marker {
  color: ${INK_FAINT};
  font-family: ${SANS};
  font-weight: 400;
}
/* Listas aninhadas e listas soltas (<li><p>…</p></li>). */
.${BODY_CLASS} li > ul,
.${BODY_CLASS} li > ol { margin: 14px 0 0; }
.${BODY_CLASS} li > p { margin: 0 0 14px; }
.${BODY_CLASS} li > p:last-child { margin-bottom: 0; }
/* O parágrafo que apresenta uma lista fica mais perto dela do que dos
   parágrafos vizinhos. Sem :has() (browsers antigos) perde só este ajuste. */
.${BODY_CLASS} p:has(+ ul),
.${BODY_CLASS} p:has(+ ol) { margin-bottom: 20px; }

/* ── Citação ──
   Em corpo de texto e itálico, e não em Palmore: o serifado de marca é de
   título e, a corpo de citação, lê-se pequeno e frágil. O que a separa do
   parágrafo é o filete à esquerda, o tamanho e o tom mais claro. */
.${BODY_CLASS} blockquote {
  margin: 0 0 32px;
  padding: 2px 0 2px 24px;
  border-left: 1px solid ${INK_FAINT};
}
.${BODY_CLASS} blockquote p {
  color: ${INK_QUOTE};
  font-family: ${CAMPTON_BOOK};
  font-weight: 300;
  font-style: italic;
  font-size: clamp(16px, 1.45vw, 21px);
  line-height: 1.7;
  margin: 0 0 16px;
}
.${BODY_CLASS} blockquote > :last-child { margin-bottom: 0; }

/* ── Filete ── */
.${BODY_CLASS} hr {
  border: 0;
  border-top: 1px solid ${RULE};
  margin: 48px 0;
}

/* ── Código ── */
.${BODY_CLASS} code {
  color: ${INK_STRONG};
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.88em;
  background: ${GOLD}14;
  padding: 0.1em 0.4em;
  border-radius: 3px;
}
.${BODY_CLASS} pre {
  background: ${GOLD}0d;
  border: 1px solid ${RULE};
  border-radius: 4px;
  padding: 18px 20px;
  margin: 0 0 32px;
  overflow-x: auto;
  line-height: 1.6;
}
.${BODY_CLASS} pre code {
  background: none;
  padding: 0;
  border-radius: 0;
  overflow-wrap: normal;
}

/* ── Tabela e imagem (não pedidas ao gerador; só para não partirem a
   página em ecrãs estreitos) ── */
.${BODY_CLASS} table {
  display: block;
  max-width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
  margin: 0 0 32px;
}
.${BODY_CLASS} th,
.${BODY_CLASS} td {
  color: ${INK};
  font-family: ${CAMPTON_BOOK};
  font-weight: 300;
  font-size: clamp(13px, 1.05vw, 16px);
  line-height: 1.6;
  text-align: left;
  padding: 8px 16px 8px 0;
  border-bottom: 1px solid ${RULE};
}
.${BODY_CLASS} th { color: ${INK_STRONG}; font-weight: 600; }
.${BODY_CLASS} img { max-width: 100%; height: auto; }
`

/* `instant`: a página já está pintada (veio pré-renderizada) e o `motion` não
   deve voltar a animar a entrada por cima do texto que o leitor já vê — ver
   `primeiraPintura.ts`. No servidor fica sempre `false`: é o que escreve o
   estado inicial que o `revealInitialState` neutraliza. */
export function ArticleView({ post, lang, onNavigate, instant = false }: { post: Post; lang: Lang; onNavigate?: OnNavigate; instant?: boolean }) {
  const cBlog = COPY[lang].blog
  const entra = <T,>(inicial: T): T | false => (instant ? false : inicial)
  /* O destino depende do idioma: `/blog/` em pt, `/en/blog/` em inglês. */
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
        <motion.div initial={entra({ opacity: 0, y: 16 })} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }}>
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
          initial={entra({ opacity: 0, y: 24 })}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          style={{ color: GOLD, fontFamily: SERIF, fontWeight: 300, fontSize: "clamp(26px, 4.5vw, 64px)", lineHeight: 1.08, letterSpacing: "0.01em", marginBottom: "20px" }}
        >
          {post.title}
        </motion.h1>

        {/* O aviso segue o `bodyLang` — a marca que o `withBodyFallback` põe
            quando a página está a mostrar o corpo de outro idioma — e não o
            idioma da página. Condicionado a `lang === "pt"`, ficaria preso:
            no dia em que os artigos forem traduzidos, todas as páginas pt
            continuavam a dizer que o texto só existe em inglês, por baixo de
            texto português. */}
        {post.bodyLang && post.bodyLang !== lang && (
          <p style={{ color: GOLD, fontFamily: CAMPTON_BOOK, fontWeight: 300, fontSize: "12px", opacity: 0.4, fontStyle: "italic", marginBottom: "36px" }}>
            {cBlog.bodyInEnglish}
          </p>
        )}

        {/* Divider */}
        <motion.div initial={entra({ scaleX: 0 })} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }} style={{ height: "1px", background: `${GOLD}25`, marginBottom: "48px", transformOrigin: "left" }} />

        {/* Body */}
        <motion.div initial={entra({ opacity: 0, y: 20 })} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}>
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
