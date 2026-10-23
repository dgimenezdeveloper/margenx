import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    include: ['src/**/*.test.{ts,tsx}'], // Solo busca tests dentro de src/
    exclude: ['tests/e2e/**/*'],         // Ignora los tests de Playwright
  },
  resolve: {
    alias: {
      // Usamos import.meta.dirname para evitar el warning de Vite
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})