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

  // En runners de CI con CPU compartida, la compilación en frío de Vite puede tardar > 2s
  const maxThresholdMs = process.env.CI ? 5000 : 2000
  expect(Date.now() - start).toBeLessThan(maxThresholdMs)
})

test('muestra estado de error con botón reintentar en /dashboard si la API falla con 500', async ({ page }) => {
  // Simula falla 500 en el endpoint de métricas
  await page.route('**/api/dashboard/metrics', (route) => {
    void route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Fallo simulado en métricas de dashboard' }),
    })
  })

  await page.goto('/dashboard')

  // Verifica el mensaje de error y el botón de reintento
  const alert = page.getByRole('alert')
  await expect(alert).toBeVisible()
  await expect(alert.getByRole('button', { name: /reintentar/i })).toBeVisible()

  // Verifica que NO se muestren indicadores engañosos en cero
  await expect(page.getByText(/0 productos en riesgo/i)).toHaveCount(0)
  await expect(page.getByText(/0 insumos/i)).toHaveCount(0)
})
