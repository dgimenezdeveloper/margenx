/// <reference types="node" />
import { test, expect } from '@playwright/test'

// La sesión autenticada viene del proyecto "setup" (auth.setup.ts), que
// corre siempre antes de este test y persiste storageState en
// playwright/.auth/user.json (ver playwright.config.ts). Si ese archivo no
// existe todavía o quedó vencido, Playwright ejecuta "setup" igual antes de
// este test y lo regenera desde cero — no hace falta lógica extra acá.
test('accede a /dashboard ya autenticado, sin pasar por /login', async ({ page }) => {
  const start = Date.now()
  await page.goto('/dashboard')

  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByRole('heading', { name: /hola, administrador/i })).toBeVisible()

  // En runners de CI con CPU compartida, la compilación en frío de Vite puede tardar > 2s.
  // Decisión (issue #310): se mantiene el umbral local en 2000ms. Medido en un entorno
  // restringido (sandbox en la nube, no una laptop de desarrollo típica), la carga fría de
  // una página similar fue de ~830ms — bastante margen por debajo del límite. Si este test
  // llega a flaquear en una máquina local real, subir maxThresholdMs con la evidencia de esa
  // corrida en vez de inflarlo preventivamente sin datos.
  const maxThresholdMs = process.env.CI ? 5000 : 2000
  expect(Date.now() - start).toBeLessThan(maxThresholdMs)
})