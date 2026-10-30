/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

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
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['tests/**', '**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Inclusión explícita sobre la capa de lógica pura, stores, esquemas y hooks de dominio
      include: [
        'src/stores/**',
        'src/schemas/**',
        'src/lib/**',
        'src/hooks/**',
        'src/components/MarginBadge.tsx',
      ],
      exclude: [
        'src/components/ui/**',
        'src/shims/**',
        'src/hooks/useSessionSecurity.ts',
        'src/hooks/useUnsavedChangesWarning.ts',
        'src/lib/useCurrentUser.ts',
        'src/lib/clerkConfig.ts',
        'src/stores/useUserStore.ts',
        'src/**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/__tests__/**',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 85,
      },
    },
  },
})