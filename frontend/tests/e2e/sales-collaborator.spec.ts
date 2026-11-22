import { test, expect } from '@playwright/test'

import { addProduct, charge, closeShift, ensureNoOpenShift, openShift } from './sales-helpers.js'

/**
 * TC-VENTAS-02 (issues #448 y #449), con la sesión de COLLABORATOR: el colaborador abre su
 * turno, vende y cierra, y la API nunca le manda costos ni márgenes (ADR-007, ADR-010).
 * Corre en el proyecto chromium-collaborator.
 */
const COST_FIELDS = /unitCost|lineCost|marginPercent|totalCost/

test.describe('TC-VENTAS-02: el colaborador vende y cierra sin ver costos', () => {
  test('abre el turno, vende, el ticket llega sin costos y cierra el arqueo justo', async ({ page }) => {
    await ensureNoOpenShift(page)
    await openShift(page, '5.000')

    await page.goto('/ventas/nueva')
    const product = await addProduct(page, 0, 1)
    const created = page.waitForResponse(
      (response) => new URL(response.url()).pathname.endsWith('/api/sales') && response.request().method() === 'POST'
    )
    const detail = page.waitForResponse(
      (response) => /\/api\/sales\/[0-9a-f-]+$/.test(new URL(response.url()).pathname) && response.request().method() === 'GET'
    )
    await charge(page, 'Efectivo', product.priceCents)

    expect(JSON.stringify(await (await created).json())).not.toMatch(COST_FIELDS)
    expect(JSON.stringify(await (await detail).json())).not.toMatch(COST_FIELDS)

    await closeShift(page, 500_000 + product.priceCents, 'Justo $0,00')
  })
})
