import { expect, type Page } from '@playwright/test'

/**
 * Pasos compartidos de las E2E de ventas y caja (issues #448 y #449). Eligen los productos
 * por posición y leen los precios de la pantalla: así corren igual contra Panadería Central
 * (CI) y contra la cuenta Demo (local), sin depender de nombres ni montos del seed.
 */

/** "$13.500,00" → 1350000. */
export function priceToCents(text: string): number {
  const match = text.match(/\$\s?([\d.]+),(\d{2})/)
  if (!match) throw new Error(`No se pudo leer el precio "${text}"`)
  return Number(match[1]!.replace(/\./g, '')) * 100 + Number(match[2])
}

/** 2530000 → "$25.300,00", como formatMoney del frontend. */
export function centsToMoney(cents: number): string {
  const [integer, decimals] = (Math.abs(cents) / 100).toFixed(2).split('.')
  return `$${integer!.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimals}`
}

/** 2530000 → "25300,00", como lo escribe el comerciante en el arqueo. */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

async function shiftPanel(page: Page) {
  const panel = page.getByRole('region', { name: 'Turno de caja' })
  await expect(panel.getByText(/^Turno abierto$|^No hay un turno abierto$/)).toBeVisible()
  return panel
}

/** Si quedó un turno abierto (por ejemplo, de un reintento), lo cierra para empezar de cero. */
export async function ensureNoOpenShift(page: Page) {
  await page.goto('/ventas')
  const panel = await shiftPanel(page)
  if (await panel.getByText('No hay un turno abierto').isVisible()) return

  await panel.getByRole('link', { name: 'Cerrar turno' }).click()
  await page.getByLabel('Contado en efectivo').fill('0')
  await page.getByRole('button', { name: 'Cerrar turno' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Sí, cerrar' }).click()
  await expect(page.getByRole('heading', { name: 'Cierre de caja' })).toBeVisible()
  await page.goto('/ventas')
  await expect(page.getByRole('region', { name: 'Turno de caja' }).getByText('No hay un turno abierto')).toBeVisible()
}

export async function openShift(page: Page, openingAmount: string) {
  const panel = await shiftPanel(page)
  await panel.getByLabel('Monto inicial en caja').fill(openingAmount)
  await panel.getByRole('button', { name: 'Abrir turno' }).click()
  await expect(panel.getByText('Turno abierto', { exact: true })).toBeVisible()
}

/** Suma `times` unidades del producto en la posición `index` de la grilla y devuelve su precio. */
export async function addProduct(page: Page, index: number, times: number): Promise<{ name: string; priceCents: number }> {
  const card = page.locator('main ul > li').nth(index)
  const name = (await card.locator('p').first().innerText()).trim()
  const priceCents = priceToCents(await card.locator('p').nth(1).innerText())
  for (let i = 0; i < times; i += 1) {
    await card.getByRole('button', { name: /Agregar una unidad/ }).click()
  }
  return { name, priceCents }
}

/** Cobra lo cargado en `/ventas/nueva` y espera el ticket. */
export async function charge(page: Page, paymentLabel: string, expectedTotalCents: number) {
  await expect(page.getByTestId('sale-total')).toHaveText(centsToMoney(expectedTotalCents))
  await page.getByText(paymentLabel, { exact: true }).click()
  await page.getByRole('button', { name: /^Cobrar/ }).click()
  await expect(page).toHaveURL(/\/ventas\/[0-9a-f-]+\/ticket$/)
  const ticket = page.getByRole('article', { name: /^Ticket N\.º \d{6}$/ })
  await expect(ticket.getByTestId('ticket-total')).toHaveText(centsToMoney(expectedTotalCents))
  await expect(ticket.getByText('Comprobante no válido como factura')).toBeVisible()
  return ticket
}

/** Cierra el turno abierto contando `countedCash` en efectivo (los otros medios, precargados). */
export async function closeShift(page: Page, countedCashCents: number, expectedDifference: string) {
  await page.goto('/ventas')
  const panel = await shiftPanel(page)
  await panel.getByRole('link', { name: 'Cerrar turno' }).click()
  await page.getByLabel('Contado en efectivo').fill(centsToInput(countedCashCents))
  await expect(page.getByTestId('total-difference')).toHaveText(expectedDifference)
  await page.getByRole('button', { name: 'Cerrar turno' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Sí, cerrar' }).click()
  const summary = page.getByRole('article', { name: 'Cierre de caja' })
  await expect(summary.getByTestId('total-difference')).toHaveText(expectedDifference)
  return summary
}
