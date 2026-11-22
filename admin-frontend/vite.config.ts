import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    root: path.resolve(import.meta.dirname),
    base: '/admin/',
    cacheDir: path.resolve(import.meta.dirname, '../node_modules/.vite-admin'),
    plugins: [
      react(),
      tailwindcss(),
    ],
    optimizeDeps: {
      entries: ['index.html'],
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
      },
    },
    build: {
      outDir: path.resolve(import.meta.dirname, '../dist-admin'),
      emptyOutDir: true,
    },
    server: {
      port: 3001,
      host: '0.0.0.0',
      allowedHosts: true as const,
      hmr: false as const,
      ws: false as const,
      watch: {
        ignored: [
          '**/database/**',
          '**/backend/database/**',
          '**/storage/**',
          '**/dist/**',
          '**/dist-admin/**',
          '**/auth_info_baileys/**',
          '**/backend/auth_info_baileys/**',
          '**/*.log',
          '**/*.test.*',
        ],
      },
      proxy: {
        '/api': {
          target: process.env.VITE_BACKEND_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
