import { test, expect, type Page } from '@playwright/test'

/**
 * Impacto en el margen (/compras, issue #446, ADR-010) con la sesión de ADMIN.
 *
 * El spec crea sus propios datos por la API y los borra al terminar, sin tocar el catálogo del
 * seed que usan cascade-recalculation y margin-recalculation: dos proveedores, un insumo con la
 * presentación predeterminada a $1.000/kg y una alternativa a $800/kg, y un producto que usa 1 kg.
 * Con precio de $1.500 y mínimo del 40 %, el margen pasa de 33,3 % (En riesgo) a 46,7 % (En objetivo).
 */

// Mismo VITE_API_URL que usa la app (frontend/src/services/api.ts): en CI el backend corre en el 3021.
const API_URL = process.env.VITE_API_URL ?? 'http://localhost:3000/api'

const RUN_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
const DEFAULT_SUPPLIER = `Molino Pampeano (E2E ${RUN_ID})`
const CHEAPER_SUPPLIER = `Distribuidora Granos del Sur (E2E ${RUN_ID})`
const INGREDIENT = `Harina integral fina (E2E ${RUN_ID})`
const PRODUCT = `Pan integral de molde (E2E ${RUN_ID})`

interface Fixture {
  defaultSupplierId: string
  cheaperSupplierId: string
  ingredientId: string
  productId: string
}

// Token real de la sesión de Clerk (storageState de auth.setup.ts): el backend valida
// Authorization: Bearer. Se pide uno por llamada porque duran ~60 s.
async function getAdminToken(page: Page): Promise<string> {
  await page.waitForFunction(
    () => Boolean((globalThis as unknown as { Clerk?: { session?: unknown } }).Clerk?.session),
    undefined,
    { timeout: 15000 },
  )
  const token = await page.evaluate(async () => {
    const clerk = (globalThis as unknown as { Clerk?: { session?: { getToken: () => Promise<string | null> } } }).Clerk
    return (await clerk?.session?.getToken()) ?? null
  })
  if (!token) throw new Error('No se pudo obtener un token de Clerk desde la sesión autenticada de la página.')
  return token
}

