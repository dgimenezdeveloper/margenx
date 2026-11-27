import { test, expect, type Page } from '@playwright/test'

/**
 * TC-PRODUCTOS-AVISO (issue #432), con la sesión de ADMIN: al crear o eliminar un producto,
 * el aviso se ve en la lista después de redirigir, en lugar de perderse con la pantalla.
 * Crea un producto sin receta (borrador) y lo elimina al final, así no deja datos.
 */

/** En escritorio la fila es `tr[role="button"]`; en el celular, la tarjeta es un enlace. */
function productItem(page: Page, name: string) {
  return page.getByRole('button', { name: new RegExp(name) }).or(page.getByRole('link', { name: new RegExp(name) }))
}

test.describe('TC-PRODUCTOS-AVISO: avisos de crear y eliminar un producto (#432)', () => {
  test('el aviso de producto creado y el de producto eliminado se ven en la lista', async ({ page }) => {
    const name = `Pan de campo de prueba E2E ${Date.now()}`

    await test.step('crea un producto sin receta y ve el aviso en la lista', async () => {
      await page.goto('/productos/nuevo')
      await page.getByLabel(/Nombre del producto/).fill(name)
      await page.getByLabel('Precio de venta').fill('4500')
      await page.getByRole('button', { name: 'Guardar producto' }).locator('visible=true').first().click()

      await expect(page).toHaveURL(/\/productos$/)
      await expect(page.getByRole('status').filter({ hasText: 'Producto guardado en estado Borrador (sin receta).' })).toBeVisible()
    })

    await test.step('lo elimina desde la ficha y ve el aviso en la lista', async () => {
      await page.getByLabel('Buscar productos por nombre').fill(name)
      await productItem(page, name).first().click()
      await expect(page).toHaveURL(/\/productos\/[0-9a-f-]+$/)

      await page.getByRole('button', { name: /Eliminar producto/ }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Sí, eliminar' }).click()

      await expect(page).toHaveURL(/\/productos$/)
      await expect(page.getByRole('status').filter({ hasText: 'Producto eliminado correctamente.' })).toBeVisible()
      await page.getByLabel('Buscar productos por nombre').fill(name)
      await expect(productItem(page, name)).toHaveCount(0)
    })
  })
})
