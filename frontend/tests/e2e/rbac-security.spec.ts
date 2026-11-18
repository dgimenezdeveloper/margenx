import { test, expect, type Page, type Response } from '@playwright/test'

/**
 * Issue #127. Suite autenticada como COLLABORATOR (cuenta piloto: COLLABORATOR Panadería Central,
 * ver auth.collaborator.setup.ts y playwright.config.ts) — no como ADMIN, a
 * diferencia del resto de las suites de este directorio.
 *
 * Objetivo: auditar, de punta a punta y de forma automatizada, que la barrera
 * RBAC (frontend PR #142/#145/#146 + backend PR #143) realmente le impide a
 * un colaborador ver información financiera o acceder a rutas de administración
 * — no solo confiar en que el código "debería" ocultarlo.
 */

// Claves financieras que ninguna respuesta JSON de /api/** debe exponer a un
// colaborador, tal como las exige el Gherkin de la issue. No es el conjunto
// completo de FINANCIAL_FIELDS del backend (PR #143 esconde más campos,
// como minMarginPercent, oldCost/newCost o toda la info de proveedores) —
// se audita exactamente lo que pide la Historia de Usuario de esta issue.
const FORBIDDEN_KEYS = ['cost', 'marginAmount', 'marginPercent', 'quantity'] as const

interface KeyMatch {
  key: string
  path: string
  url: string
}

function findForbiddenKeys(value: unknown, forbidden: readonly string[], path = '$'): Omit<KeyMatch, 'url'>[] {
  if (value === null || typeof value !== 'object') return []

  const matches: Omit<KeyMatch, 'url'>[] = []

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      matches.push(...findForbiddenKeys(item, forbidden, `${path}[${index}]`))
    })
    return matches
  }

  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    const currentPath = `${path}.${key}`
    if (forbidden.includes(key)) {
      matches.push({ key, path: currentPath })
    }
    matches.push(...findForbiddenKeys(val, forbidden, currentPath))
  }

  return matches
}

function attachAuditListeners(page: Page) {
  const keyMatches: KeyMatch[] = []
  const jsonResponsesSeen: string[] = []
  const consoleErrors: string[] = []
  const pageErrors: string[] = []

  page.on('response', (response: Response) => {
    const url = response.url()
    if (!url.includes('/api/')) return

    const contentType = response.headers()['content-type'] ?? ''
    if (!contentType.includes('application/json')) return

    void response
      .json()
      .then((body) => {
        jsonResponsesSeen.push(url)
        for (const match of findForbiddenKeys(body, FORBIDDEN_KEYS)) {
          keyMatches.push({ ...match, url })
        }
      })
      .catch(() => {})
  })

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    if (/^Failed to load resource:/.test(msg.text())) return

    consoleErrors.push(msg.text())
  })

  page.on('pageerror', (err) => {
    pageErrors.push(err.message)
  })

  return { keyMatches, jsonResponsesSeen, consoleErrors, pageErrors }
}

const COSTO_TEXT = /\bcostos?\b/i
const MARGEN_TEXT = /\bm[aá]rgenes?\b/i

test.describe('TC-RBAC-01: Ocultamiento de costo y margen en /productos (issue #127)', () => {
  test('ningún selector de /productos contiene texto de costo o margen', async ({ page }) => {
    await page.goto('/productos')

    await expect(page.locator('tbody tr').first()).toBeVisible()

    await expect(page.getByText(COSTO_TEXT)).toHaveCount(0)
    await expect(page.getByText(MARGEN_TEXT)).toHaveCount(0)
  })

  test('la ficha de un producto tampoco expone costo, margen ni el simulador financiero', async ({ page }) => {
    await page.goto('/productos')
    await page.locator('tbody tr').first().click()
    await expect(page).toHaveURL(/\/productos\/.+/)

    await expect(page.getByText(/Precio de Venta al Público/i)).toBeVisible()

    await expect(page.getByText(/subtotal/i)).toHaveCount(0)
    await expect(page.getByText(COSTO_TEXT)).toHaveCount(0)
    await expect(page.getByText(MARGEN_TEXT)).toHaveCount(0)
    await expect(page.getByText(/simulador financiero/i)).toHaveCount(0)
  })
})

