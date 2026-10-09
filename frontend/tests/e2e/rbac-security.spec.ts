import { test, expect, type Page, type Response } from '@playwright/test'

/**
 * Issue #127. Suite autenticada como COLLABORATOR (colab.panaderia@hotmail.com,
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
const FORBIDDEN_KEYS = ['cost', 'marginAmount', 'marginPercent'] as const

interface KeyMatch {
  key: string
  path: string
  url: string
}

// Recorre cualquier JSON (objetos y arrays, en cualquier nivel de anidamiento)
// buscando alguna de las FORBIDDEN_KEYS como nombre de propiedad — réplica,
// del lado del test, de la misma estrategia "por clave" que usa
// sanitizeFinancialData en el backend (backend/src/middlewares/rbac.ts).
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

// Adjunta los listeners de red/consola ANTES de la primera navegación, para
// no perder tráfico disparado apenas carga la página (ej. el fetch inicial
// de /api/dashboard/metrics o /api/products).
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

    // Fire-and-forget: page.on('response') no puede ser async de forma segura
    // (Playwright no espera estos handlers), así que la promesa se encadena
    // aparte y el test espera explícitamente con waitForTimeout más abajo.
    void response
      .json()
      .then((body) => {
        jsonResponsesSeen.push(url)
        for (const match of findForbiddenKeys(body, FORBIDDEN_KEYS)) {
          keyMatches.push({ ...match, url })
        }
      })
      .catch(() => {
        // Respuesta sin body JSON parseable (204, error de red, etc.) — no es
        // relevante para esta auditoría, se ignora.
      })
  })

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return

    // Chrome genera este mensaje sintético para CUALQUIER respuesta no-2xx
    // (XHR/fetch, CSS, imágenes), independientemente de si la app lo maneja
    // bien o no. En esta suite es ruido esperado: el 403 de /api/dashboard/metrics
    // para un colaborador es el comportamiento RBAC correcto que estamos
    // auditando (ver TC-RBAC-03), no un bug — la app ya lo atrapa con
    // Promise.allSettled (dashboard/page.tsx) y no rompe el render. No
    // enmascara errores reales: cualquier excepción de JS no controlada
    // sigue cubierta por separado en pageErrors (listener 'pageerror' abajo).
    if (/^Failed to load resource:/.test(msg.text())) return

    consoleErrors.push(msg.text())
  })

  page.on('pageerror', (err) => {
    pageErrors.push(err.message)
  })

  return { keyMatches, jsonResponsesSeen, consoleErrors, pageErrors }
}

// Límite de palabra explícito: DesktopFooter renderiza "© MargenX..." en
// TODAS las páginas (incluidas las que ve un colaborador), y "MargenX"
// contiene "margen" como substring — sin \b, cualquier test de esta spec
// fallaría siempre por el nombre de marca, no por una fuga real de datos.
const COSTO_TEXT = /\bcostos?\b/i
const MARGEN_TEXT = /\bm[aá]rgenes?\b/i

test.describe('TC-RBAC-01: Ocultamiento de costo y margen en /productos (issue #127)', () => {
  test('ningún selector de /productos contiene texto de costo o margen', async ({ page }) => {
    await page.goto('/productos')

    // Control positivo: confirma que el catálogo realmente cargó productos
    // antes de afirmar la ausencia de "costo"/"margen" — si no, la aserción
    // de abajo pasaría trivialmente ante una lista vacía o una carga fallida.
    await expect(page.locator('tbody tr').first()).toBeVisible()

    await expect(page.getByText(COSTO_TEXT)).toHaveCount(0)
    await expect(page.getByText(MARGEN_TEXT)).toHaveCount(0)
  })

  test('la ficha de un producto tampoco expone costo, margen ni el simulador financiero', async ({ page }) => {
    await page.goto('/productos')
    await page.locator('tbody tr').first().click()
    await expect(page).toHaveURL(/\/productos\/.+/)

    // Confirma que la ficha realmente cargó (nombre + precio de venta,
    // únicos datos que la Historia de Usuario permite ver al colaborador).
    await expect(page.getByText(/Precio de Venta al Público/i)).toBeVisible()

    await expect(page.getByText(COSTO_TEXT)).toHaveCount(0)
    await expect(page.getByText(MARGEN_TEXT)).toHaveCount(0)
    await expect(page.getByText(/simulador financiero/i)).toHaveCount(0)
  })
})

test.describe('TC-RBAC-02: Intercepción de ruta administrativa /insumos (issue #127)', () => {
  test('forzar la navegación a /insumos redirige de inmediato a /productos', async ({ page }) => {
    await page.goto('/insumos')

    await expect(page).toHaveURL(/\/productos$/)
    // Confirma que la redirección no dejó ningún resto del contenido de
    // Insumos montado (que AdminOnlyRoute reemplazó el árbol, no solo navegó).
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

    // Deja un margen para que las promesas de response.json() (asíncronas,
    // fuera del ciclo de vida que Playwright espera automáticamente) terminen
    // de resolver antes de inspeccionar los arrays acumulados.
    await page.waitForTimeout(1000)

    // Control positivo: si esto da 0, el filtro de URL/content-type está mal
    // y las aserciones de "no hay fuga" de abajo serían un falso positivo.
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