async function adminApi(page: Page, method: 'GET' | 'POST' | 'DELETE', path: string, data?: unknown) {
  const token = await getAdminToken(page)
  const res = await page.request.fetch(`${API_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    data,
  })
  if (!res.ok()) {
    throw new Error(`${method} ${path} falló (${res.status()}): ${await res.text()}`)
  }
  return res.json()
}

// Anota cada id en `fixture` apenas lo crea: si un paso falla a mitad de camino, el `finally` del test borra lo creado.
async function createFixture(page: Page, fixture: Partial<Fixture>): Promise<void> {
  const { supplier: defaultSupplier } = await adminApi(page, 'POST', '/suppliers', { name: DEFAULT_SUPPLIER, isActive: true })
  fixture.defaultSupplierId = defaultSupplier.id
  const { supplier: cheaperSupplier } = await adminApi(page, 'POST', '/suppliers', { name: CHEAPER_SUPPLIER, isActive: true })
  fixture.cheaperSupplierId = cheaperSupplier.id
  const { ingredient } = await adminApi(page, 'POST', '/ingredients', { name: INGREDIENT, unit: 'kg', currentCost: '1000.00' })
  fixture.ingredientId = ingredient.id

  await adminApi(page, 'POST', `/suppliers/${defaultSupplier.id}/ingredients`, {
    ingredientId: ingredient.id,
    packageSize: '25',
    packageUnit: 'kg',
    packagePrice: '25000.00',
    isDefault: true,
  })
  await adminApi(page, 'POST', `/suppliers/${cheaperSupplier.id}/ingredients`, {
    ingredientId: ingredient.id,
    packageSize: '25',
    packageUnit: 'kg',
    packagePrice: '20000.00',
    isDefault: false,
  })
  const { product } = await adminApi(page, 'POST', '/products', {
    name: PRODUCT,
    salePrice: '1500.00',
    minMarginPercent: '40.00',
    ingredients: [{ ingredientId: ingredient.id, quantity: '1.000' }],
  })
  fixture.productId = product.id
}

// Se borra en orden: el producto libera el insumo, los proveedores se llevan sus presentaciones.
async function deleteFixture(page: Page, fixture: Partial<Fixture>) {
  const steps: Array<[string | undefined, string]> = [
    [fixture.productId, `/products/${fixture.productId}`],
    [fixture.defaultSupplierId, `/suppliers/${fixture.defaultSupplierId}`],
    [fixture.cheaperSupplierId, `/suppliers/${fixture.cheaperSupplierId}`],
    [fixture.ingredientId, `/ingredients/${fixture.ingredientId}`],
  ]
  for (const [id, path] of steps) {
    if (id) await adminApi(page, 'DELETE', path)
  }
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.locator('html').evaluate((html) => html.scrollWidth - html.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

test.describe('TC-COMPRAS-01: Impacto en el margen (issue #446)', () => {
  test.use({ viewport: { width: 360, height: 740 } })

  test('confirmar la alternativa deja el margen que mostraba la confirmación, sin calculadora ni scroll horizontal', async ({ page }) => {
    await page.goto('/compras')
    const fixture: Partial<Fixture> = {}

    try {
      await createFixture(page, fixture)
      await page.reload()

      // Impacto visible
      await expect(page.getByRole('heading', { level: 1, name: 'Impacto en el margen' })).toBeVisible()
      const card = page.getByRole('article', { name: INGREDIENT })
      await expect(card.getByText(DEFAULT_SUPPLIER, { exact: true })).toBeVisible()
      await expect(card.getByText(CHEAPER_SUPPLIER, { exact: true })).toBeVisible()
      const productRow = card.getByRole('listitem', { name: PRODUCT })
      // formatPercent separa el "%" con espacio duro (U+00A0): \s lo cubre.
      await expect(productRow.getByText(/^33,3\s%$/)).toBeVisible()
      await expect(productRow.getByText(/^46,7\s%$/)).toBeVisible()
      await expect(productRow.getByText('En riesgo', { exact: true })).toBeVisible()
      await expect(productRow.getByText('En objetivo', { exact: true })).toBeVisible()

      // Sin calculadora
      await expect(page.getByRole('button', { name: /Calcular pedido/i })).toHaveCount(0)
      await expect(page.getByText(/Pedido Semanal|Ahorro potencial por bulto/i)).toHaveCount(0)
      await expect(page.getByRole('spinbutton')).toHaveCount(0)
      await expect(page.getByRole('textbox')).toHaveCount(0)

      const tab = page.getByTestId('bottom-nav-compras')
      await expect(tab).toHaveAttribute('aria-current', 'page')
      await expect(tab).toHaveAccessibleName('Impacto en el margen')
      await expectNoHorizontalScroll(page)
      await page.screenshot({ path: 'test-results/evidencia-360px/compras-impacto-360px.png', fullPage: true })

      // Confirmación con impacto
      await card
        .getByRole('button', { name: `Ya le compro a este proveedor: ${INGREDIENT} a ${CHEAPER_SUPPLIER}` })
        .click()
      const dialog = page.getByRole('dialog', { name: `¿Ya le comprás a ${CHEAPER_SUPPLIER}?` })
      const dialogRow = dialog.getByRole('listitem', { name: PRODUCT })
      await expect(dialogRow.getByText(/^46,7\s%$/)).toBeVisible()
      await expect(dialog.getByText(/1 producto cambia su margen/)).toBeVisible()
      await page.screenshot({ path: 'test-results/evidencia-360px/compras-impacto-confirmacion-360px.png' })

      await dialog.getByRole('button', { name: 'Sí, ya le compro' }).click()
      await expect(page.getByText('Listo: 1 producto recalculado')).toBeVisible()
      await expect(dialog).toBeHidden()

      // El margen guardado es el que mostraba la confirmación.
      const { product } = await adminApi(page, 'GET', `/products/${fixture.productId}`)
      expect(Number(product.marginPercent).toFixed(1)).toBe('46.7')
      const { ingredient } = await adminApi(page, 'GET', `/ingredients/${fixture.ingredientId}`)
      expect(Number(ingredient.currentCost)).toBe(800)

      // El insumo ya no tiene alternativa más barata: su tarjeta desaparece.
      await expect(page.getByRole('article', { name: INGREDIENT })).toHaveCount(0)
    } finally {
      await deleteFixture(page, fixture)
    }
  })

  test.describe('en escritorio', () => {
    test.use({ viewport: { width: 1280, height: 800 } })

    test('el enlace "Impacto en el margen" está en la barra superior y no en el menú inferior', async ({ page }) => {
      await page.goto('/compras')

      await expect(page.getByRole('heading', { level: 1, name: 'Impacto en el margen' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Impacto en el margen' })).toBeVisible()
      await expect(page.getByTestId('bottom-nav-compras')).toBeHidden()
      await expectNoHorizontalScroll(page)
    })
  })
})
