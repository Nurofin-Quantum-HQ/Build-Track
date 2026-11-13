import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],

    // Ensure .env is read from the project root
    envDir: '.',

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
