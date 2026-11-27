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
    await expect(page.getByText(/Precio de venta al público/i)).toBeVisible()

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
    await expect(page.getByText(/Precio de venta al público/i)).toBeVisible()

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

test.describe('TC-RBAC-04: Intercepción de ruta administrativa /productos/nuevo', () => {
  test('forzar la navegación a /productos/nuevo redirige de inmediato a /productos', async ({ page }) => {
    // Se intenta acceder directamente a la ruta de creación de productos,
    // la cual ahora está protegida por AdminOnlyRoute.
    await page.goto('/productos/nuevo')

    // El colaborador debe ser redirigido al catálogo de productos.
    await expect(page).toHaveURL(/\/productos$/)

    // Confirma que la redirección fue efectiva y no se renderizó el formulario de alta.
    await expect(page.getByRole('heading', { name: /nuevo producto/i })).toHaveCount(0)
  })
})
test.describe('TC-RBAC-05: Intercepción de ruta administrativa /proveedores (issue #249)', () => {
  test('forzar la navegación a /proveedores redirige a /productos y el menú no ofrece el enlace', async ({ page }) => {
    await page.goto('/proveedores')

    await expect(page).toHaveURL(/\/productos$/)
    // AdminOnlyRoute reemplazó el árbol: no quedó montada la pantalla de proveedores.
    await expect(page.getByRole('heading', { name: /^proveedores$/i })).toHaveCount(0)
    // Ni la barra de escritorio ni el menú inferior muestran "Proveedores" al colaborador.
    await expect(page.getByRole('link', { name: 'Proveedores' })).toHaveCount(0)
    await expect(page.getByTestId('bottom-nav-proveedores')).toHaveCount(0)
  })
})

test.describe('TC-RBAC-06: Bandeja de cuarentena y dirección de ingesta (issue #251)', () => {
  test('forzar la navegación a /proveedores/cuarentena redirige a /productos sin mostrar la bandeja ni la dirección de ingesta', async ({ page }) => {
    await page.goto('/proveedores/cuarentena')

    await expect(page).toHaveURL(/\/productos$/)
    // Control positivo: el catálogo del colaborador cargó, así que las ausencias de abajo no son por una página en blanco.
    await expect(page.locator('tbody tr').first()).toBeVisible()

    // AdminOnlyRoute reemplazó el árbol: ni la bandeja ni sus pestañas quedaron montadas.
    await expect(page.getByRole('heading', { name: /precios en cuarentena/i })).toHaveCount(0)
    await expect(page.getByRole('navigation', { name: 'Secciones de proveedores' })).toHaveCount(0)
    // La dirección precios-<slug>@margenx.tech es solo para el administrador (GET /api/auth/me no le envía el slug).
    await expect(page.getByText(/precios[-.+][a-z0-9-]+@margenx\.tech/i)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Copiar dirección' })).toHaveCount(0)
  })
})

test.describe('TC-RBAC-07: Intercepción de ruta administrativa /compras (issue #389)', () => {
  test('forzar la navegación a /compras redirige a /productos y el menú no ofrece el enlace', async ({ page }) => {
    await page.goto('/compras')

    await expect(page).toHaveURL(/\/productos$/)
    // AdminOnlyRoute reemplazó el árbol: no quedó montada la pantalla de impacto en el margen (#446).
    await expect(page.getByRole('heading', { name: /impacto en el margen/i })).toHaveCount(0)
    // Ni la barra de escritorio ni el menú inferior muestran "Impacto en el margen" al colaborador.
    await expect(page.getByRole('link', { name: 'Impacto en el margen' })).toHaveCount(0)
    await expect(page.getByTestId('bottom-nav-compras')).toHaveCount(0)
  })
})

test.describe('TC-RBAC-08: Aviso al colaborador redirigido desde una ruta del administrador (issue #364)', () => {
  const AVISO = 'Esa pantalla es solo para el administrador'

  for (const ruta of ['/insumos', '/proveedores/cuarentena', '/productos/nuevo']) {
    test(`abrir ${ruta} vuelve a /productos con el aviso de que la pantalla es del administrador`, async ({ page }) => {
      await page.goto(ruta)

      await expect(page).toHaveURL(/\/productos$/)
      // El aviso es informativo: se anuncia como role="status", no como alerta.
      await expect(page.getByRole('status').filter({ hasText: AVISO })).toBeVisible()
    })
  }

  test('el aviso no se repite al recargar /productos', async ({ page }) => {
    await page.goto('/insumos')
    await expect(page.getByRole('status').filter({ hasText: AVISO })).toBeVisible()

    await page.reload()
    // Control positivo: el catálogo cargó, así que la ausencia del aviso no es por una página en blanco.
    await expect(page.locator('tbody tr').first()).toBeVisible()
    await expect(page.getByText(AVISO)).toHaveCount(0)
  })
})

test.describe('TC-RBAC-09: El colaborador solo ve productos a la venta (issue #428)', () => {
  test('el catálogo y el panel no muestran precios de $0,00 y la API no le manda borradores', async ({ page }) => {
    const productos: Array<{ name?: string; salePrice?: unknown; ingredients?: unknown[] }> = []
    page.on('response', async (response: Response) => {
      const url = new URL(response.url())
      if (!/^\/api\/products\/?$/.test(url.pathname) || !response.ok()) return
      const body = (await response.json().catch(() => null)) as { data?: typeof productos } | null
      productos.push(...(body?.data ?? []))
    })

    await page.goto('/productos')
    // Control positivo: el catálogo cargó, así que la ausencia de $0,00 no es por una lista vacía.
    await expect(page.locator('tbody tr').first()).toBeVisible()
    await expect(page.getByText(/\$\s?0,00/)).toHaveCount(0)

    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: /hola, colaborador/i })).toBeVisible()
    await expect(page.getByText(/\$\s?0,00/)).toHaveCount(0)

    expect(productos.length).toBeGreaterThan(0)
    for (const producto of productos) {
      expect(Number(producto.salePrice), producto.name).toBeGreaterThan(0)
      expect(producto.ingredients?.length ?? 0, producto.name).toBeGreaterThan(0)
    }
  })
})
