import { test, expect } from '@playwright/test'

import { addProduct, centsToMoney, charge, closeShift, ensureNoOpenShift, openShift } from './sales-helpers.js'

/**
 * TC-VENTAS-01 (issues #448 y #449), con la sesión de ADMIN a 360 px: abrir el turno, vender,
 * ver el ticket, anular con motivo y cerrar con arqueo. Requiere el módulo de ventas prendido
 * en la cuenta (en el CI lo prende un paso de ci.yml después del seed). Deja un turno cerrado,
 * una venta y una venta anulada: en el CI la base es efímera.
 */
test.describe('TC-VENTAS-01: turno, venta, ticket, anulación y cierre (ADMIN)', () => {
  test.use({ viewport: { width: 360, height: 740 } })

  test('abre con $10.000, vende en efectivo, anula una venta y cierra con −$500 de diferencia', async ({ page }) => {
    const opening = 1_000_000
    let saleCents = 0

    await test.step('abre el turno desde /ventas', async () => {
      await ensureNoOpenShift(page)
      await openShift(page, '10.000')
    })

    await test.step('vende 1 del primer producto y 2 del segundo en efectivo, y ve el ticket', async () => {
      await page.goto('/ventas/nueva')
      await expect(page.getByText(/^Turno abierto desde /)).toBeVisible()
      const first = await addProduct(page, 0, 1)
      const second = await addProduct(page, 1, 2)
      saleCents = first.priceCents + second.priceCents * 2
      const ticket = await charge(page, 'Efectivo', saleCents)
      await expect(ticket.getByRole('img', { name: 'MargenX' })).toBeVisible()
      await page.screenshot({ path: 'test-results/evidencia-360px/ventas-ticket.png', fullPage: true })
    })

    await test.step('vende 1 más y la anula con motivo: queda en el historial como anulada', async () => {
      await page.goto('/ventas/nueva')
      const product = await addProduct(page, 1, 1)
      await charge(page, 'Efectivo', product.priceCents)
      await page.getByRole('button', { name: 'Anular venta' }).click()
      await page.getByRole('dialog').getByLabel('Motivo').fill('Cobré dos veces la misma venta')
      await page.getByRole('dialog').getByRole('button', { name: 'Anular' }).click()
      await expect(page.getByText(/^VENTA ANULADA · Cobré dos veces la misma venta$/)).toBeVisible()
    })

    await test.step('cierra contando $500 menos de lo esperado: falta −$500,00 y la anulada no cuenta', async () => {
      const expectedCash = opening + saleCents
      const summary = await closeShift(page, expectedCash - 50_000, 'Falta −$500,00')
      const cash = summary.getByRole('table', { name: 'Efectivo' })
      await expect(cash).toContainText(centsToMoney(expectedCash))
      await expect(summary.getByText(/· 1 anulada$/)).toBeVisible()
      await page.screenshot({ path: 'test-results/evidencia-360px/ventas-cierre.png', fullPage: true })
    })

    await test.step('con el turno cerrado, /ventas vuelve a ofrecer abrir uno', async () => {
      await page.goto('/ventas')
      await expect(page.getByRole('region', { name: 'Turno de caja' }).getByText('No hay un turno abierto')).toBeVisible()
    })
  })
})
