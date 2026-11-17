import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'
import SuppliesPageContent from './SuppliesPageContent'
import { ingredientService } from '@/services/ingredientService'
import { supplierService } from '@/services/supplierService'
import { ApiError } from '@/services/api'

const BUSQUEDA = { timeout: 3000 }

const mockGetToken = vi.fn().mockResolvedValue('fake-token')

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    getToken: mockGetToken,
    signOut: vi.fn(),
  }),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/insumos' }),
  }
})

vi.mock('next/navigation', () => ({
  usePathname: () => '/insumos',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const mockUser = { id: 'u1', role: 'ADMIN', email: 'admin@panaderia.com' }

vi.mock('@/lib/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: mockUser,
    isLoading: false,
    businessName: 'Panadería Central',
  }),
}))

vi.mock('@/services/ingredientService', () => ({
  ingredientService: {
    getAll: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getProducts: vi.fn(),
  },
}))

vi.mock('@/services/supplierService', () => ({
  supplierService: {
    getQuarantine: vi.fn(),
  },
}))

const pagina = <T,>(items: T[]) => ({
  items,
  meta: { total: items.length, page: 1, limit: 20, totalPages: items.length === 0 ? 0 : 1 },
})

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/insumos']}>
      <SuppliesPageContent />
    </MemoryRouter>
  )

describe('SuppliesPageContent - Manejo de Errores y Reintentos (UX-17)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ingredientService.list).mockResolvedValue(pagina([]))
    vi.mocked(supplierService.getQuarantine).mockResolvedValue([])
    vi.mocked(ingredientService.getProducts).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } })
  })

  it('Escenario Gherkin: Falla la carga de insumos -> ve ErrorState con Reintentar y no una lista vacía ni KPIs en cero', async () => {
    vi.mocked(ingredientService.list).mockRejectedValueOnce(
      new ApiError('Fallo al consultar /api/ingredients (500)', 500)
    )
    vi.mocked(supplierService.getQuarantine).mockResolvedValue([])

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    expect(screen.getByText('Error al cargar insumos')).toBeInTheDocument()
    expect(screen.getByText(/Fallo al consultar \/api\/ingredients/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument()

    expect(screen.queryByText('Sin insumos en la despensa')).toBeNull()
    expect(screen.queryByText('Insumos activos')).toBeNull()
  })

  it('Escenario Gherkin: Reintento exitoso en Insumos -> recupera la lista completa', async () => {
    vi.mocked(ingredientService.list).mockRejectedValueOnce(new ApiError('Fallo temporal', 500))
    vi.mocked(supplierService.getQuarantine).mockResolvedValue([])

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    vi.mocked(ingredientService.list).mockResolvedValueOnce(pagina([
      { id: 'ing-1', name: 'Harina de trigo 000', unit: 'kg', currentCost: 736.25 },
    ]))
    vi.mocked(supplierService.getQuarantine).mockResolvedValue([])

    const retryBtn = screen.getByRole('button', { name: /reintentar/i })
    fireEvent.click(retryBtn)

    await waitFor(() => {
      expect(screen.getAllByText('Harina de trigo 000').length).toBeGreaterThan(0)
    })

    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('Sin red (fetch lanza TypeError) -> muestra un mensaje en español, no el texto técnico del navegador', async () => {
    vi.mocked(ingredientService.list).mockRejectedValueOnce(new TypeError('Failed to fetch'))

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    expect(screen.getByText('No se pudieron cargar los insumos.')).toBeInTheDocument()
    expect(screen.queryByText(/failed to fetch/i)).toBeNull()
  })

  it('Mientras se reintenta muestra el estado de carga y no el error anterior', async () => {
    vi.mocked(ingredientService.list).mockRejectedValueOnce(new ApiError('Fallo temporal', 500))

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    vi.mocked(ingredientService.list).mockReturnValueOnce(new Promise(() => {}))
    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }))

    expect(await screen.findByText('Cargando insumos...')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText('Fallo temporal')).toBeNull()
  })
})

describe('SuppliesPageContent - tarjeta "Variaciones recientes"', () => {
  const harina = { id: 'ing-harina', name: 'Harina de trigo 000 Olavarriense', unit: 'kg', currentCost: 736.25 }
  const enCuarentena = (id: string) => ({
    id,
    ingredientId: 'ing-harina',
    supplierId: `sup-${id}`,
    packagePrice: 18406.25,
    packageSize: 25,
    isDefault: false,
    isQuarantined: true,
    ingredient: { id: 'ing-harina', name: 'Harina de trigo 000 Olavarriense', currentCost: 736.25 },
    supplier: { id: `sup-${id}`, name: 'Distribuidora del Centro' },
  })
  const valorDeLaTarjeta = () => within(screen.getByText('Variaciones recientes').parentElement as HTMLElement)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ingredientService.list).mockResolvedValue(pagina([harina]))
    vi.mocked(ingredientService.getProducts).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } })
  })

  it('muestra la cantidad real de precios en cuarentena', async () => {
    vi.mocked(supplierService.getQuarantine).mockResolvedValue([enCuarentena('q1'), enCuarentena('q2'), enCuarentena('q3')])
    renderPage()

    await screen.findByText('Precios en Cuarentena (3)')
    expect(valorDeLaTarjeta().getByText('3')).toBeInTheDocument()
  })

  it('muestra 0 si no hay precios en cuarentena', async () => {
    vi.mocked(supplierService.getQuarantine).mockResolvedValue([])
    renderPage()

    await screen.findAllByText('Harina de trigo 000 Olavarriense')
    expect(valorDeLaTarjeta().getByText('0')).toBeInTheDocument()
  })
})

