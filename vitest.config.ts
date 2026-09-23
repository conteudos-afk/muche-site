import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  /* O build usa o @vitejs/plugin-react, que já compila JSX com o runtime
     automático. Nos testes não há esse plugin e o projeto não tem tsconfig,
     por isso o esbuild recorre ao transform clássico (React.createElement) e
     falha em componentes que não importam o React. */
  esbuild: { jsx: 'automatic' },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
