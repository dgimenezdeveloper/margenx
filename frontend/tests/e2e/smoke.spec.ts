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
  expect(Date.now() - start).toBeLessThan(2000)
})