test.describe('TC-RBAC-02: Intercepción de ruta administrativa /insumos (issue #127)', () => {
  test('forzar la navegación a /insumos redirige de inmediato a /productos', async ({ page }) => {
    await page.goto('/insumos')

    await expect(page).toHaveURL(/\/productos$/)
    await expect(page.getByRole('heading', { name: /insumos/i })).toHaveCount(0)
  })
})

test.describe('TC-RBAC-03: Fuga de datos financieros en tráfico de red (issue #127)', () => {
  test('ninguna respuesta JSON de la API expone cost, marginAmount ni marginPercent; la consola no emite errores', async ({ page }) => {
    const audit = attachAuditListeners(page)

    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: /hola, colaborador/i })).toBeVisible()

    await page.goto('/productos')
    await expect(page.locator('tbody tr').first()).toBeVisible()
    await page.locator('tbody tr').first().click()
    await expect(page).toHaveURL(/\/productos\/.+/)
    await expect(page.getByText(/Precio de Venta al Público/i)).toBeVisible()

    await page.waitForTimeout(1000)

    expect(audit.jsonResponsesSeen.length).toBeGreaterThan(0)

    expect(
      audit.keyMatches,
      `Se filtraron claves financieras: ${JSON.stringify(audit.keyMatches, null, 2)}`
    ).toEqual([])

    expect(
      audit.consoleErrors,
      `La consola emitió errores no controlados: ${JSON.stringify(audit.consoleErrors, null, 2)}`
    ).toEqual([])

    expect(
      audit.pageErrors,
      `Hubo excepciones de JS no controladas: ${JSON.stringify(audit.pageErrors, null, 2)}`
    ).toEqual([])
  })
})

test.describe('TC-RBAC-04: Intercepción de ruta administrativa /productos/nuevo', () => {
  test('forzar la navegación a /productos/nuevo redirige de inmediato a /productos', async ({ page }) => {
    await page.goto('/productos/nuevo')

    await expect(page).toHaveURL(/\/productos$/)
    await expect(page.getByRole('heading', { name: /nuevo producto/i })).toHaveCount(0)
  })
})

test.describe('TC-RBAC-05: Intercepción de ruta administrativa /proveedores (issue #249)', () => {
  test('forzar la navegación a /proveedores redirige a /productos y el menú no ofrece el enlace', async ({ page }) => {
    await page.goto('/proveedores')

    await expect(page).toHaveURL(/\/productos$/)
    await expect(page.getByRole('heading', { name: /^proveedores$/i })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Proveedores' })).toHaveCount(0)
    await expect(page.getByTestId('bottom-nav-proveedores')).toHaveCount(0)
  })
})

test.describe('TC-RBAC-06: Bandeja de cuarentena y dirección de ingesta (issue #251)', () => {
  test('forzar la navegación a /proveedores/cuarentena redirige a /productos sin mostrar la bandeja ni la dirección de ingesta', async ({ page }) => {
    await page.goto('/proveedores/cuarentena')

    await expect(page).toHaveURL(/\/productos$/)
    await expect(page.locator('tbody tr').first()).toBeVisible()

    await expect(page.getByRole('heading', { name: /precios en cuarentena/i })).toHaveCount(0)
    await expect(page.getByRole('navigation', { name: 'Secciones de proveedores' })).toHaveCount(0)
    await expect(page.getByText(/precios[-.+][a-z0-9-]+@margenx\.tech/i)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Copiar dirección' })).toHaveCount(0)
  })
})

test.describe('TC-RBAC-07: Intercepción de ruta administrativa /compras (issue #389)', () => {
  test('forzar la navegación a /compras redirige a /productos y el menú no ofrece el enlace', async ({ page }) => {
    await page.goto('/compras')

    await expect(page).toHaveURL(/\/productos$/)
    await expect(page.getByRole('heading', { name: /^compras$/i })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Compras' })).toHaveCount(0)
    await expect(page.getByTestId('bottom-nav-compras')).toHaveCount(0)
  })
})