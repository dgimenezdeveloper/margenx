/// <reference types="node" />
import { test, expect, type Page } from '@playwright/test'

/**
 * Issue #175. Datos fijos del seed de "Panadería Central" (backend/prisma/seed.ts):
 * los 3 IDs son estables entre corridas porque el seed hace upsert por id.
 */
const INGREDIENT_ID = '30b00001-0000-4000-8000-000000000001'
const INGREDIENT_NAME = 'Harina de trigo 000 Olavarriense'
const INGREDIENT_BASE_COST = '742.98'
const INGREDIENT_CRITICAL_COST = '4500'
const PRODUCT_NAME = 'Pan flauta — 1 kg'

// Viewport móvil angosto pedido por el Gherkin de la issue.
test.use({ viewport: { width: 360, height: 800 } })

async function setIngredientCost(page: Page, cost: string) {
  await page.goto('/insumos')
  await page.getByPlaceholder('Buscar insumos...').fill(INGREDIENT_NAME)
  // A 360px solo existe la tarjeta móvil (botón), la fila de la tabla desktop
  // está oculta por CSS (`hidden md:block`) — Playwright no puede clickearla.
  await page.getByRole('button', { name: new RegExp(INGREDIENT_NAME) }).click()
  await page.getByLabel(/Costo unitario/i).fill(cost)
  await page.getByRole('button', { name: 'Guardar Costo' }).click()
}

// Evita que una corrida local con varios workers mute el costo compartido de
// Harina 000 en paralelo con otra corrida de esta misma suite (mismo patrón
// que margin-recalculation.spec.ts, que muta el mismo insumo).
test.describe.configure({ mode: 'serial' })

test.describe('TC-CASCADA-01: Recálculo en cascada con alerta visual y toast (issue #175)', () => {
  test.afterEach(async ({ page }) => {
    // Deja el insumo en su costo base para que la corrida sea repetible,
    // corra o no corra bien el resto del test.
    await setIngredientCost(page, INGREDIENT_BASE_COST)
  })

  test('editar el costo de un insumo crítico dispara el toast de recálculo y el semáforo en rojo, sin recargar la página', async ({ page }) => {
    const start = Date.now()

    // --- Precondición: costo base conocido ---
    await setIngredientCost(page, INGREDIENT_BASE_COST)

    // --- Acción: subir el costo a un valor crítico ---
    await page.goto('/insumos')
    await page.getByPlaceholder('Buscar insumos...').fill(INGREDIENT_NAME)
    await page.getByRole('button', { name: new RegExp(INGREDIENT_NAME) }).click()
    await page.getByLabel(/Costo unitario/i).fill(INGREDIENT_CRITICAL_COST)

    const [putResponse] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes(`/api/ingredients/${INGREDIENT_ID}`) && res.request().method() === 'PUT'
      ),
      page.getByRole('button', { name: 'Guardar Costo' }).click(),
    ])

    // --- Verificación de red: el payload JSON trae los productos críticos (issue #175) ---
    const body = await putResponse.json()
    const criticalPanFlauta = body.criticalProducts.find((p: { productName: string }) => p.productName === PRODUCT_NAME)
    expect(criticalPanFlauta, 'el PUT debe marcar Pan flauta como producto crítico con este costo').toBeTruthy()
    expect(body.affectedProductsCount).toBeGreaterThan(0)

    // Mismo formateo que MarginBadge.tsx (toFixed(1), sin ".0" sobrante) —
    // se deriva del valor real devuelto por la API en vez de hardcodear un
    // porcentaje, para no depender de que los costos del seed no cambien.
    const expectedBadgePercent = Number(criticalPanFlauta.currentMarginPercent).toFixed(1).replace(/\.0$/, '')

    // --- Verificación del toast informativo de recálculo ---
    // La cola de toasts (PR #211) muestra primero el de éxito (~3s) antes de
    // este — timeout generoso para no acoplarse a la duración exacta de la cola.
    await expect(
      page.getByText(new RegExp(`Se actualizaron los costos de ${body.affectedProductsCount} recetas vinculadas`))
    ).toBeVisible({ timeout: 8000 })

    // --- Navegación a /productos vía la barra inferior (SPA, sin reload) ---
    // Hay dos links "Productos" en el DOM (navbar desktop oculto + bottom nav
    // móvil visible a 360px) — .last() toma el de BottomNav, que siempre se
    // renderiza después del Navbar en el árbol (ver productos/page.tsx).
    await page.getByRole('link', { name: 'Productos' }).last().click()
    await expect(page).toHaveURL(/\/productos$/)

    // --- Verificación visual: badge rojo "Crítico" en la tarjeta del producto ---
    // El nombre accesible refleja el `text-transform: capitalize` del h3 ("Pan Flauta — 1 Kg"),
    // de ahí la bandera 'i' en vez de comparar contra el texto literal del seed.
    const productCard = page.getByRole('link', { name: new RegExp(PRODUCT_NAME, 'i') })
    await expect(productCard).toBeVisible()
    await expect(productCard.getByText(`Crítico (${expectedBadgePercent}%)`)).toBeVisible()

    // --- Gherkin: la prueba completa debe finalizar en menos de 15 segundos ---
    expect(Date.now() - start).toBeLessThan(15000)
  })
})
