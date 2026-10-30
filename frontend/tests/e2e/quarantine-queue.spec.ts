import { test, expect, type APIRequestContext, type Page } from '@playwright/test'

/**
 * Issue #310 (NB-7, cosecha del PR #217). La bandeja de cuarentena
 * (/proveedores/cuarentena) no tenía ningún spec E2E — solo cobertura unitaria
 * (QuarantineList.test.tsx). Es la pantalla central para decidir sobre aumentos
 * de proveedores, así que este spec cubre liberar y rechazar con datos reales.
 *
 * Para no depender de mocks, la cuarentena se dispara a través del mismo
 * webhook de ingesta que usa producción (POST /api/webhooks/supplier-prices,
 * ver backend/src/routes/webhooks.ts) con un precio cuya variación supera el
 * 50% respecto del vigente — el mismo mecanismo real que usaría una lista de
 * precios de un proveedor.
 *
 * Usa dos supplierCode del proveedor "Distribuidora MarJuanC Alimentos" que
 * ningún otro spec E2E toca (CRE101/Manteca para liberar, GRA013/Grasa para
 * rechazar), para no interferir con los fixtures de margin-recalculation.spec.ts
 * ni cascade-recalculation.spec.ts (que sí mutan Harina 000).
 */

const SUPPLIER_ID = '30e00001-0000-4000-8000-000000000002' // Distribuidora MarJuanC Alimentos
// Mismo VITE_API_URL que usa la app (frontend/src/services/api.ts): en CI el
// backend corre en el puerto 3021, no 3000 (ver .github/workflows/ci.yml).
const API_URL = process.env.VITE_API_URL ?? 'http://localhost:3000/api'
const WEBHOOK_URL = `${API_URL}/webhooks/supplier-prices`
const INGREDIENTS_URL = `${API_URL}/suppliers/${SUPPLIER_ID}/ingredients`

async function quarantineViaWebhook(request: APIRequestContext, code: string, anomalousPrice: number) {
  const secret = process.env.INTERNAL_WEBHOOK_SECRET
  if (!secret) {
    throw new Error(
      'Falta INTERNAL_WEBHOOK_SECRET en frontend/.env.test — ver frontend/.env.test.example. ' +
      'Es el mismo valor que backend/.env, necesario solo para este spec (dispara la cuarentena vía el webhook real).'
    )
  }

  const res = await request.post(WEBHOOK_URL, {
    headers: { 'x-margenx-webhook-secret': secret },
    data: { accountSlug: 'panaderia-central', items: [{ code, price: anomalousPrice }] },
  })
  if (!res.ok()) {
    throw new Error(`Webhook de ingesta falló (${res.status()}): ${await res.text()}`)
  }
  const body = await res.json()
  if (body.quarantined !== 1) {
    throw new Error(`Se esperaba 1 fila en cuarentena tras el webhook, llegaron ${body.quarantined}. Respuesta: ${JSON.stringify(body)}`)
  }
}

// Token real de la sesión Clerk ya autenticada en `page` (storageState de
// auth.setup.ts) — el backend valida Authorization: Bearer, no cookies
// (ver frontend/src/services/api.ts), así que page.request por sí solo no
// alcanza para llamar al endpoint de alta fuera del flujo normal de la UI.
async function getAdminToken(page: Page): Promise<string> {
  const token = await page.evaluate(async () => {
    const clerk = (globalThis as unknown as { Clerk?: { session?: { getToken: () => Promise<string | null> } } }).Clerk
    return (await clerk?.session?.getToken()) ?? null
  })
  if (!token) throw new Error('No se pudo obtener un token de Clerk desde la sesión autenticada de la página.')
  return token
}

test.describe('TC-QUA: Liberar y rechazar precios en la bandeja de cuarentena (issue #310)', () => {
  test.use({ viewport: { width: 360, height: 800 } })

  test('TC-QUA-01: liberar un precio anómalo lo saca de la bandeja y recalcula el costo', async ({ page, request }) => {
    test.setTimeout(60000)
    const INGREDIENT_NAME = 'Manteca en bloque mayorista'
    const INGREDIENT_ID = '30b00001-0000-4000-8000-000000000004'

    await quarantineViaWebhook(request, 'CRE101', 150000)

    try {
      await page.goto('/proveedores/cuarentena')

      const releaseButton = page.getByRole('button', { name: `Liberar precio propuesto para ${INGREDIENT_NAME}` })
      await expect(releaseButton).toBeVisible()
      // Evidencia de la tarjeta de cuarentena pendiente, a 360px (issue #310,
      // NB-7: nunca se había adjuntado una captura de esta pantalla).
      await page.screenshot({ path: 'test-results/evidencia-360px/quarantine-pendiente.png', fullPage: true })

      await releaseButton.click()
      await page.getByRole('button', { name: 'Sí, liberar' }).click()

      await expect(page.getByText(/Precio liberado\. Recálculo:/i)).toBeVisible({ timeout: 8000 })
      await expect(page.getByText(INGREDIENT_NAME)).toHaveCount(0)

      await page.screenshot({ path: 'test-results/evidencia-360px/quarantine-liberar.png', fullPage: true })
    } finally {
      // Restaura packagePrice/currentCost al valor original del seed vía el
      // mismo endpoint de alta que usaría un admin (sin lógica de cuarentena,
      // ver suppliers.ts) — no reusar el webhook acá: la variación desde el
      // precio anómalo de vuelta al original también supera el 50% y volvería
      // a mandar la fila a cuarentena en lugar de restaurarla.
      const token = await getAdminToken(page)
      await page.request.post(INGREDIENTS_URL, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          ingredientId: INGREDIENT_ID,
          packageSize: '5',
          packageUnit: 'kg',
          packagePrice: '50254.70',
          isDefault: true,
          supplierCode: 'CRE101',
        },
      })
    }
  })

  test('TC-QUA-02: rechazar un precio anómalo lo descarta y mantiene el costo anterior', async ({ page, request }) => {
    test.setTimeout(60000)
    const INGREDIENT_NAME = 'Grasa bovina refinada La Cordobesa'

    await quarantineViaWebhook(request, 'GRA013', 200000)

    await page.goto('/proveedores/cuarentena')

    const rejectButton = page.getByRole('button', { name: `Rechazar precio propuesto para ${INGREDIENT_NAME}` })
    await expect(rejectButton).toBeVisible()
    await rejectButton.click()

    await page.getByRole('button', { name: 'Sí, rechazar' }).click()

    await expect(page.getByText(/Precio rechazado\. Se mantiene el costo anterior\./i)).toBeVisible({ timeout: 8000 })
    await expect(page.getByText(INGREDIENT_NAME)).toHaveCount(0)

    await page.screenshot({ path: 'test-results/evidencia-360px/quarantine-rechazar.png', fullPage: true })
    // Sin cleanup: rechazar no toca packagePrice ni currentCost (ver
    // POST /api/suppliers/quarantine/:id/reject en suppliers.ts), no deja
    // estado mutado que restaurar.
  })
})
