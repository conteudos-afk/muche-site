  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  /* ─── Porque é `createRoot` e não `hydrateRoot` ─────────────────────────────
     As páginas do blog chegam pré-renderizadas, e o `hydrateRoot` seria o
     caminho óbvio para as aproveitar. Não serve aqui, por três razões que se
     medem no código:

     1. O servidor desenha só o `ArticleView`/`BlogListView` (ver
        `entry-server.tsx`). O cliente desenha `LangProvider` > `motion.div` >
        `RouterProvider` > `Layout` (fundo em vídeo, menu) > a vista. As árvores
        divergem logo na raiz, por isso o React avisaria e refaria tudo — que é
        o que acontece já hoje, sem o aviso.
     2. Para as árvores coincidirem, o servidor teria de desenhar o `App`
        inteiro, e o `App` não corre no Node: `createBrowserRouter` e vários
        `useState(() => window.innerWidth)` leem o browser ao carregar o módulo
        ou no primeiro render. Fora do blog, o desenho depende da largura da
        janela, que o servidor não conhece.
     3. Mesmo com isso resolvido, o `revealInitialState` troca o estado inicial
        do `motion` no HTML (`opacity:0` → `1`), e o React não corrige
        atributos que diferem na hidratação: o `motion` continuava a animar a
        partir de 0. Seria preciso o `initial={false}` na mesma.

     O que o leitor vê — o texto a desaparecer e a voltar — resolve-se pelo
     lado do `motion`, sem hidratar: a primeira pintura de uma página
     pré-renderizada nasce no estado final. Ver `app/primeiraPintura.ts`. */
  createRoot(document.getElementById("root")!).render(<App />);
