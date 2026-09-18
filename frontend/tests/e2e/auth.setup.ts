/// <reference types="node" />
import { test as setup, expect } from '@playwright/test'
import { clerkSetup, clerk } from '@clerk/testing/playwright'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// "type": "module" en package.json => no hay __dirname nativo acá.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const authFile = path.join(__dirname, '../../playwright/.auth/user.json')

setup('autenticar sesión de Panadería Central', async ({ page }) => {
  const email = process.env.E2E_CLERK_TEST_EMAIL
  const password = process.env.E2E_CLERK_TEST_PASSWORD
  const publishableKey = process.env.VITE_CLERK_PUBLISHABLE_KEY
  const secretKey = process.env.CLERK_SECRET_KEY

  if (!email || !publishableKey || !secretKey) {
    throw new Error(
      'Faltan variables de entorno requeridas para E2E (E2E_CLERK_TEST_EMAIL, VITE_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY).\n' +
        'En local: copiá frontend/.env.test.example a frontend/.env.test y completá las variables (ignorado en git).\n' +
        'En CI: asegurate de que los secrets correspondientes estén configurados en Settings -> Secrets and variables -> Actions.'
    )
  }

  // clerk.signIn con emailAddress requiere CLERK_SECRET_KEY en process.env
  process.env.CLERK_SECRET_KEY = secretKey
  process.env.VITE_CLERK_PUBLISHABLE_KEY = publishableKey

  // Configuración de Clerk para testing automatizado
  await clerkSetup({
    publishableKey,
    secretKey,
  })

  // Navega a una ruta pública que cargue el script de Clerk
  await page.goto('/')

  // Método oficial de Clerk para tests: sign-in server-side vía Backend API (bypassea password y MFA)
  try {
    await clerk.signIn({
      page,
      emailAddress: email,
    })
  } catch (err) {
    if (!password) {
      throw err
    }
    await clerk.signIn({
      page,
      signInParams: {
        strategy: 'password',
        identifier: email,
        password,
      },
    })
  }

  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByRole('heading', { name: /hola, administrador/i })).toBeVisible()

  // Asegura la existencia del directorio antes de persistir storageState
  const authDir = path.dirname(authFile)
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }

  await page.context().storageState({ path: authFile })
})