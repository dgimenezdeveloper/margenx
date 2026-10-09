/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// "type": "module" en package.json => no hay __dirname nativo acá.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Carga frontend/.env (VITE_CLERK_PUBLISHABLE_KEY, etc.) y frontend/.env.test
 * (CLERK_SECRET_KEY + credenciales de la cuenta E2E — ver .env.test.example),
 * necesarias para el proyecto "setup" que autentica contra Clerk.
 */
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

const authFile = path.join(__dirname, 'playwright/.auth/user.json');
const collabAuthFile = path.join(__dirname, 'playwright/.auth/collaborator.json');

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5173',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      /* Corre auth.setup.ts antes que cualquier otra suite, generando
         playwright/.auth/user.json con la sesión de Clerk ya autenticada. */
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    {
      /* Corre auth.collaborator.setup.ts, generando playwright/.auth/collaborator.json
         con la sesión del usuario COLLABORATOR — issue #127. Separado del "setup"
         de arriba para no pisar la sesión de ADMIN que usan el resto de las suites. */
      name: 'setup-collaborator',
      testMatch: /auth\.collaborator\.setup\.ts/,
    },

    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: authFile },
      dependencies: ['setup'],
      // rbac-security.spec.ts corre aparte, autenticado como colaborador (ver proyecto de abajo).
      testIgnore: /rbac-security\.spec\.ts/,
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: authFile },
      dependencies: ['setup'],
      testIgnore: /rbac-security\.spec\.ts/,
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], storageState: authFile },
      dependencies: ['setup'],
      testIgnore: /rbac-security\.spec\.ts/,
    },

    {
      /* Única suite que corre autenticada como COLLABORATOR, no como ADMIN —
         issue #127. Acotada a Chromium: alcanza para auditar ocultamiento de
         datos financieros y no justifica triplicar el costo de CI en 3 browsers. */
      name: 'chromium-collaborator',
      use: { ...devices['Desktop Chrome'], storageState: collabAuthFile },
      dependencies: ['setup-collaborator'],
      testMatch: /rbac-security\.spec\.ts/,
    },
  ],

  /* Levanta el servidor Vite local automáticamente para pruebas E2E */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