describe('SuppliesPageContent - catálogo completo, búsqueda real y aislamiento (#350)', () => {
  const TOTAL = 218
  const insumo = (i: number) => ({ id: `ing-${i}`, name: `Aceite de girasol Natura ${i}`, unit: 'l', currentCost: 2150.5 })
  const sesamo = { id: 'ing-sesamo', name: 'Semillas de sésamo La Molinera', unit: 'kg', currentCost: 5400 }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supplierService.getQuarantine).mockResolvedValue([])
    vi.mocked(ingredientService.getProducts).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } })
    vi.mocked(ingredientService.list).mockImplementation(async (_getToken, params) => {
      if (params.search) {
        return { items: [sesamo], meta: { total: 1, page: 1, limit: params.limit, totalPages: 1 } }
      }
      const start = (params.page - 1) * params.limit
      const items = Array.from({ length: Math.min(params.limit, TOTAL - start) }, (_, i) => insumo(start + i))
      return { items, meta: { total: TOTAL, page: params.page, limit: params.limit, totalPages: Math.ceil(TOTAL / params.limit) } }
    })
  })

  it('Escenario: Catálogo completo -> la tarjeta muestra 218 y el paginador llega a la última página', async () => {
    renderPage()

    const tarjeta = within((await screen.findByText('Insumos activos')).parentElement as HTMLElement)
    await waitFor(() => expect(tarjeta.getByText('218')).toBeInTheDocument())
    expect(screen.getByText('Mostrando 1–20 de 218 insumos')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Filas por página'), { target: { value: '100' } })
    await screen.findByText('Página 1 de 3')
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Página siguiente' }))

    expect(await screen.findByText('Mostrando 201–218 de 218 insumos')).toBeInTheDocument()
    expect(screen.getAllByText('Aceite de girasol Natura 217').length).toBeGreaterThan(0)
    expect(ingredientService.list).toHaveBeenLastCalledWith(expect.any(Function), { page: 3, limit: 100, search: '' })
  })

  it('Escenario: Búsqueda real -> "sesamo" se consulta a la API y encuentra un insumo fuera de la primera página', async () => {
    renderPage()
    await screen.findByText('Mostrando 1–20 de 218 insumos')

    fireEvent.change(screen.getByLabelText('Buscar insumos por nombre'), { target: { value: 'sesamo' } })

    expect((await screen.findAllByText('Semillas de sésamo La Molinera', undefined, BUSQUEDA)).length).toBeGreaterThan(0)
    expect(ingredientService.list).toHaveBeenLastCalledWith(expect.any(Function), { page: 1, limit: 20, search: 'sesamo' })
    const tarjeta = within(screen.getByText('Insumos activos').parentElement as HTMLElement)
    expect(tarjeta.getByText('218')).toBeInTheDocument()
  })

  it('Escenario: Aislamiento -> la búsqueda no envía la cuenta: la API la toma del usuario autenticado', async () => {
    renderPage()
    await screen.findByText('Mostrando 1–20 de 218 insumos')

    fireEvent.change(screen.getByLabelText('Buscar insumos por nombre'), { target: { value: 'sesamo' } })
    await screen.findAllByText('Semillas de sésamo La Molinera', undefined, BUSQUEDA)

    for (const [, params] of vi.mocked(ingredientService.list).mock.calls) {
      expect(Object.keys(params).sort()).toEqual(['limit', 'page', 'search'])
    }
  })

  it('una búsqueda sin resultados muestra el término buscado', async () => {
    vi.mocked(ingredientService.list).mockImplementation(async (_getToken, params) =>
      params.search
        ? { items: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }
        : { items: [insumo(0)], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } }
    )
    renderPage()
    await screen.findAllByText('Aceite de girasol Natura 0')

    fireEvent.change(screen.getByLabelText('Buscar insumos por nombre'), { target: { value: 'azafran' } })

    expect(await screen.findByText('Insumo no encontrado', undefined, BUSQUEDA)).toBeInTheDocument()
    expect(screen.getByText('No existe ningún insumo con el nombre "azafran".')).toBeInTheDocument()
    expect(screen.queryByText('Sin insumos en la despensa')).toBeNull()
  })
})

