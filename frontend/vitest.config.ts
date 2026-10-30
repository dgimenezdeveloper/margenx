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
    coverage: {
      provider: 'v8',
      include: [
        'src/stores/**/*.ts',
        'src/schemas/**/*.ts',
        'src/lib/**/*.ts',
        'src/hooks/**/*.ts',
        'src/components/MarginBadge.tsx'
      ],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        // Wrappers de infraestructura externa y sesión (Clerk / React Router) cubiertos en E2E
        'src/hooks/useSessionSecurity.ts',
        'src/hooks/useUnsavedChangesWarning.ts',
        'src/lib/clerkConfig.ts',
        'src/lib/useCurrentUser.ts',
        'src/stores/useUserStore.ts'
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
      // Usamos import.meta.dirname para evitar el warning de Vite
      '@': path.resolve(import.meta.dirname, './src'),
      'next/link': path.resolve(import.meta.dirname, './src/shims/next-link.tsx'),
      'next/navigation': path.resolve(import.meta.dirname, './src/shims/next-navigation.ts'),
    },
  },
})