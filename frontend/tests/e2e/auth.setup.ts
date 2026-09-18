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
  const email = process.env.E2E_CLERK_TEST_EMAIL || 'admin.panaderia@hotmail.com'
  const password = process.env.E2E_CLERK_TEST_PASSWORD || 'MargenXDev2026.'
  const publishableKey =
    process.env.VITE_CLERK_PUBLISHABLE_KEY ||
    'pk_test_Zmx1ZW50LW1vb3NlLTkwNjAuY2xlcmsuYWNjb3VudHMuZGV2JA'
  const secretKey =
    process.env.CLERK_SECRET_KEY ||
    'sk_test_A7X9QzQD66LtWJx1ZiupnnxFseRsYcqUTx34Y2OQA1'

  // Obtiene el Testing Token de Clerk para bypassear la protección anti-bot
  // durante el sign-in automatizado. Requiere CLERK_SECRET_KEY.
  await clerkSetup({
    publishableKey,
    secretKey,
  })

  // clerk.signIn requiere estar parado en una página no protegida que cargue
  // Clerk antes de invocarlo (ver docs de @clerk/testing).
  await page.goto('/')

  // Método recomendado oficial por Clerk para E2E: utiliza la Backend API y CLERK_SECRET_KEY
  // para emitir un sign-in token del lado del servidor. Bypassea validación de password,
  // emails de verificación y MFA, evitando bloqueos por contraseñas desincronizadas.
  try {
    await clerk.signIn({
      page,
      emailAddress: email,
    })
  } catch (err) {
    console.warn('Fallo el inicio de sesión con emailAddress. Intentando estrategia de contraseña como fallback...', err)
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