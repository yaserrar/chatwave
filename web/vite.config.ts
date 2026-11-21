import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// The browser only calls its own origin: `/api/*` is proxied to FastAPI, so there is no CORS in development.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      // Must come before react(): it generates src/routeTree.gen.ts from src/routes/.
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      tailwindcss(),
      // Files pdf.js fetches on demand for some PDFs (character maps, standard fonts, image decoders), served
      // under /pdfjs/ (see OPTIONS in src/components/citations/pdf-viewer.tsx)
      viteStaticCopy({
        targets: ['cmaps', 'standard_fonts', 'wasm'].map((dir) => ({
          src: `node_modules/pdfjs-dist/${dir}/*`,
          dest: `pdfjs/${dir}`,
          rename: { stripBase: true },
        })),
      }),
    ],
    resolve: {
      alias: { '~': path.resolve(import.meta.dirname, 'src') },
    },
    // pdf.js alone is ~630 kB: it is only loaded when a PDF citation is opened (React.lazy)
    build: { chunkSizeWarningLimit: 700 },
    server: {
      port: 5173,
      proxy: {
        '/api': { target: env.API_URL ?? 'http://localhost:8000', changeOrigin: true },
      },
    },
  };
});
