/// <reference types="node" />
import { test as setup, expect } from '@playwright/test'
import { clerkSetup, clerk } from '@clerk/testing/playwright'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// "type": "module" en package.json => no hay __dirname nativo acá.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const authFile = path.join(__dirname, '../../playwright/.auth/collaborator.json')

// Setup paralelo a auth.setup.ts (issue #68), pero autenticando al usuario
// COLLABORATOR de Panadería Central en vez del ADMIN — issue #127.
// Guarda un storageState separado para no pisar frontend/playwright/.auth/user.json,
// que siguen usando el resto de las suites (autenticadas como ADMIN).
setup('autenticar sesión de colaborador (Panadería Central)', async ({ page }) => {
  const email = process.env.E2E_CLERK_COLLAB_EMAIL
  const password = process.env.E2E_CLERK_COLLAB_PASSWORD
  const publishableKey = process.env.VITE_CLERK_PUBLISHABLE_KEY
  const secretKey = process.env.CLERK_SECRET_KEY

  if (!email || !publishableKey || !secretKey) {
    throw new Error(
      'Faltan variables de entorno requeridas para el E2E de RBAC (E2E_CLERK_COLLAB_EMAIL, VITE_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY).\n' +
        'En local: completá E2E_CLERK_COLLAB_EMAIL en frontend/.env.test (ver .env.test.example).\n' +
        'En CI: asegurate de que el secret/variable correspondiente esté configurado en Settings -> Secrets and variables -> Actions.'
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
  // El dashboard saluda distinto según el rol (ver dashboard/page.tsx) — confirma
  // que la sesión autenticada es realmente la del colaborador, no la del admin.
  await expect(page.getByRole('heading', { name: /hola, colaborador/i })).toBeVisible()

  // Asegura la existencia del directorio antes de persistir storageState
  const authDir = path.dirname(authFile)
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }

  await page.context().storageState({ path: authFile })
})
