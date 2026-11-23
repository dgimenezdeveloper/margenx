import '@testing-library/jest-dom'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import PurchasesPage from './page'
import { purchasingService } from '@/services/purchasingService'
import { supplierService } from '@/services/supplierService'
import { ApiError } from '@/services/api'

const mockGetToken = vi.fn().mockResolvedValue('token-compras')

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    getToken: mockGetToken,
    signOut: vi.fn(),
  }),
}))

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ role: 'ADMIN', isAdmin: true, isCollaborator: false, isLoading: false }),
}))

vi.mock('@/lib/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: { id: 'u1', role: 'ADMIN', email: 'admin@panaderia.com' },
    businessName: 'Panadería Central',
    isLoading: false,
  }),
}))

vi.mock('@/services/purchasingService', () => ({
  purchasingService: {
    getSuggestions: vi.fn(),
    previewOrder: vi.fn(),
  },
}))

vi.mock('@/services/supplierService', () => ({
  supplierService: {
    addPackaging: vi.fn(),
  },
}))

const mockSuggestionsPayload = {
  summary: {
    withSavingsCount: 1,
    alreadyBestPriceCount: 2,
    singleSupplierCount: 7,
    withoutEligibleSupplierCount: 0,
    withoutActiveDefaultCount: 0,
    quarantinedExcludedCount: 1,
  },
  byIngredient: [
    {
      ingredientId: 'ing-harina',
      ingredientName: 'Harina 000',
      unit: 'kg',
      currentCost: '900.00',
      defaultPresentation: {
        supplierIngredientId: 'si-molino',
        supplierId: 'sup-molino',
        supplierName: 'Molino Cañuelas',
        supplierCode: 'MC-990',
        rawDescription: null,
        packageSize: '50',
        packageUnit: 'kg',
        packagePrice: '45000.00',
        unitCost: '900.00',
      },
      cheapestPresentation: {
        supplierIngredientId: 'si-centro',
        supplierId: 'sup-centro',
        supplierName: 'Distribuidora del Centro',
        supplierCode: '5521',
        rawDescription: null,
        packageSize: '25',
        packageUnit: 'kg',
        packagePrice: '22000.00',
        unitCost: '880.00',
      },
      savingsPerUnit: '20.00',
      savingsPercent: '2.22',
      packageSavings: '500.00',
    },
  ],
  bySupplier: [
    {
      supplierId: 'sup-centro',
      supplierName: 'Distribuidora del Centro',
      contactPhone: '+54 11 4000-2000',
      email: 'ventas@centro.example',
      address: null,
      itemsCount: 1,
      totalPackageSavings: '500.00',
      items: [
        {
          ingredientId: 'ing-harina',
          ingredientName: 'Harina 000',
          unit: 'kg',
          supplierIngredientId: 'si-centro',
          supplierCode: '5521',
          rawDescription: null,
          packageSize: '25',
          packageUnit: 'kg',
          packagePrice: '22000.00',
          unitCost: '880.00',
          defaultUnitCost: '900.00',
          defaultSupplierName: 'Molino Cañuelas',
          savingsPerUnit: '20.00',
          savingsPercent: '2.22',
          packageSavings: '500.00',
        },
      ],
    },
  ],
  alreadyBestPrice: [],
  singleSupplier: [],
  quarantinedExcluded: [],
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/compras']}>
      <PurchasesPage />
    </MemoryRouter>
  )
}

