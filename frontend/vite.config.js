import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  return {
    plugins: [react()],

    // Ensure .env is read from the frontend directory regardless of working directory
    envDir: __dirname,

    optimizeDeps: {
      include: ['html-to-image'],
    },

    // Dev server proxy — avoids CORS and SSL certificate mismatch errors in local development.
    // Production uses VITE_API_URL directly (no proxy needed).
    server: {
      proxy: mode === 'development' ? {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:5001',
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: env.VITE_API_URL || 'http://localhost:5001',
          changeOrigin: true,
          secure: false,
        },
      } : {},
    },

    build: {
      outDir: 'dist',
      // Source maps help debug production errors via browser dev tools
      sourcemap: false,
    },
  };
});
