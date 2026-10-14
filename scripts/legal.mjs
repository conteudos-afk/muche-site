/* ─── As páginas legais: endereços e metadados ───────────────────────────────
   A política de privacidade e a de cookies existem nos dois idiomas, cada uma
   no seu endereço — pt na raiz (`/privacidade/`, `/cookies/`), en debaixo de
   `/en` (`/en/privacy/`, `/en/cookies/`) — e são pré-renderizadas, como o
   blog, para se lerem sem JavaScript.

   Este módulo é o único sítio onde esses endereços estão escritos. O blog
   repete o seu mapa em quatro ficheiros (ver o `navigate.ts`); aqui o
   `head.mjs`, o `sitemap.mjs`, o `prerender.mjs`, o `i18n.tsx`, o `pageMeta.ts`
   e o rodapé importam daqui, por isso não há mapa para desencontrar.

   Tal como o `head.mjs`, é `.mjs` simples e sem dependências: corre no Node,
   chamado pelo `prerender.mjs` depois do `vite build`, e é importado também
   pelo código do site.

   A barra final vem da Cloudflare Pages: cada página é um `index.html` dentro
   de pasta e quem peça a forma sem barra leva 308 (ver o `head.mjs`). ───── */

export const LEGAL_PAGES = ['privacy', 'cookies']

const PATHS = {
  privacy: { pt: '/privacidade/', en: '/en/privacy/' },
  cookies: { pt: '/cookies/', en: '/en/cookies/' },
}

export const legalPath = (page, lang) => PATHS[page][lang]

/* Data da última revisão do texto, em ISO. É ela que aparece no topo das
   páginas («Última atualização») — por isso muda sempre que o texto mudar, e
   só então. */
export const LEGAL_UPDATED = '2026-10-14'

/* Para um endereço, diz que página legal é e em que idioma — ou `null` se não
   for nenhuma. Aceita a forma sem barra final, como o resto do site. */
export function legalPageFromPath(pathname) {
  const caminho = String(pathname).replace(/\/+$/, '') + '/'
  for (const page of LEGAL_PAGES) {
    for (const lang of ['pt', 'en']) {
      if (PATHS[page][lang] === caminho) return { page, lang }
    }
  }
  return null
}

const META = {
  privacy: {
    pt: {
      title: 'Política de Privacidade',
      description: 'Que dados pessoais passam pelo site da Muche, quem os trata, porquê e o que podes fazer em relação a eles.',
    },
    en: {
      title: 'Privacy Policy',
      description: 'What personal data passes through the Muche website, who handles it, why, and what you can do about it.',
    },
  },
  cookies: {
    pt: {
      title: 'Política de Cookies',
      description: 'O site da Muche não define cookies. Fica aqui o que guarda no teu browser e a única ligação a um terceiro, que só se ativa se fores tu a pedi-la.',
    },
    en: {
      title: 'Cookie Policy',
      description: 'The Muche website sets no cookies. Here is what it stores in your browser, and the one link to a third party, which only switches on if you ask for it.',
    },
  },
}

export const legalMeta = (page, lang) => META[page][lang]
