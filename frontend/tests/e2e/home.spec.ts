import { test, expect } from '@playwright/test'

test.describe('Landing Page — Casos Reales y Reglas de Negocio', () => {
  test('MargenX carga correctamente y expone el título institucional', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/MargenX/i)
  })

  test('Gherkin: Validación visual de casos reales en Landing Page', async ({ page }) => {
    await page.goto('/')

    // 1. Criterio restrictivo: NO debe existir ninguna mención a "Hamburguesa Doble"
    await expect(page.getByText(/hamburguesa doble/i)).toHaveCount(0)

    // 2. Referencias explícitas a los comercios piloto reales
    await expect(page.getByText(/Panadería Central/i).first()).toBeVisible()
    await expect(page.getByText(/Química GyJ/i).first()).toBeVisible()

    // 3. Fichas técnicas reales de Panadería Central (valores seed post-#178)
    await expect(page.getByText(/Medialunas de manteca/i)).toBeVisible()
    await expect(page.getByText(/3\.616,25/i)).toBeVisible()
    await expect(page.getByText(/Bizcochitos de grasa/i)).toBeVisible()
    await expect(page.getByText(/1\.662,69/i)).toBeVisible()

    // 4. Interacción con el selector de pilotos: conmutar a Química GyJ
    await page.getByRole('button', { name: /química/i }).click()
    await expect(page.getByText(/Detergente \(Magistral\)/i)).toBeVisible()
    await expect(page.getByText(/316,30/i)).toBeVisible()
    await expect(page.getByText(/Suavizante \(Vivere/i)).toBeVisible()
    await expect(page.getByText(/539,28/i)).toBeVisible()

    // 5. Sección de valor diferencial: Ingesta Zero-Click con patrón de casilla virtual
    await expect(page.getByText(/precios\+panaderia-central@margenx\.tech/i)).toBeVisible()
    await expect(page.getByText(/Filtro Anti-Polución/i)).toBeVisible()

    // 6. Sección de valor diferencial: Seguridad RBAC (Dueño vs. Colaborador)
    await expect(page.getByText(/Dueño \(Admin\)/i)).toBeVisible()
    await expect(page.getByText(/Colaborador \(Caja\)/i)).toBeVisible()

    // 7. Sección de valor diferencial: Calculadora de empaques mayoristas
    await expect(page.getByText(/Calculadora de empaques mayoristas/i)).toBeVisible()
    await expect(page.getByText(/720,00/i)).toBeVisible()
  })
})