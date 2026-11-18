import '@testing-library/jest-dom'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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

    const dialog = await screen.findByRole('dialog', { name: '¿Cambiar proveedor predeterminado?' })
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
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
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
})