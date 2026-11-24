import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 360, height: 740 } })

test.describe('TC-LAYOUT-360PX: Diálogos móviles y barra de producto sin desbordes (Issue #355)', () => {
  test('TC-LAYOUT-01: Ficha de insumo con múltiples proveedores no desborda el viewport y mantiene encabezado fijo y scroll funcional', async ({ page }) => {
    await page.goto('/insumos')

    // Abrir la ficha de "Harina de trigo 000 Olavarriense" (posee múltiples proveedores en el seed)
    const supplyBtn = page.getByRole('button', { name: /Harina de trigo 000 Olavarriense/i })
    await expect(supplyBtn).toBeVisible()
    await supplyBtn.click()

    const sheet = page.getByRole('dialog')
    await expect(sheet).toBeVisible()

    // 1. El título "Editar insumo" y el botón de cerrar deben ser completamente visibles en el viewport (sin quedar desbordados hacia arriba)
    const title = sheet.getByRole('heading', { name: /Editar insumo/i })
    await expect(title).toBeInViewport()

    const closeBtn = sheet.getByRole('button', { name: /Cerrar modal/i })
    await expect(closeBtn).toBeInViewport()

    // 2. Comprobar que el bounding box del modal no desborde negativamente hacia arriba (top >= 0)
    const box = await sheet.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.y).toBeGreaterThanOrEqual(0)
    expect(box!.height).toBeLessThanOrEqual(740)

    // 3. El botón "Guardar cambios" está dentro del diálogo y accesible (fijo en el footer)
    const saveBtn = sheet.getByRole('button', { name: /Guardar cambios/i })
    await expect(saveBtn).toBeInViewport()

    // 4. Captura de evidencia en resolución 360px
    await page.screenshot({ path: 'test-results/evidencia-360px/insumos-sheet-360px.png', fullPage: true })

    await closeBtn.click()
    await expect(sheet).not.toBeVisible()
  })

  test('TC-LAYOUT-02: Ficha de producto a 360 px muestra ProductMobileFooter en 2 filas sin solapar MarginBadge ni tapar BottomNav', async ({ page }) => {
    await page.goto('/productos')

    // Acceder a la ficha de "Pan flauta — 1 kg"
    const productLink = page.getByRole('link', { name: /Pan flauta — 1 kg/i })
    await expect(productLink).toBeVisible()
    await productLink.click()
    await expect(page).toHaveURL(/\/productos\/.+/)

    // Verificar que el footer móvil fijo esté visible
    const footer = page.locator('footer.fixed')
    await expect(footer).toBeVisible()

    // 1. El badge de rentabilidad está visible en la primera fila de datos
    const badge = footer.getByText(/Borrador|Pérdida|En riesgo|En objetivo|Superávit/i).first()
    await expect(badge).toBeVisible()

    // 2. Los botones de acción "Ajustar" y "Guardar" están en la segunda fila
    const adjustBtn = footer.getByRole('button', { name: /Ajustar/i })
    const saveBtn = footer.getByRole('button', { name: /Guardar/i })
    await expect(adjustBtn).toBeVisible()
    await expect(saveBtn).toBeVisible()

    // 3. Validar geométricamente que el badge de rentabilidad esté ubicado verticalmente por encima de los botones (sin solapamiento)
    const badgeBox = await badge.boundingBox()
    const adjustBox = await adjustBtn.boundingBox()
    expect(badgeBox).not.toBeNull()
    expect(adjustBox).not.toBeNull()
    expect(badgeBox!.y + badgeBox!.height).toBeLessThanOrEqual(adjustBox!.y)

    // 4. BottomNav permanece accesible por debajo
    const navItem = page.getByTestId('bottom-nav-productos')
    await expect(navItem).toBeVisible()

    // 5. Captura de evidencia
    await page.screenshot({ path: 'test-results/evidencia-360px/producto-footer-360px.png', fullPage: true })
  })
})
test.describe('TC-LAYOUT-MENU: menú inferior con "Más" y panel lateral (Issue #437)', () => {
  test.use({ hasTouch: true })

  test('TC-LAYOUT-03: el menú inferior muestra 4 pestañas y "Más" con los rótulos completos, y "Más" abre el panel con todas las pantallas', async ({ page }) => {
    await page.goto('/dashboard')

    const menu = page.getByRole('navigation', { name: 'Menú inferior' })
    await expect(menu.getByRole('link')).toHaveText(['Inicio', 'Productos', 'Insumos', 'Ventas'])
    // Ningún rótulo queda cortado con "…".
    for (const rotulo of await menu.locator('a span, button span').all()) {
      expect(await rotulo.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    }

    const mas = menu.getByRole('button', { name: 'Más' })
    await mas.click()
    const panel = page.getByRole('dialog', { name: 'Menú' })
    await expect(panel.getByRole('link')).toHaveText(['Inicio', 'Productos', 'Insumos', 'Ventas', 'Proveedores', 'Impacto en el margen', 'Perfil'])
    await expect(panel.getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page')
    await expect(panel).toBeInViewport()
    await page.screenshot({ path: 'test-results/evidencia-360px/menu-panel-360px.png' })

    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await expect(mas).toBeFocused()
  })

  test('TC-LAYOUT-04: arrastrar el dedo hacia la derecha desde el medio de la pantalla abre el panel y arrastrarlo a la izquierda lo cierra', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('navigation', { name: 'Menú inferior' })).toBeVisible()

    // Toques reales de Chromium: Playwright no trae un arrastre táctil propio.
    const cdp = await page.context().newCDPSession(page)
    const deslizar = async (desde: number, hasta: number, y: number) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: desde, y }] })
      const pasos = 8
      for (let i = 1; i <= pasos; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: desde + ((hasta - desde) * i) / pasos, y }] })
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    }

    await deslizar(120, 320, 400)
    const panel = page.getByRole('dialog', { name: 'Menú' })
    await expect(panel).toBeVisible()
    await expect(panel.getByRole('link', { name: 'Proveedores' })).toBeInViewport()
    // Terminó de abrirse (sin desplazamiento): recién ahí se arrastra para cerrarlo.
    await expect(panel).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)')

    await deslizar(250, 20, 400)
    await expect(panel).toBeHidden()
  })
})
