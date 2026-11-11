// Extensión .mts: el paquete es CommonJS y Vite carga la config como ESM.
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Desde Vitest 4 el exclude por defecto ya no ignora dist/, donde
    // `npm run build` deja las pruebas compiladas.
    exclude: [...configDefaults.exclude, 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/index.ts',
        'src/lib/prisma.ts',
        'src/**/*.d.ts',
        'src/**/*.test.ts',
      ],
      thresholds: {
        lines: 90,
      },
    },
  },
});