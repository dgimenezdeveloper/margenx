import '@testing-library/jest-dom'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import PurchasesPage from './page'
import {
  purchasingService,
  type IngredientMarginImpact,
  type MarginImpactResponse,
} from '@/services/purchasingService'
import { supplierService } from '@/services/supplierService'
import { ingredientService } from '@/services/ingredientService'
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
    getMarginImpact: vi.fn(),
    getIngredientMarginImpact: vi.fn(),
  },
}))

vi.mock('@/services/supplierService', () => ({
  supplierService: {
    addPackaging: vi.fn(),
    getQuarantine: vi.fn(),
  },
}))

vi.mock('@/services/ingredientService', () => ({
  ingredientService: {
    getById: vi.fn(),
  },
}))

// Datos con la forma de docs/api.md §10 (GET /api/purchasing/margin-impact), con insumos y
// productos de Panadería Central.
const harinaImpact: IngredientMarginImpact = {
  ingredientId: 'ing-harina',
  ingredientName: 'Harina de trigo 000 Olavarriense',
  unit: 'kg',
  currentCost: '950.00',
  defaultPresentation: {
    supplierIngredientId: 'si-marjuanc',
    supplierName: 'Distribuidora MarJuanC Alimentos',
    unitCost: '950.00',
  },
  alternativePresentation: {
    supplierIngredientId: 'si-molinera',
    supplierName: 'Distribuidora Mayorista Molinera',
    unitCost: '880.00',
  },
  unitCostDifference: '70.00',
  productsAffectedCount: 2,
  productsLeavingRiskOrLossCount: 1,
  products: [
    {
      productId: 'prod-medialunas',
      productName: 'Medialunas de manteca x 12',
      salePrice: '6000.00',
      minMarginPercent: '35.00',
      currentRecipeCost: '3950.00',
      projectedRecipeCost: '3810.00',
      currentMarginAmount: '2050.00',
      projectedMarginAmount: '2190.00',
      currentMarginPercent: '34.17',
      projectedMarginPercent: '36.50',
      currentBucket: 'risk',
      projectedBucket: 'target',
    },
    {
      productId: 'prod-pan',
      productName: 'Pan de campo',
      salePrice: '4500.00',
      minMarginPercent: '30.00',
      currentRecipeCost: '1800.00',
      projectedRecipeCost: '1751.00',
      currentMarginAmount: '2700.00',
      projectedMarginAmount: '2749.00',
      currentMarginPercent: '60.00',
      projectedMarginPercent: '61.09',
      currentBucket: 'target',
      projectedBucket: 'surplus',
    },
  ],
}

const mantecaImpact: IngredientMarginImpact = {
  ingredientId: 'ing-manteca',
  ingredientName: 'Manteca La Serenísima',
  unit: 'kg',
  currentCost: '9800.00',
  defaultPresentation: null,
  alternativePresentation: {
    supplierIngredientId: 'si-lacteos',
    supplierName: 'Lácteos del Sur',
    unitCost: '9500.00',
  },
  unitCostDifference: '300.00',
  productsAffectedCount: 0,
  productsLeavingRiskOrLossCount: 0,
  products: [],
}

const marginImpactPayload: MarginImpactResponse = {
  summary: { ingredientsWithAlternative: 2, productsAffected: 2, productsLeavingRiskOrLoss: 1 },
  byIngredient: [harinaImpact, mantecaImpact],
}

const harinaDetail = {
  id: 'ing-harina',
  name: 'Harina de trigo 000 Olavarriense',
  unit: 'kg',
  currentCost: 950,
  supplierConnections: [
    {
      id: 'si-marjuanc',
      supplierId: 'sup-marjuanc',
      ingredientId: 'ing-harina',
      packageSize: 25,
      packageUnit: 'kg',
      packagePrice: 23750,
      isDefault: true,
      supplierCode: 'HAR188',
      rawDescription: 'HARINA 000 X 25 KG',
    },
    {
      id: 'si-molinera',
      supplierId: 'sup-molinera',
      ingredientId: 'ing-harina',
      packageSize: 25,
      packageUnit: 'kg',
      packagePrice: 22000,
      isDefault: false,
      supplierCode: 'MOL-000',
      rawDescription: 'HARINA 000 OLAV. 25 KG',
    },
  ],
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/compras']}>
      <Routes>
        <Route path="/compras" element={<PurchasesPage />} />
        <Route path="/proveedores" element={<p>Pantalla de proveedores</p>} />
      </Routes>
    </MemoryRouter>
  )
}

