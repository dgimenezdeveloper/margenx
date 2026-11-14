import { test, expect } from '@playwright/test'

// Corre con la sesión del proyecto "chromium" (storageState de auth.setup.ts): las pantallas
// públicas tienen que reconocerla. La versión sin sesión de la landing la cubre home.spec.ts.

/** Texto del hero de la landing (`src/app/page.tsx`): si aparece, el usuario vio el pantallazo. */
const LANDING_HERO = 'Control de costos'

/**
 * Lo mínimo del navegador que usa el script inyectado. El tsconfig de las E2E no incluye la
 * librería DOM (mismo patrón que quarantine-queue.spec.ts: `globalThis` con un tipo local).
 */
type BrowserGlobals = {
  __landingShown?: boolean
  document: { body: { innerText: string } | null }
  MutationObserver: new (callback: () => void) => {
    observe: (target: unknown, options: { childList: boolean; subtree: boolean; characterData: boolean }) => void
  }
}

test.describe('Pantallas públicas con la sesión iniciada', () => {
  test('Gherkin "Sin pantallazo": al escribir el dominio a mano no ve la landing antes del dashboard', async ({ page }) => {
    // Registra desde el primer instante si la landing llegó a pintarse, aunque sea un cuadro.
    await page.addInitScript((heroText: string) => {
      const browser = globalThis as unknown as BrowserGlobals
      browser.__landingShown = false
      new browser.MutationObserver(() => {
        if (browser.document.body?.innerText.includes(heroText)) browser.__landingShown = true
      }).observe(browser.document, { childList: true, subtree: true, characterData: true })
    }, LANDING_HERO)

    await page.goto('/')
    await expect(page).toHaveURL(/\/dashboard/)

    const landingShown = await page.evaluate(() => (globalThis as unknown as BrowserGlobals).__landingShown)
    expect(landingShown, 'la landing no debe mostrarse a un usuario con sesión').toBe(false)
  })

  test('Gherkin "Guía con sesión": /instalar ofrece "Ir al panel" en lugar de "Ingresar"', async ({ page }) => {
    await page.goto('/instalar')

    const panel = page.getByRole('link', { name: 'Ir al panel' })
    await expect(panel).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ingresar' })).toHaveCount(0)

    await panel.click()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('/privacidad ofrece "Ir al panel" en lugar de "Volver a la web"', async ({ page }) => {
    await page.goto('/privacidad')

    await expect(page.getByRole('link', { name: 'Ir al panel' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Volver a la web' })).toHaveCount(0)
  })
})
