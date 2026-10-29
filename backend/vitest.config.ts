import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
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