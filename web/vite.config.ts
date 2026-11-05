import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// The browser only calls its own origin: `/api/*` is proxied to FastAPI, so there is no CORS in development.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      // Must come before react(): it generates src/routeTree.gen.ts from src/routes/.
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: { '~': path.resolve(import.meta.dirname, 'src') },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': { target: env.API_URL ?? 'http://localhost:8000', changeOrigin: true },
      },
    },
  };
});
