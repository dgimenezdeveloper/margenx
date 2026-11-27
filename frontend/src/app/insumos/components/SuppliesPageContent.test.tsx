import { act, screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom'
import SuppliesPageContent from './SuppliesPageContent'
import { renderWithDataRouter } from '@/test-utils/renderWithDataRouter'
import { TOAST_DURATION_MS } from '@/lib/toast'
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

vi.mock('@/services/ingredientService', async (importOriginal) => ({
  // Lo real (por ejemplo, defaultPresentationMismatch) se conserva; solo se reemplazan las llamadas a la API.
  ...(await importOriginal<typeof import('@/services/ingredientService')>()),
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

const renderPage = () => renderWithDataRouter(<SuppliesPageContent />, '/insumos')

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

    await screen.findByText('Precios en cuarentena (3)')
    expect(valorDeLaTarjeta().getByText('3')).toBeInTheDocument()
  })

  it('el número del botón Cuarentena tiene contraste sobre el ámbar (axe lo deja para revisar a mano, #442)', async () => {
    vi.mocked(supplierService.getQuarantine).mockResolvedValue([enCuarentena('q1'), enCuarentena('q2'), enCuarentena('q3')])
    renderPage()

    await screen.findByText('Precios en cuarentena (3)')
    const numero = within(screen.getByRole('button', { name: /^Cuarentena/ })).getByText('3')
    // Blanco sobre amber-500 da 2,1:1; amber-950, como el contador de SuppliersTabs, da 7:1.
    expect(numero).not.toHaveClass('text-white')
    expect(numero).toHaveClass('bg-amber-500', 'text-amber-950')
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

    const saveBtn = screen.getByRole('button', { name: 'Guardar cambios' })
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

    const saveBtn = screen.getByRole('button', { name: 'Guardar cambios' })
    await user.click(saveBtn)

    expect(await screen.findByText('Ya existe un insumo con ese nombre.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre del insumo')).toHaveAttribute('aria-invalid', 'true')
  })

  it('bloquea el cambio de unidad en la ficha cuando el insumo está vinculado a recetas y explica el motivo', async () => {
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

    expect(screen.getByRole('button', { name: 'kg' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'litro' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'unidad' })).toBeDisabled()
    expect(
      screen.getByText(
        'La unidad no se puede cambiar porque el insumo ya está en recetas o en presentaciones de proveedor.'
      )
    ).toBeInTheDocument()
    expect(ingredientService.update).not.toHaveBeenCalled()
  })

  it('muestra el error 409 del backend en la ficha sin cerrarla si se asoció una receta desde otra pestaña', async () => {
    const user = userEvent.setup()
    const conflictMsg =
      'No se puede cambiar la unidad: el insumo está en 1 receta(s) y 0 presentación(es) de proveedor. Sacalo de las recetas y de los proveedores, o creá un insumo nuevo con la otra unidad.'

    vi.mocked(ingredientService.list).mockResolvedValueOnce(pagina([
      { id: 'ing-1', name: 'Harina 000', unit: 'kg', currentCost: 736.25 }
    ]))
    vi.mocked(ingredientService.getProducts).mockResolvedValueOnce({
      data: [],
      meta: { total: 0, page: 1, limit: 100, totalPages: 0 },
    })
    vi.mocked(ingredientService.update).mockRejectedValueOnce(new ApiError(conflictMsg, 409))

    renderPage()

    const [row] = await screen.findAllByText('Harina 000')
    fireEvent.click(row)
    await screen.findByText('Este insumo no se utiliza en ninguna receta activa.')

    await user.click(screen.getByRole('button', { name: 'litro' }))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(conflictMsg)
    expect(screen.getByRole('dialog', { name: 'Editar insumo' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre del insumo')).toHaveAttribute('aria-invalid', 'false')
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
describe('SuppliesPageContent - "Se usa en" sin datos confiables (#354)', () => {
  const pan = (i: number) => ({
    id: `prod-${i}`,
    name: `Pan de campo ${i}`,
    quantity: 0.1,
    salePrice: 3000,
    cost: 1000,
    marginAmount: 2000,
    marginPercent: 66,
    minMarginPercent: 30,
    marginStatus: 'surplus' as const,
    updatedAt: '2026-10-14T12:00:00.000Z',
  })
  const usos = (cantidad: number, total = cantidad) => ({
    data: Array.from({ length: cantidad }, (_, i) => pan(i + 1)),
    meta: { total, page: 1, limit: 100, totalPages: Math.ceil(total / 100) },
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockUser.role = 'ADMIN'
    vi.mocked(supplierService.getQuarantine).mockResolvedValue([])
    vi.mocked(ingredientService.list).mockResolvedValue(pagina([
      { id: 'ing-1', name: 'Aceite de girasol', unit: 'kg', currentCost: 2000 },
    ]))
    vi.mocked(ingredientService.update).mockResolvedValue({
      ingredient: { id: 'ing-1', name: 'Aceite de girasol', unit: 'l', currentCost: 2000 },
      affectedProductsCount: 0,
      criticalProducts: [],
    })
  })

  afterEach(() => {
    mockUser.role = 'ADMIN'
  })

  const abrirFicha = async () => {
    const user = userEvent.setup()
    renderPage()
    const [fila] = await screen.findAllByText('Aceite de girasol')
    fireEvent.click(fila)
    return user
  }

  it('si la consulta falla, avisa el error con Reintentar y no dice que el insumo no se usa', async () => {
    vi.mocked(ingredientService.getProducts)
      .mockRejectedValueOnce(new Error('500'))
      .mockResolvedValueOnce(usos(1))
    const user = await abrirFicha()

    expect(await screen.findByText('No pudimos cargar los productos que usan este insumo.')).toBeInTheDocument()
    expect(screen.queryByText('Este insumo no se utiliza en ninguna receta activa.')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Pan de campo 1')).toBeInTheDocument()
    expect(ingredientService.getProducts).toHaveBeenCalledTimes(2)
  })

  // Desde #426 el backend no deja cambiar la unidad de un insumo usado (409): ya no hace falta confirmar
  // cuando no se sabe dónde se usa. Si se usa, la ficha muestra el 409; si no, el cambio es inofensivo.
  it('si la consulta falla, cambiar la unidad guarda sin diálogo y, si se usa, muestra el 409 en la ficha', async () => {
    vi.mocked(ingredientService.getProducts).mockRejectedValue(new Error('500'))
    const conflicto =
      'No se puede cambiar la unidad: el insumo está en 1 receta(s) y 0 presentación(es) de proveedor. Sacalo de las recetas y de los proveedores, o creá un insumo nuevo con la otra unidad.'
    vi.mocked(ingredientService.update).mockRejectedValueOnce(new ApiError(conflicto, 409))
    const user = await abrirFicha()
    await screen.findByText('No pudimos cargar los productos que usan este insumo.')

    await user.click(screen.getByRole('button', { name: 'litro' }))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() =>
      expect(ingredientService.update).toHaveBeenCalledWith(expect.any(Function), 'ing-1', expect.objectContaining({ unit: 'l' }))
    )
    expect(screen.queryByRole('dialog', { name: '¿Cambiar unidad de medida?' })).not.toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getAllByRole('alert').some((alerta) => alerta.textContent === conflicto)).toBe(true)
    )
    expect(screen.getByRole('dialog', { name: 'Editar insumo' })).toBeInTheDocument()
  })

  it('mientras la lista carga, cambiar la unidad guarda sin diálogo', async () => {
    vi.mocked(ingredientService.getProducts).mockReturnValue(new Promise(() => {}))
    const user = await abrirFicha()

    await user.click(screen.getByRole('button', { name: 'litro' }))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() =>
      expect(ingredientService.update).toHaveBeenCalledWith(expect.any(Function), 'ing-1', expect.objectContaining({ unit: 'l' }))
    )
    expect(screen.queryByRole('dialog', { name: '¿Cambiar unidad de medida?' })).not.toBeInTheDocument()
  })

  it('sin recetas que lo usen, cambiar la unidad guarda directo', async () => {
    vi.mocked(ingredientService.getProducts).mockResolvedValue(usos(0))
    const user = await abrirFicha()
    await screen.findByText('Este insumo no se utiliza en ninguna receta activa.')

    await user.click(screen.getByRole('button', { name: 'litro' }))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() =>
      expect(ingredientService.update).toHaveBeenCalledWith(expect.any(Function), 'ing-1', expect.objectContaining({ unit: 'l' }))
    )
    expect(screen.queryByRole('dialog', { name: '¿Cambiar unidad de medida?' })).not.toBeInTheDocument()
  })

  it('el colaborador no consulta "Se usa en" ni ve la sección: el endpoint es solo ADMIN', async () => {
    mockUser.role = 'COLLABORATOR'
    vi.mocked(ingredientService.getProducts).mockResolvedValue(usos(0))
    await abrirFicha()

    expect(await screen.findByRole('dialog', { name: 'Editar insumo' })).toBeInTheDocument()
    expect(ingredientService.getProducts).not.toHaveBeenCalled()
    expect(screen.queryByText('Se usa en')).not.toBeInTheDocument()
    expect(screen.queryByText('Este insumo no se utiliza en ninguna receta activa.')).not.toBeInTheDocument()
  })

  it('con más productos que los listados, el contador muestra el total y avisa cuántos se ven', async () => {
    vi.mocked(ingredientService.getProducts).mockResolvedValue(usos(100, 150))
    await abrirFicha()

    expect(await screen.findByText('150 productos')).toBeInTheDocument()
    expect(screen.getByText('Se muestran los primeros 100 de 150.')).toBeInTheDocument()
  })
})

describe('SuppliesPageContent - cambios sin guardar y avisos de error (#364)', () => {
  const harina = { id: 'ing-1', name: 'Harina 000 Cañuelas', unit: 'kg', currentCost: 736.25 }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ingredientService.list).mockResolvedValue(pagina([harina]))
    vi.mocked(supplierService.getQuarantine).mockResolvedValue([])
    vi.mocked(ingredientService.getProducts).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const editarNombre = async (user: ReturnType<typeof userEvent.setup>) => {
    const [row] = await screen.findAllByText('Harina 000 Cañuelas')
    fireEvent.click(row)
    const nameInput = await screen.findByLabelText('Nombre del insumo')
    await user.clear(nameInput)
    await user.type(nameInput, 'Harina 0000 Cañuelas')
  }

  it('con la ficha del insumo modificada, salir de la pantalla pide confirmación y "Seguir editando" se queda', async () => {
    const user = userEvent.setup()
    const { router } = renderPage()
    await editarNombre(user)

    await act(async () => {
      await router.navigate('/productos')
    })

    expect(await screen.findByText('¿Descartar cambios?')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/insumos')

    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
    await waitFor(() => expect(screen.queryByText('¿Descartar cambios?')).not.toBeInTheDocument())
    expect(router.state.location.pathname).toBe('/insumos')
    expect(screen.getByLabelText('Nombre del insumo')).toHaveValue('Harina 0000 Cañuelas')
  })

  it('"Descartar" deja salir de Insumos', async () => {
    const user = userEvent.setup()
    const { router } = renderPage()
    await editarNombre(user)

    await act(async () => {
      await router.navigate('/productos')
    })
    await user.click(await screen.findByRole('button', { name: 'Descartar' }))

    expect(await screen.findByRole('heading', { name: 'Otra pantalla' })).toBeInTheDocument()
  })

  it('con la ficha modificada, cerrar o recargar la pestaña pide confirmación; sin cambios, no', async () => {
    const user = userEvent.setup()
    renderPage()

    const [row] = await screen.findAllByText('Harina 000 Cañuelas')
    fireEvent.click(row)
    await screen.findByLabelText('Nombre del insumo')
    const sinCambios = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(sinCambios)
    expect(sinCambios.defaultPrevented).toBe(false)

    await user.clear(screen.getByLabelText('Nombre del insumo'))
    await user.type(screen.getByLabelText('Nombre del insumo'), 'Harina 0000 Cañuelas')
    const conCambios = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(conCambios)
    expect(conCambios.defaultPrevented).toBe(true)
  })

  it('el error al guardar dura más que un aviso de éxito y se puede cerrar antes con la X', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    vi.mocked(ingredientService.update).mockRejectedValue(new ApiError('Error al actualizar el insumo.', 500))
    renderPage()
    await editarNombre(user)

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Error al actualizar el insumo.')

    // Pasado el tiempo de un aviso de éxito, el error sigue en pantalla.
    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS.success + 200)
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Error al actualizar el insumo.')

    await user.click(screen.getByRole('button', { name: 'Cerrar notificación' }))
    await waitFor(() => expect(screen.queryByText('Error al actualizar el insumo.')).not.toBeInTheDocument())
  })
})

describe('SuppliesPageContent - costo manual con presentación predeterminada (#427)', () => {
  // Harina 000 a $900/kg por la bolsa de 25 kg de Molinera (predeterminada) y una de Sarita.
  const harina = {
    id: 'ing-harina',
    name: 'Harina 000 Olavarriense',
    unit: 'kg',
    currentCost: 900,
    supplierConnections: [
      {
        id: 'si-molinera',
        supplierId: 'sup-molinera',
        ingredientId: 'ing-harina',
        packageSize: 25,
        packageUnit: 'kg',
        packagePrice: 22500,
        isDefault: true,
        isQuarantined: false,
        supplier: { id: 'sup-molinera', name: 'Distribuidora Mayorista Molinera' },
      },
      {
        id: 'si-sarita',
        supplierId: 'sup-sarita',
        ingredientId: 'ing-harina',
        packageSize: 50,
        packageUnit: 'kg',
        packagePrice: 47000,
        isDefault: false,
        isQuarantined: false,
        supplier: { id: 'sup-sarita', name: 'Molino Sarita' },
      },
    ],
  }
  const CONFLICTO = new ApiError(
    'El insumo tiene una presentación predeterminada con otro costo. Elegí si actualizás el precio de esa presentación o si dejás de usarla como predeterminada.',
    409,
    {
      code: 'DEFAULT_PRESENTATION_MISMATCH',
      defaultPresentation: {
        id: 'si-molinera',
        supplierId: 'sup-molinera',
        supplierName: 'Distribuidora Mayorista Molinera',
        packageSize: '25',
        packageUnit: 'kg',
        packagePrice: '22500.00',
        unitCost: '900.00',
      },
    }
  )
  const guardado = {
    ingredient: { id: 'ing-harina', name: 'Harina 000 Olavarriense', unit: 'kg', currentCost: 950 },
    affectedProductsCount: 0,
    criticalProducts: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supplierService.getQuarantine).mockResolvedValue([])
    vi.mocked(ingredientService.getProducts).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } })
    vi.mocked(ingredientService.list).mockResolvedValue(pagina([harina]) as never)
  })

  const guardarCosto = async (costo: string) => {
    const user = userEvent.setup()
    renderPage()
    const [fila] = await screen.findAllByText('Harina 000 Olavarriense')
    fireEvent.click(fila)
    const campo = await screen.findByLabelText(/Costo unitario/)
    await user.clear(campo)
    await user.type(campo, costo)
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    return user
  }

  it('Escenario "Aviso al cambiar el costo a mano": ofrece actualizar la presentación o dejar de usarla, sin guardar todavía', async () => {
    vi.mocked(ingredientService.update).mockRejectedValueOnce(CONFLICTO)
    await guardarCosto('950')

    const dialogo = await screen.findByRole('dialog', { name: '¿Qué hacemos con la presentación predeterminada?' })
    expect(dialogo).toHaveTextContent('Este insumo le comprás a Distribuidora Mayorista Molinera a')
    expect(dialogo).toHaveTextContent(/900,00 por kg/)
    expect(within(dialogo).getByRole('button', { name: 'Actualizar el precio de Distribuidora Mayorista Molinera' })).toBeInTheDocument()
    expect(within(dialogo).getByRole('button', { name: 'Dejar de usar Distribuidora Mayorista Molinera como predeterminado' })).toBeInTheDocument()
    expect(ingredientService.update).toHaveBeenCalledTimes(1)
  })

  it('Escenario "Actualizar la presentación": reenvía con update-presentation y vuelve a pedir la lista', async () => {
    vi.mocked(ingredientService.update).mockRejectedValueOnce(CONFLICTO).mockResolvedValueOnce(guardado as never)
    const user = await guardarCosto('950')

    const dialogo = await screen.findByRole('dialog', { name: '¿Qué hacemos con la presentación predeterminada?' })
    const listasAntes = vi.mocked(ingredientService.list).mock.calls.length
    await user.click(within(dialogo).getByRole('button', { name: 'Actualizar el precio de Distribuidora Mayorista Molinera' }))

    await waitFor(() => expect(ingredientService.update).toHaveBeenCalledTimes(2))
    expect(vi.mocked(ingredientService.update).mock.calls[1]![2]).toMatchObject({ currentCost: 950, defaultPresentationAction: 'update-presentation' })
    // El precio del bulto lo calcula el backend: la lista se vuelve a pedir para mostrarlo.
    await waitFor(() => expect(vi.mocked(ingredientService.list).mock.calls.length).toBeGreaterThan(listasAntes))
  })

  it('Escenario "Quitar el predeterminado": reenvía con clear-default', async () => {
    vi.mocked(ingredientService.update).mockRejectedValueOnce(CONFLICTO).mockResolvedValueOnce(guardado as never)
    const user = await guardarCosto('950')

    const dialogo = await screen.findByRole('dialog', { name: '¿Qué hacemos con la presentación predeterminada?' })
    await user.click(within(dialogo).getByRole('button', { name: 'Dejar de usar Distribuidora Mayorista Molinera como predeterminado' }))

    await waitFor(() => expect(ingredientService.update).toHaveBeenCalledTimes(2))
    expect(vi.mocked(ingredientService.update).mock.calls[1]![2]).toMatchObject({ defaultPresentationAction: 'clear-default' })
  })

  it('Cancelar no guarda nada y deja la ficha abierta con el costo tipeado', async () => {
    vi.mocked(ingredientService.update).mockRejectedValueOnce(CONFLICTO)
    const user = await guardarCosto('950')

    const dialogo = await screen.findByRole('dialog', { name: '¿Qué hacemos con la presentación predeterminada?' })
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '¿Qué hacemos con la presentación predeterminada?' })).toBeNull())
    expect(ingredientService.update).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog', { name: 'Editar insumo' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Costo unitario/)).toHaveValue('950')
  })

  it('Escenario "Las tarjetas no desaparecen": después de guardar, el insumo sigue con sus dos proveedores sin recargar', async () => {
    vi.mocked(ingredientService.update).mockResolvedValueOnce({ ...guardado, ingredient: { ...guardado.ingredient, currentCost: 900 } } as never)
    // Mismo costo, distinto nombre: guarda directo, sin conflicto.
    const user = userEvent.setup()
    renderPage()
    const [fila] = await screen.findAllByText('Harina 000 Olavarriense')
    fireEvent.click(fila)
    await user.click(await screen.findByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(ingredientService.update).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Editar insumo' })).toBeNull())

    const [filaOtraVez] = await screen.findAllByText('Harina 000 Olavarriense')
    fireEvent.click(filaOtraVez)
    const ficha = await screen.findByRole('dialog', { name: 'Editar insumo' })
    expect(within(ficha).getByText('Distribuidora Mayorista Molinera')).toBeInTheDocument()
    expect(within(ficha).getByText('Molino Sarita')).toBeInTheDocument()
  })

  it('el aviso de éxito muestra el costo que guardó el backend, que con un bulto fraccionario puede diferir del tipeado', async () => {
    // Con "Actualizar el precio", el insumo queda en el costo que da el bulto redondeado al centavo (ADR-011):
    // por ejemplo, $950,15 tipeados con un bulto de 0,5 kg quedan en $950,16.
    vi.mocked(ingredientService.update)
      .mockRejectedValueOnce(CONFLICTO)
      .mockResolvedValueOnce({ ...guardado, ingredient: { ...guardado.ingredient, currentCost: 950.16 } } as never)
    const user = await guardarCosto('950,15')

    const dialogo = await screen.findByRole('dialog', { name: '¿Qué hacemos con la presentación predeterminada?' })
    await user.click(within(dialogo).getByRole('button', { name: 'Actualizar el precio de Distribuidora Mayorista Molinera' }))

    expect(await screen.findByText(/Nuevo valor: .*950,16/)).toBeInTheDocument()
    expect(screen.queryByText(/Nuevo valor: .*950,15/)).toBeNull()
  })
})

