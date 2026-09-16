import { test as setup, expect } from '@playwright/test'
import { clerkSetup, clerk } from '@clerk/testing/playwright'
import path from 'path'
import { fileURLToPath } from 'url'

// "type": "module" en package.json => no hay __dirname nativo acá.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const authFile = path.join(__dirname, '../../playwright/.auth/user.json')

setup('autenticar sesión de Panadería Central', async ({ page }) => {
  const email = process.env.E2E_CLERK_TEST_EMAIL
  const password = process.env.E2E_CLERK_TEST_PASSWORD

  if (!email || !password) {
    throw new Error(
      'Faltan E2E_CLERK_TEST_EMAIL / E2E_CLERK_TEST_PASSWORD.\n' +
        'Copiá frontend/.env.test.example a frontend/.env.test y completá las credenciales ' +
        'de la cuenta de prueba de Panadería Central (pedirlas al equipo, mismo canal que CLERK_SECRET_KEY).'
    )
  }

  // Obtiene el Testing Token de Clerk para bypassear la protección anti-bot
  // durante el sign-in automatizado. Requiere CLERK_SECRET_KEY.
  await clerkSetup({
    publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  })

  // clerk.signIn requiere estar parado en una página no protegida que cargue
  // Clerk antes de invocarlo (ver docs de @clerk/testing).
  await page.goto('/')

  await clerk.signIn({
    page,
    signInParams: {
      strategy: 'password',
      identifier: email,
      password,
    },
  })

  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByRole('heading', { name: /hola, administrador/i })).toBeVisible()

  await page.context().storageState({ path: authFile })
})