describe('SuppliesPageContent - Edición de Nombre, Unidad y Validación 409 (Issue #354)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supplierService.getQuarantine).mockResolvedValue([])
    vi.mocked(ingredientService.getProducts).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } })
  })

  it('Escenario Gherkin "Corregir un nombre": renombra insumo exitosamente llamando a update con el nuevo nombre', async () => {
    const user = userEvent.setup()
    vi.mocked(ingredientService.list).mockResolvedValueOnce(pagina([
      { id: 'ing-1', name: 'Harina 000 Olavariense', unit: 'kg', currentCost: 736.25 }
    ]))
    vi.mocked(ingredientService.update).mockResolvedValueOnce({
      ingredient: { id: 'ing-1', name: 'Harina 000 Olavarriense', unit: 'kg', currentCost: 736.25 },
      affectedProductsCount: 3,
      criticalProducts: [],
    })

    renderPage()

    const [row] = await screen.findAllByText('Harina 000 Olavariense')
    fireEvent.click(row)

    const nameInput = await screen.findByLabelText('Nombre del insumo')
    await user.clear(nameInput)
    await user.type(nameInput, 'Harina 000 Olavarriense')

    const saveBtn = screen.getByRole('button', { name: 'Guardar Costo' })
    await user.click(saveBtn)

    await waitFor(() => {
      expect(ingredientService.update).toHaveBeenCalledWith(
        expect.any(Function),
        'ing-1',
        expect.objectContaining({ name: 'Harina 000 Olavarriense' })
      )
    })
  })

  it('captura el error 409 de nombre duplicado y lo asocia al campo name', async () => {
    const user = userEvent.setup()
    vi.mocked(ingredientService.list).mockResolvedValueOnce(pagina([
      { id: 'ing-1', name: 'Harina 000', unit: 'kg', currentCost: 736.25 }
    ]))
    vi.mocked(ingredientService.update).mockRejectedValueOnce(
      new ApiError('Ya existe un insumo con ese nombre.', 409)
    )

    renderPage()

    const [row] = await screen.findAllByText('Harina 000')
    fireEvent.click(row)

    const nameInput = await screen.findByLabelText('Nombre del insumo')
    await user.clear(nameInput)
    await user.type(nameInput, 'Azúcar común')

    const saveBtn = screen.getByRole('button', { name: 'Guardar Costo' })
    await user.click(saveBtn)

    expect(await screen.findByText('Ya existe un insumo con ese nombre.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre del insumo')).toHaveAttribute('aria-invalid', 'true')
  })

  it('muestra diálogo de advertencia al cambiar la unidad de un insumo vinculado a recetas', async () => {
    const user = userEvent.setup()
    vi.mocked(ingredientService.list).mockResolvedValueOnce(pagina([
      { id: 'ing-1', name: 'Aceite de Girasol', unit: 'kg', currentCost: 2000 }
    ]))
    vi.mocked(ingredientService.getProducts).mockResolvedValueOnce({
      data: [
        {
          id: 'prod-1',
          name: 'Pan de Campo',
          quantity: 0.1,
          salePrice: 3000,
          cost: 1000,
          marginAmount: 2000,
          marginPercent: 66,
          minMarginPercent: 30,
          marginStatus: 'surplus',
          updatedAt: '2026-10-14T12:00:00.000Z',
        },
      ],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    })

    renderPage()

    const [row] = await screen.findAllByText('Aceite de Girasol')
    fireEvent.click(row)

    await screen.findByText('Pan de Campo')

    const litroBtn = screen.getByRole('button', { name: 'litro' })
    await user.click(litroBtn)

    const saveBtn = screen.getByRole('button', { name: 'Guardar Costo' })
    await user.click(saveBtn)

    const unitDialog = await screen.findByRole('dialog', { name: '¿Cambiar unidad de medida?' })
    expect(unitDialog).toBeInTheDocument()
    expect(unitDialog).toHaveTextContent(/Este insumo se utiliza en 1 producto/i)
    expect(ingredientService.update).not.toHaveBeenCalled()

    const confirmBtn = screen.getByRole('button', { name: 'Sí, cambiar unidad' })
    vi.mocked(ingredientService.update).mockResolvedValueOnce({
      ingredient: { id: 'ing-1', name: 'Aceite de Girasol', unit: 'l', currentCost: 2000 },
      affectedProductsCount: 1,
      criticalProducts: [],
    })
    await user.click(confirmBtn)

    await waitFor(() => {
      expect(ingredientService.update).toHaveBeenCalledWith(
        expect.any(Function),
        'ing-1',
        expect.objectContaining({ unit: 'l' })
      )
    })
  })

  it('formatea el costo con formatNumeroAR al perder el foco (onBlur)', async () => {
    const user = userEvent.setup()
    vi.mocked(ingredientService.list).mockResolvedValueOnce(pagina([
      { id: 'ing-1', name: 'Harina 000', unit: 'kg', currentCost: 2179.13 }
    ]))

    renderPage()

    const [row] = await screen.findAllByText('Harina 000')
    fireEvent.click(row)

    await screen.findByText('Este insumo no se utiliza en ninguna receta activa.')

    const costInput = await screen.findByLabelText(/Costo unitario/i)
    expect(costInput).toHaveValue('2.179,13')

    await user.clear(costInput)
    await user.type(costInput, '3500,5')
    fireEvent.blur(costInput)

    expect(costInput).toHaveValue('3.500,5')
  })
})