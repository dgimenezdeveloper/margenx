import { test, expect, type Page } from '@playwright/test'

/**
 * Issue #47. Datos fijos del seed de "Panadería Central" (backend/prisma/seed.ts).
 * El seed no crea recetas (ProductIngredient) ni incluye un producto "Pan común"
 * como menciona el enunciado original de la issue — se usa el producto real más
 * cercano ("Pan flauta — 1 kg") y el ID fijo del insumo (estable entre corridas
 * del seed porque el script hace upsert por id).
 */
const INGREDIENT_ID = '30b00001-0000-4000-8000-000000000001'
const INGREDIENT_NAME = 'Harina de trigo 000 Olavarriense'
const INGREDIENT_BASE_COST = '742.98'
const INGREDIENT_CRITICAL_COST = '4500'
const PRODUCT_NAME = 'Pan flauta — 1 kg'
const PRODUCT_MIN_MARGIN = '55%'

// Insumos exclusivos de "Química GyJ" (segunda cuenta del seed): ninguno debe
// filtrarse en la sesión de "Panadería Central".
const OTHER_TENANT_INGREDIENTS = ['Etoxilado', 'Sulfonico', 'Opacante']

// Misma función que usa la app (frontend/src/app/insumos/page.tsx) para
// formatear el costo en la tabla — se usa para confirmar el guardado
// mirando el resultado real en el DOM, en vez de depender del toast
// (se autooculta a los 3s) o de interceptar la red (nada confiable en
// algunos entornos/proxies).
const money = (val: number) => `$${Math.round(val).toLocaleString('es-AR')}`

async function setIngredientCost(page: Page, cost: string) {
  await page.goto('/insumos')
  await page.getByPlaceholder('Buscar insumos...').fill(INGREDIENT_NAME)
  await page.getByRole('row', { name: INGREDIENT_NAME }).click()
  await page.getByLabel(/Costo unitario/i).fill(cost)
  // BUG real de la app (ajeno a esta issue): el input de costo es
  // type="number" sin step="any" y el <form> no tiene noValidate, así que
  // Chrome bloquea en silencio el submit para cualquier valor no entero
  // (como el costo base real del seed, 742.98) — sin error visible ni
  // request de red. Se deshabilita la validación nativa del form para
  // poder fijar el fixture; no toca la validación de Zod/react-hook-form.
  await page.locator('form').evaluate((form) => { (form as unknown as { noValidate: boolean }).noValidate = true })
  await page.getByRole('button', { name: 'Guardar Costo' }).click()
  // Confirma el guardado esperando que el nuevo costo se refleje en la fila
  // de la tabla de insumos.
  await expect(page.getByRole('row', { name: INGREDIENT_NAME })).toContainText(money(Number(cost)))
}

// Ambos tests corren en serie (no en paralelo): TC-MRG-01 muta el costo real
// del insumo compartido y, en entornos con recursos limitados, dos navegadores
// simultáneos contra el mismo backend generan lentitud suficiente para vencer
// los timeouts por defecto.
test.describe.configure({ mode: 'serial' })

test.describe('TC-MRG-01: Recálculo de margen en tiempo real (issue #47)', () => {
  test.beforeEach(async ({ page }) => {
    // Fuerza el costo base al arrancar: no asume que la corrida anterior haya
    // podido restaurarlo (p. ej. si falló a mitad de camino), así el test es
    // autosuficiente en vez de depender del estado que haya dejado la previa.
    await setIngredientCost(page, INGREDIENT_BASE_COST)
  })

  test('editar el costo de un insumo crítico recalcula el margen del producto y muestra la alerta visual', async ({ page }) => {
    test.setTimeout(90000)

    try {
      // --- Precondición: el producto tiene el insumo en su receta ---
      // El seed no crea recetas, así que la primera corrida la arma vía UI
      // (igual que lo haría un usuario real); las corridas siguientes la
      // encuentran ya armada y saltean este bloque.
      await page.goto('/productos')
      await page.getByRole('row', { name: PRODUCT_NAME }).click()
      await expect(page).toHaveURL(/\/productos\/.+/)
      // Espera a que termine de cargar el detalle (fetch de producto + insumos)
      // antes de contar la receta — si no, "count()" no espera nada y puede
      // leer el DOM a mitad de carga, dando 0 siempre.
      await page.getByRole('heading', { name: 'Composición / Receta' }).waitFor()

      const alreadyInRecipe = await page.getByText(INGREDIENT_NAME, { exact: true }).count()
      if (alreadyInRecipe === 0) {
        await page.getByRole('button', { name: 'Agregar Insumo a la Receta' }).click()
        const modal = page.locator('section').filter({ hasText: 'Sumar Insumo a la Receta' })
        await modal.getByLabel('Seleccionar Insumo').selectOption(INGREDIENT_ID)
        await modal.getByRole('spinbutton').fill('1') // Cantidad utilizada
        await modal.getByRole('combobox').last().selectOption('kg') // Unidad
        await modal.getByRole('button', { name: 'Agregar' }).click()
        // Confirma el guardado esperando que el insumo aparezca en la lista
        // de "Composición / Receta" del producto.
        await expect(page.getByText(INGREDIENT_NAME, { exact: true })).toBeVisible()
      }

      // Con el costo base del insumo, el margen debe estar saludable.
      await expect(page.getByText(/Margen saludable/)).toBeVisible()

      // --- Acción: editar el costo del insumo a un valor crítico desde /insumos ---
      await setIngredientCost(page, INGREDIENT_CRITICAL_COST)

      // --- Verificación: el catálogo de productos debe reflejar el nuevo margen ---
      await page.goto('/productos')
      const productRow = page.getByRole('row', { name: PRODUCT_NAME })
      await expect(productRow).toBeVisible()
      // Badge de margen negativo (por debajo del mínimo) visible junto al producto.
      await expect(productRow.getByText(/^-\d+(\.\d+)?%$/)).toBeVisible()

      // --- Verificación: el detalle del producto muestra la alerta explícita ---
      await productRow.click()
      await expect(page.getByText(`Por debajo del mínimo (${PRODUCT_MIN_MARGIN})`)).toBeVisible()
    } finally {
      // Deja el insumo en su costo original del seed para que la corrida sea
      // repetible, corra o no corra bien el resto del test.
      await setIngredientCost(page, INGREDIENT_BASE_COST)
    }
  })
})

test.describe('TC-SEC-01: Aislamiento multiempresa en Insumos (issue #47)', () => {
  test('la sesión de Panadería Central no debe listar insumos de Química GyJ', async ({ page }) => {
    await page.goto('/insumos')

    // Control positivo: confirma que la lista realmente cargó datos de
    // Panadería Central (evita que las aserciones de ausencia "pasen" por
    // una lista vacía o una carga fallida).
    // Nota: se usa el rol "cell" (celda de la tabla desktop) porque el mismo
    // nombre también existe, oculto por CSS, en la card mobile — un getByText
    // simple matchea ambos y viola el modo estricto de Playwright.
    await expect(page.getByRole('cell', { name: INGREDIENT_NAME, exact: true })).toBeVisible()

    for (const name of OTHER_TENANT_INGREDIENTS) {
      await expect(page.getByText(name, { exact: true })).toHaveCount(0)
    }
  })
})