async function openHarinaConfirmation() {
  renderPage()
  await screen.findByRole('heading', { level: 1, name: 'Impacto en el margen' })
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Ya le compro a este proveedor: Harina de trigo 000 Olavarriense a Distribuidora Mayorista Molinera',
    })
  )
  return screen.findByRole('dialog', { name: '¿Ya le comprás a Distribuidora Mayorista Molinera?' })
}

describe('PurchasesPage (/compras, Impacto en el margen)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(purchasingService.getMarginImpact).mockResolvedValue(marginImpactPayload)
    vi.mocked(purchasingService.getIngredientMarginImpact).mockResolvedValue(harinaImpact)
    vi.mocked(supplierService.getQuarantine).mockResolvedValue([])
    vi.mocked(ingredientService.getById).mockResolvedValue(harinaDetail)
  })

  it('Escenario "Impacto visible": muestra el producto con el margen antes y después y el cambio de estado', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Impacto en el margen' })).toBeInTheDocument()
    const card = screen.getByRole('article', { name: 'Harina de trigo 000 Olavarriense' })

    expect(within(card).getByText('Distribuidora MarJuanC Alimentos')).toBeInTheDocument()
    expect(within(card).getByText('Distribuidora Mayorista Molinera')).toBeInTheDocument()
    expect(within(card).getByText(/\$70,00 menos por kg/)).toBeInTheDocument()

    const medialunas = within(card).getByRole('listitem', { name: 'Medialunas de manteca x 12' })
    expect(within(medialunas).getByText(/34,2\s%/)).toBeInTheDocument()
    expect(within(medialunas).getByText(/36,5\s%/)).toBeInTheDocument()
    expect(within(medialunas).getByText('En riesgo')).toBeInTheDocument()
    expect(within(medialunas).getByText('En objetivo')).toBeInTheDocument()
    expect(within(medialunas).getByText(/Sale de En riesgo/)).toBeInTheDocument()

    const pan = within(card).getByRole('listitem', { name: 'Pan de campo' })
    expect(within(pan).getByText('Superávit')).toBeInTheDocument()
    expect(within(pan).queryByText(/Sale de/)).not.toBeInTheDocument()
  })

  it('el resumen cuenta insumos con alternativa, productos que mejoran y los que salen de En riesgo o Pérdida', async () => {
    renderPage()

    const summary = await screen.findByRole('region', { name: 'Resumen del impacto' })
    expect(within(summary).getByText('Insumos con alternativa').parentElement).toHaveTextContent('2')
    expect(within(summary).getByText('Productos que mejoran').parentElement).toHaveTextContent('2')
    expect(within(summary).getByText('Salen de En riesgo o Pérdida').parentElement).toHaveTextContent('1')
  })

  it('respeta el orden de la API y explica los casos sin predeterminada y sin productos', async () => {
    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Impacto en el margen' })
    const cards = screen.getAllByRole('article')
    expect(cards.map((card) => card.getAttribute('aria-label'))).toEqual([
      'Harina de trigo 000 Olavarriense',
      'Manteca La Serenísima',
    ])

    const manteca = cards[1]!
    expect(within(manteca).getByText('Sin presentación predeterminada')).toBeInTheDocument()
    expect(within(manteca).getByText(/Ningún producto con receta usa este insumo/)).toBeInTheDocument()
  })

  it('cada botón dice de qué insumo y proveedor es (RC-19)', async () => {
    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Impacto en el margen' })
    const buttons = screen.getAllByRole('button', { name: /^Ya le compro a este proveedor/ })
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Ya le compro a este proveedor: Harina de trigo 000 Olavarriense a Distribuidora Mayorista Molinera',
      'Ya le compro a este proveedor: Manteca La Serenísima a Lácteos del Sur',
    ])
  })

  it('Escenario "Sin calculadora": no hay bultos, pedido semanal ni ahorro por bulto', async () => {
    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Impacto en el margen' })
    expect(screen.queryByText(/bulto/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/pedido/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('Escenario "Confirmación con impacto": muestra los productos afectados y su margen nuevo', async () => {
    const dialog = await openHarinaConfirmation()

    expect(purchasingService.getIngredientMarginImpact).toHaveBeenCalledWith(
      expect.any(Function),
      'ing-harina',
      'si-molinera'
    )
    expect(await within(dialog).findByText('Medialunas de manteca x 12')).toBeInTheDocument()
    expect(within(dialog).getByText(/2 productos cambian su margen/)).toBeInTheDocument()
    expect(within(dialog).getByText(/36,5\s%/)).toBeInTheDocument()
    expect(within(dialog).getByText(/61,1\s%/)).toBeInTheDocument()
    expect(within(dialog).getByText(/\$880,00 por kg/)).toBeInTheDocument()
  })

  it('al confirmar hace predeterminada la presentación con sus datos, avisa cuántos productos se recalcularon y recarga', async () => {
    vi.mocked(supplierService.addPackaging).mockResolvedValue({
      supplierIngredient: { ...harinaDetail.supplierConnections[1]!, isDefault: true },
      unitCost: '880.00',
    })
    const dialog = await openHarinaConfirmation()
    await within(dialog).findByText('Medialunas de manteca x 12')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Sí, ya le compro' }))

    await waitFor(() => {
      expect(supplierService.addPackaging).toHaveBeenCalledWith(expect.any(Function), 'sup-molinera', {
        ingredientId: 'ing-harina',
        packageSize: 25,
        packageUnit: 'kg',
        packagePrice: 22000,
        isDefault: true,
        supplierCode: 'MOL-000',
        rawDescription: 'HARINA 000 OLAV. 25 KG',
      })
    })
    expect(ingredientService.getById).toHaveBeenCalledWith(expect.any(Function), 'ing-harina')
    expect(await screen.findByText('Listo: 2 productos recalculados')).toBeInTheDocument()
    await waitFor(() => expect(purchasingService.getMarginImpact).toHaveBeenCalledTimes(2))
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /Ya le comprás/ })).not.toBeInTheDocument()
    )
  })

  it('con un solo producto el aviso va en singular', async () => {
    vi.mocked(purchasingService.getIngredientMarginImpact).mockResolvedValue({
      ...harinaImpact,
      productsAffectedCount: 1,
      products: [harinaImpact.products[0]!],
    })
    vi.mocked(supplierService.addPackaging).mockResolvedValue({
      supplierIngredient: { ...harinaDetail.supplierConnections[1]!, isDefault: true },
      unitCost: '880.00',
    })
    const dialog = await openHarinaConfirmation()
    expect(await within(dialog).findByText(/1 producto cambia su margen/)).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Sí, ya le compro' }))

    expect(await screen.findByText('Listo: 1 producto recalculado')).toBeInTheDocument()
  })

  it('si el detalle responde 422 lo muestra en la confirmación y no deja confirmar', async () => {
    vi.mocked(purchasingService.getIngredientMarginImpact).mockRejectedValue(
      new ApiError('La presentación está en cuarentena y debe resolverse antes de evaluarla.', 422)
    )
    const dialog = await openHarinaConfirmation()

    expect(
      await within(dialog).findByText('La presentación está en cuarentena y debe resolverse antes de evaluarla.')
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Sí, ya le compro' })).toBeDisabled()
    expect(supplierService.addPackaging).not.toHaveBeenCalled()
  })

  it('si la presentación ya no está en el insumo avisa y no cambia nada', async () => {
    vi.mocked(ingredientService.getById).mockResolvedValue({
      ...harinaDetail,
      supplierConnections: [harinaDetail.supplierConnections[0]!],
    })
    const dialog = await openHarinaConfirmation()
    await within(dialog).findByText('Medialunas de manteca x 12')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Sí, ya le compro' }))

    expect(
      await screen.findByText('Esa presentación ya no está cargada en el insumo. Actualizá la pantalla e intentá de nuevo.')
    ).toBeInTheDocument()
    expect(supplierService.addPackaging).not.toHaveBeenCalled()
  })

  it('si falla el cambio avisa el error, no recarga y deja la confirmación abierta', async () => {
    vi.mocked(supplierService.addPackaging).mockRejectedValueOnce(
      new ApiError('El proveedor "Distribuidora Mayorista Molinera" está inactivo.', 422)
    )
    const dialog = await openHarinaConfirmation()
    await within(dialog).findByText('Medialunas de manteca x 12')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Sí, ya le compro' }))

    expect(
      await screen.findByText('El proveedor "Distribuidora Mayorista Molinera" está inactivo.')
    ).toBeInTheDocument()
    expect(purchasingService.getMarginImpact).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog', { name: /Ya le comprás/ })).toBeInTheDocument()
  })

  it('Cancelar cierra la confirmación sin cambiar nada', async () => {
    const dialog = await openHarinaConfirmation()
    await within(dialog).findByText('Medialunas de manteca x 12')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /Ya le comprás/ })).not.toBeInTheDocument()
    )
    expect(supplierService.addPackaging).not.toHaveBeenCalled()
  })

  it('muestra el error de la API y permite reintentar', async () => {
    vi.mocked(purchasingService.getMarginImpact).mockRejectedValueOnce(
      new ApiError('Error al cargar datos del servidor', 500)
    )

    renderPage()

    expect(await screen.findByText('No se pudo calcular el impacto en el margen')).toBeInTheDocument()
    expect(screen.getByText('Error al cargar datos del servidor')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }))

    expect(await screen.findByRole('article', { name: 'Harina de trigo 000 Olavarriense' })).toBeInTheDocument()
  })

  it('sin alternativas más baratas invita a cargar proveedores y lleva a Proveedores', async () => {
    vi.mocked(purchasingService.getMarginImpact).mockResolvedValue({
      summary: { ingredientsWithAlternative: 0, productsAffected: 0, productsLeavingRiskOrLoss: 0 },
      byIngredient: [],
    })

    renderPage()

    expect(await screen.findByText('No hay proveedores más baratos para tus insumos')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ir a Proveedores' }))
    expect(await screen.findByText('Pantalla de proveedores')).toBeInTheDocument()
  })

  it('muestra el esqueleto de carga mientras llega el cálculo', async () => {
    vi.mocked(purchasingService.getMarginImpact).mockReturnValue(new Promise(() => {}))

    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent('Calculando el impacto en el margen')
  })

  it('con precios en cuarentena avisa y enlaza a la bandeja con hover legible en oscuro', async () => {
    vi.mocked(supplierService.getQuarantine).mockResolvedValue([
      { id: 'q1' },
      { id: 'q2' },
    ] as unknown as Awaited<ReturnType<typeof supplierService.getQuarantine>>)

    renderPage()

    const link = await screen.findByRole('link', { name: 'Ver cuarentena' })
    expect(link).toHaveAttribute('href', '/proveedores/cuarentena')
    expect(link.className).toContain('dark:hover:text-amber-100')
    expect(screen.getByText(/2 precios en cuarentena no participan/)).toBeInTheDocument()
  })

  it('si falla la consulta de cuarentena igual muestra el impacto, sin el aviso', async () => {
    vi.mocked(supplierService.getQuarantine).mockRejectedValue(new ApiError('Sin conexión', 503))

    renderPage()

    expect(await screen.findByRole('article', { name: 'Harina de trigo 000 Olavarriense' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver cuarentena' })).not.toBeInTheDocument()
  })

  it('aclara que consultar la pantalla no cambia costos ni recetas', async () => {
    renderPage()

    expect(await screen.findByText(/no cambia tus costos ni tus recetas/i)).toBeInTheDocument()
  })
})
