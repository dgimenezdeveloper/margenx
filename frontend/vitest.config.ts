import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'next/link': fileURLToPath(new URL('./src/shims/next-link.tsx', import.meta.url)),
      'next/navigation': fileURLToPath(new URL('./src/shims/next-navigation.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Inclusión explícita sobre la capa de lógica pura, stores, esquemas y hooks de dominio
      include: [
        'src/stores/**/*.ts',
        'src/schemas/**/*.ts',
        'src/lib/**/*.ts',
        'src/hooks/**/*.ts',
        'src/components/MarginBadge.tsx',
        'src/components/error-state.tsx'
      ],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx'
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 85
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      'next/link': path.resolve(import.meta.dirname, './src/shims/next-link.tsx'),
      'next/navigation': path.resolve(import.meta.dirname, './src/shims/next-navigation.ts'),
    },
  },
})