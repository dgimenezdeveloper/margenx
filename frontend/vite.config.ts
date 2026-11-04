import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import { pwaOptions } from './pwa.config.ts';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA(pwaOptions)],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'next/link': fileURLToPath(new URL('./src/shims/next-link.tsx', import.meta.url)),
      'next/navigation': fileURLToPath(new URL('./src/shims/next-navigation.ts', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0', // Obligatorio para DevContainers/Docker
    port: 5173,
    strictPort: true,
  },
});