describe('PurchasesPage (/compras)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(purchasingService.getSuggestions).mockResolvedValue(mockSuggestionsPayload)
  })

  it('Escenario Gherkin "Sugerir compra": muestra la Harina bajo Distribuidora del Centro con ahorro de $20,00 (2,22 %)', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Compras Sugeridas' })).toBeInTheDocument()
    expect(screen.getByText('Distribuidora del Centro')).toBeInTheDocument()
    expect(screen.getByText('Harina 000')).toBeInTheDocument()
    expect(screen.getByText(/-?\$20,00\/kg \(2,2 %\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Ahorro bulto: \$500,00/i)).toBeInTheDocument()
  })

  it('muestra las tarjetas de resumen y enlace a Cuarentena si hay ítems excluidos', async () => {
    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Compras Sugeridas' })

    const withSavingsCard = screen.getByText('Con Ahorro Disponible').parentElement as HTMLElement
    expect(within(withSavingsCard).getByText('1')).toBeInTheDocument()

    const bestPriceCard = screen.getByText('Al Mejor Precio').parentElement as HTMLElement
    expect(within(bestPriceCard).getByText('2')).toBeInTheDocument()

    const quarantineCard = screen.getByText('Excluidos (Cuarentena)').parentElement as HTMLElement
    expect(within(quarantineCard).getByText('1')).toBeInTheDocument()

    const quarantineNotice = screen.getByText(/presentación\(es\) retenida\(s\) en cuarentena/i)
    expect(quarantineNotice).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver Cuarentena' })).toHaveAttribute(
      'href',
      '/proveedores/cuarentena'
    )
  })

  it('Escenario Gherkin "Pedido": carga 2 bultos, calcula pedido y muestra subtotales y ahorro', async () => {
    const mockOrderPreview = {
      groups: [
        {
          supplierId: 'sup-centro',
          supplierName: 'Distribuidora del Centro',
          contactPhone: '+54 11 4000-2000',
          email: null,
          address: null,
          subtotal: '44000.00',
          savings: '1000.00',
          items: [
            {
              supplierIngredientId: 'si-centro',
              ingredientId: 'ing-harina',
              ingredientName: 'Harina 000',
              unit: 'kg',
              supplierCode: '5521',
              rawDescription: null,
              packageSize: '25',
              packageUnit: 'kg',
              packagePrice: '22000.00',
              unitCost: '880.00',
              packages: 2,
              totalQuantity: '50',
              subtotal: '44000.00',
              defaultUnitCost: '900.00',
              savings: '1000.00',
            },
          ],
        },
      ],
      total: '44000.00',
      totalSavings: '1000.00',
      totalPackages: 2,
      itemsCount: 1,
    }
    vi.mocked(purchasingService.previewOrder).mockResolvedValue(mockOrderPreview)

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Compras Sugeridas' })

    const qtyInput = screen.getByLabelText('Bultos de Harina 000')
    fireEvent.change(qtyInput, { target: { value: '2' } })

    const calculateBtn = screen.getByRole('button', { name: /Calcular pedido sugerido/i })
    fireEvent.click(calculateBtn)

    await waitFor(() => {
      expect(purchasingService.previewOrder).toHaveBeenCalledWith(expect.any(Function), [
        { supplierIngredientId: 'si-centro', packages: 2 },
      ])
    })

    expect(await screen.findByText('Previsualización del Pedido Semanal')).toBeInTheDocument()
    expect(screen.getAllByText('$44.000,00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('$1.000,00').length).toBeGreaterThan(0)
  })

  it('permite copiar la orden generada al portapapeles', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: writeTextMock }, configurable: true })

    vi.mocked(purchasingService.previewOrder).mockResolvedValue({
      groups: [
        {
          supplierId: 'sup-centro',
          supplierName: 'Distribuidora del Centro',
          contactPhone: '+54 11 4000-2000',
          email: null,
          address: null,
          subtotal: '22000.00',
          savings: '500.00',
          items: [
            {
              supplierIngredientId: 'si-centro',
              ingredientId: 'ing-harina',
              ingredientName: 'Harina 000',
              unit: 'kg',
              supplierCode: '5521',
              rawDescription: null,
              packageSize: '25',
              packageUnit: 'kg',
              packagePrice: '22000.00',
              unitCost: '880.00',
              packages: 1,
              totalQuantity: '25',
              subtotal: '22000.00',
              defaultUnitCost: '900.00',
              savings: '500.00',
            },
          ],
        },
      ],
      total: '22000.00',
      totalSavings: '500.00',
      totalPackages: 1,
      itemsCount: 1,
    })

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Compras Sugeridas' })
    fireEvent.click(screen.getByRole('button', { name: /Calcular pedido sugerido/i }))

    const copyBtn = await screen.findByRole('button', { name: /Copiar pedido/i })
    fireEvent.click(copyBtn)

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalled()
    })
    expect(await screen.findByText(/Pedido copiado al portapapeles/i)).toBeInTheDocument()
  })

  it('permite conmutar la presentación como predeterminada tras confirmación modal anunciando al proveedor sugerido', async () => {
    vi.mocked(supplierService.addPackaging).mockResolvedValue({
      supplierIngredient: {
        id: 'si-centro',
        supplierId: 'sup-centro',
        ingredientId: 'ing-harina',
        packageSize: 25,
        packageUnit: 'kg',
        packagePrice: 22000,
        isDefault: true,
      },
      unitCost: 880,
    })

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Compras Sugeridas' })
    const makeDefaultBtn = screen.getByRole('button', { name: /Hacer predeterminada/i })
    fireEvent.click(makeDefaultBtn)

    const dialog = await screen.findByRole('dialog', { name: '¿Cambiar la presentación predeterminada?' })
    expect(within(dialog).getByText('Distribuidora del Centro')).toBeInTheDocument()

    const confirmBtn = within(dialog).getByRole('button', { name: 'Confirmar cambio' })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(supplierService.addPackaging).toHaveBeenCalledWith(
        expect.any(Function),
        'sup-centro',
        expect.objectContaining({
          ingredientId: 'ing-harina',
          isDefault: true,
        })
      )
    })
    expect(await screen.findByText(/establecida como predeterminada/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(purchasingService.getSuggestions).toHaveBeenCalledTimes(2)
    })
    // Terminó la recarga: ya no queda el esqueleto de carga (el aviso de éxito también es role="status").
    await waitFor(() => {
      const carga = screen.queryAllByRole('status').filter((el) => !el.textContent?.includes('predeterminada'))
      expect(carga).toHaveLength(0)
    })
    expect(screen.getByText('Distribuidora del Centro')).toBeInTheDocument()
  })

  it('presenta ErrorState ante falla de carga y permite reintentar', async () => {
    vi.mocked(purchasingService.getSuggestions).mockRejectedValueOnce(
      new ApiError('Error al cargar datos del servidor', 500)
    )

    renderPage()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Error al cargar sugerencias de compra')).toBeInTheDocument()

    vi.mocked(purchasingService.getSuggestions).mockResolvedValueOnce(mockSuggestionsPayload)
    const retryBtn = screen.getByRole('button', { name: /reintentar/i })
    fireEvent.click(retryBtn)

    expect(await screen.findByRole('heading', { level: 1, name: 'Compras Sugeridas' })).toBeInTheDocument()
  })

  it('valida que no se calculen pedidos con más de 100.000 bultos por ítem', async () => {
    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Compras Sugeridas' })

    const qtyInput = screen.getByLabelText('Bultos de Harina 000')
    fireEvent.change(qtyInput, { target: { value: '100001' } })

    const calculateBtn = screen.getByRole('button', { name: /Calcular pedido sugerido/i })
    fireEvent.click(calculateBtn)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El campo "bultos" no puede superar los 100.000 bultos por ítem.'
    )
    expect(purchasingService.previewOrder).not.toHaveBeenCalled()
  })

  it('muestra el esqueleto de carga mientras llegan las sugerencias', async () => {
    let resolve: (value: typeof mockSuggestionsPayload) => void = () => {}
    vi.mocked(purchasingService.getSuggestions).mockReturnValueOnce(
      new Promise((r) => {
        resolve = r
      })
    )

    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent('Cargando sugerencias de compras...')
    resolve(mockSuggestionsPayload)
    expect(await screen.findByText('Distribuidora del Centro')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('estado vacío: sin comparativas invita a cargar dos proveedores y lleva a Proveedores', async () => {
    vi.mocked(purchasingService.getSuggestions).mockResolvedValueOnce({
      ...mockSuggestionsPayload,
      summary: {
        ...mockSuggestionsPayload.summary,
        withSavingsCount: 0,
        alreadyBestPriceCount: 0,
        singleSupplierCount: 0,
        quarantinedExcludedCount: 0,
      },
      byIngredient: [],
      bySupplier: [],
    })

    render(
      <MemoryRouter initialEntries={['/compras']}>
        <Routes>
          <Route path="/compras" element={<PurchasesPage />} />
          <Route path="/proveedores" element={<p>Pantalla de proveedores</p>} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('No hay comparativas de compra disponibles')).toBeInTheDocument()
    expect(screen.getByText(/Cargá al menos dos proveedores para un mismo insumo/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Calcular pedido sugerido/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ir a Proveedores' }))
    expect(await screen.findByText('Pantalla de proveedores')).toBeInTheDocument()
  })

  it('sin ahorro disponible informa que todo está al costo óptimo y no ofrece calcular pedido', async () => {
    vi.mocked(purchasingService.getSuggestions).mockResolvedValueOnce({
      ...mockSuggestionsPayload,
      summary: { ...mockSuggestionsPayload.summary, withSavingsCount: 0, quarantinedExcludedCount: 0 },
      byIngredient: [],
      bySupplier: [],
    })

    renderPage()

    expect(await screen.findByText('¡Todos tus insumos están al costo óptimo!')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Calcular pedido sugerido/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver Cuarentena' })).not.toBeInTheDocument()
  })

  it('aclara que consultar la pantalla no modifica costos ni recetas', async () => {
    renderPage()

    expect(await screen.findByText(/no modifica tus costos vigentes ni tus recetas/i)).toBeInTheDocument()
    expect(supplierService.addPackaging).not.toHaveBeenCalled()
  })

  it('muestra la lista como tabla con encabezados de columna (vista desde md)', async () => {
    renderPage()

    const table = await screen.findByRole('table', { name: /Insumos que conviene comprarle a Distribuidora del Centro/i })
    const headers = within(table).getAllByRole('columnheader').map((th) => th.textContent)
    expect(headers).toEqual(['Insumo', 'Bulto', 'Costo unitario', 'Ahorro', 'Bultos', 'Acción'])
    expect(within(table).getByText('SKU: 5521')).toBeInTheDocument()
    expect(within(table).getByText(/Sugerido:/)).toHaveTextContent('Sugerido: $880,00/kg vs actual $900,00/kg (Molino Cañuelas)')
  })

  it('no calcula el pedido si todos los ítems quedan en 0 bultos', async () => {
    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Compras Sugeridas' })
    fireEvent.change(screen.getByLabelText('Bultos de Harina 000'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: /Calcular pedido sugerido/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ingresá al menos 1 bulto en los insumos que deseás incluir en el pedido.'
    )
    expect(purchasingService.previewOrder).not.toHaveBeenCalled()
  })

  it('muestra el error de la API si falla el cálculo del pedido', async () => {
    vi.mocked(purchasingService.previewOrder).mockRejectedValueOnce(
      new ApiError('La presentación indicada no pertenece a la cuenta', 400)
    )

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Compras Sugeridas' })
    fireEvent.click(screen.getByRole('button', { name: /Calcular pedido sugerido/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('La presentación indicada no pertenece a la cuenta')
    expect(screen.queryByText('Previsualización del Pedido Semanal')).not.toBeInTheDocument()
  })

  it('el pedido muestra subtotal por proveedor, cantidad convertida y copia el texto por proveedor', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: writeTextMock }, configurable: true })
    vi.mocked(purchasingService.previewOrder).mockResolvedValueOnce({
      groups: [
        {
          supplierId: 'sup-centro',
          supplierName: 'Distribuidora del Centro',
          contactPhone: '+54 11 4000-2000',
          email: 'ventas@centro.example',
          address: null,
          subtotal: '44000.00',
          savings: '1000.00',
          items: [
            {
              supplierIngredientId: 'si-centro',
              ingredientId: 'ing-harina',
              ingredientName: 'Harina 000',
              unit: 'kg',
              supplierCode: '5521',
              rawDescription: null,
              packageSize: '25',
              packageUnit: 'kg',
              packagePrice: '22000.00',
              unitCost: '880.00',
              packages: 2,
              totalQuantity: '50.000',
              subtotal: '44000.00',
              defaultUnitCost: '900.00',
              savings: '1000.00',
            },
          ],
        },
      ],
      total: '44000.00',
      totalSavings: '1000.00',
      totalPackages: 2,
      itemsCount: 1,
    })

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Compras Sugeridas' })
    fireEvent.change(screen.getByLabelText('Bultos de Harina 000'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: /Calcular pedido sugerido/i }))

    const preview = await screen.findByRole('region', { name: 'Previsualización del Pedido Semanal' })
    expect(within(preview).getByText('Subtotal: $44.000,00')).toBeInTheDocument()
    expect(within(preview).getByText('Ahorro: $1.000,00')).toBeInTheDocument()
    expect(within(preview).getByText(/2 bulto\(s\) \(50 kg\)/)).toBeInTheDocument()

    fireEvent.click(within(preview).getByRole('button', { name: /Copiar pedido/i }))
    await waitFor(() => expect(writeTextMock).toHaveBeenCalledTimes(1))
    const copied = writeTextMock.mock.calls[0][0] as string
    expect(copied).toContain('Proveedor: Distribuidora del Centro')
    expect(copied).toContain('Tel: +54 11 4000-2000')
    expect(copied).toContain('Email: ventas@centro.example')
    expect(copied).toContain('Harina 000 [SKU: 5521]: 2 bulto(s) de 25 kg ($22.000,00 c/u) = $44.000,00')
    expect(copied).toContain('Total estimado: $44.000,00 (Ahorro calculado: $1.000,00)')
  })

  it('avisa si el navegador no deja copiar el pedido', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')) },
      configurable: true,
    })
    vi.mocked(purchasingService.previewOrder).mockResolvedValueOnce({
      groups: [],
      total: '0.00',
      totalSavings: '0.00',
      totalPackages: 0,
      itemsCount: 0,
    })

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Compras Sugeridas' })
    fireEvent.click(screen.getByRole('button', { name: /Calcular pedido sugerido/i }))
    fireEvent.click(await screen.findByRole('button', { name: /Copiar pedido/i }))

    expect(await screen.findByText(/No se pudo copiar automáticamente/i)).toBeInTheDocument()
  })

  it('Imprimir abre el diálogo del navegador y la lista de sugerencias no se imprime', async () => {
    const printMock = vi.fn()
    const originalPrint = window.print
    Object.defineProperty(window, 'print', { value: printMock, configurable: true, writable: true })
    vi.mocked(purchasingService.previewOrder).mockResolvedValueOnce({
      groups: [],
      total: '0.00',
      totalSavings: '0.00',
      totalPackages: 0,
      itemsCount: 0,
    })

    renderPage()

    const table = await screen.findByRole('table')
    const list = table.closest('section')?.parentElement as HTMLElement
    expect(list).not.toHaveClass('print:hidden')

    fireEvent.click(screen.getByRole('button', { name: /Calcular pedido sugerido/i }))
    fireEvent.click(await screen.findByRole('button', { name: /Imprimir/i }))

    expect(printMock).toHaveBeenCalledTimes(1)
    expect(list).toHaveClass('print:hidden')
    Object.defineProperty(window, 'print', { value: originalPrint, configurable: true, writable: true })
  })

  it('si falla "Hacer predeterminada" avisa el error, no recarga y deja el diálogo abierto', async () => {
    vi.mocked(supplierService.addPackaging).mockRejectedValueOnce(
      new ApiError('La presentación está en cuarentena', 409)
    )

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Compras Sugeridas' })
    fireEvent.click(screen.getByRole('button', { name: /Hacer predeterminada/i }))
    const dialog = await screen.findByRole('dialog', { name: '¿Cambiar la presentación predeterminada?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar cambio' }))

    expect(await screen.findByText('La presentación está en cuarentena')).toBeInTheDocument()
    expect(purchasingService.getSuggestions).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog', { name: '¿Cambiar la presentación predeterminada?' })).toBeInTheDocument()
  })
})