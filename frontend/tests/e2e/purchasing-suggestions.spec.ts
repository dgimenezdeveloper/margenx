import { test, expect, type Page } from '@playwright/test'

/**
 * Compras sugeridas (/compras, issue #389, RF-15) con la sesión de ADMIN y el seed real.
 *
 * Dato del seed (backend/prisma/seed.ts): la Harina de trigo 000 Olavarriense tiene como
 * predeterminada la presentación de Distribuidora MarJuanC Alimentos y una segunda presentación,
 * más barata por kg, en Distribuidora Mayorista Molinera. Por eso la harina aparece bajo Molinera.
 *
 * Solo lectura: no se toca "Usar como predeterminada" (cambiaría el costo vigente que usan
 * cascade-recalculation y margin-recalculation) y POST /api/purchasing/order-preview no persiste nada.
 */

const INGREDIENT = 'Harina de trigo 000 Olavarriense'
const CHEAPER_SUPPLIER = 'Distribuidora Mayorista Molinera'

function supplierGroup(page: Page) {
  return page.locator('section', { has: page.getByRole('heading', { name: CHEAPER_SUPPLIER, exact: true }) })
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.locator('html').evaluate((html) => html.scrollWidth - html.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

test.describe('TC-COMPRAS-01: Sugerir compra (issue #389)', () => {
  test.describe('a 360 px', () => {
    test.use({ viewport: { width: 360, height: 740 } })

    test('muestra la harina bajo el proveedor más barato, sin scroll horizontal y con la pestaña Compras activa', async ({ page }) => {
      await page.goto('/compras')

      await expect(page.getByRole('heading', { level: 1, name: 'Compras Sugeridas' })).toBeVisible()
      const group = supplierGroup(page)
      await expect(group.getByText(INGREDIENT, { exact: true })).toBeVisible()
      // formatPercent separa el "%" con espacio duro (U+00A0): \s lo cubre, un espacio común no.
      await expect(group.getByText(/^-\$[\d.,]+\/kg \([\d,]+\s%\)$/).first()).toBeVisible()
      await expect(page.getByText(/no modifica tus costos vigentes ni tus recetas/i)).toBeVisible()

      // Mobile: tarjetas apiladas, sin la fila de encabezados de la tabla.
      await expect(group.getByRole('columnheader', { name: 'Insumo' })).toBeHidden()

      const tab = page.getByTestId('bottom-nav-compras')
      await expect(tab).toBeVisible()
      await expect(tab).toHaveAttribute('aria-current', 'page')
      await expectNoHorizontalScroll(page)

      await page.screenshot({ path: 'test-results/evidencia-360px/compras-360px.png', fullPage: true })
    })
  })

  test.describe('en escritorio', () => {
    test.use({ viewport: { width: 1280, height: 800 } })

    test('la lista se ve como tabla y el enlace Compras está en la barra superior', async ({ page }) => {
      await page.goto('/compras')

      const group = supplierGroup(page)
      await expect(group.getByRole('columnheader', { name: 'Costo unitario' })).toBeVisible()
      await expect(group.getByRole('row', { name: new RegExp(INGREDIENT) })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Compras' })).toBeVisible()
      await expect(page.getByTestId('bottom-nav-compras')).toBeHidden()
      await expectNoHorizontalScroll(page)
    })
  })
})

test.describe('TC-COMPRAS-02: Pedido sugerido (issue #389)', () => {
  test.use({ viewport: { width: 360, height: 740 } })

  test('con 2 bultos de harina calcula subtotal del proveedor, total y ahorro sin desbordar', async ({ page }) => {
    await page.goto('/compras')

    const group = supplierGroup(page)
    const qty = group.getByLabel(`Bultos de ${INGREDIENT}`, { exact: true })
    await expect(qty).toBeVisible()
    await qty.fill('2')
    await qty.blur()

    const previewResponse = page.waitForResponse(
      (res) => res.url().includes('/api/purchasing/order-preview') && res.request().method() === 'POST'
    )
    await page.getByRole('button', { name: 'Calcular pedido sugerido' }).click()
    const response = await previewResponse
    expect(response.status()).toBe(200)

    const preview = page.getByRole('region', { name: 'Previsualización del Pedido Semanal' })
    await expect(preview).toBeVisible()
    await expect(preview.getByText('Total Estimado')).toBeVisible()
    await expect(preview.getByText('Ahorro Neto Estimado')).toBeVisible()
    await expect(preview.getByRole('heading', { name: CHEAPER_SUPPLIER, exact: true })).toBeVisible()
    await expect(preview.getByText(/^Subtotal: \$[\d.,]+$/).first()).toBeVisible()
    await expect(preview.getByRole('listitem').filter({ hasText: INGREDIENT })).toContainText('2 bulto(s) (50 kg)')
    await expect(preview.getByRole('button', { name: /Copiar pedido/i })).toBeVisible()
    await expect(preview.getByRole('button', { name: /Imprimir/i })).toBeVisible()
    await expectNoHorizontalScroll(page)

    await page.screenshot({ path: 'test-results/evidencia-360px/compras-pedido-360px.png', fullPage: true })
  })
})
