import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/services/api'
import { supplierService, type SupplierDetail } from '@/services/supplierService'
import SupplierDetailPage from './page'

/** La búsqueda espera 300 ms antes de ir a la API: margen para entornos cargados. */
const BUSQUEDA = { timeout: 3000 }

const getToken = vi.fn().mockResolvedValue('token')

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken, signOut: vi.fn() }),
}))

vi.mock('@/lib/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: { id: 'u1', role: 'ADMIN', email: 'admin@panaderia.com' },
    isLoading: false,
    businessName: 'Panadería Central',
  }),
}))

vi.mock('@/services/supplierService', () => ({
  supplierService: {
    getPage: vi.fn(),
    addPackaging: vi.fn(),
    removePackaging: vi.fn(),
  },
}))

const mockSupplier: SupplierDetail = {
  id: 'sup-marjuanc',
  accountId: 'acc-1',
  name: 'Distribuidora MarJuanC Alimentos',
  contactPhone: '+54 11 3758-0195',
  email: 'ventas@marjuanc.com',
  address: 'Grito de Asencio 3632',
  isActive: true,
  ingredients: [
    {
      id: 'si-1',
      supplierCode: 'HAR188',
      rawDescription: 'HARINA SARITA 000 X 25 KG',
      packageSize: 25,
      packageUnit: 'kg',
      packagePrice: 18406.25,
      isDefault: true,
      ingredient: { id: 'ing-1', name: 'Harina de trigo 000', unit: 'kg' },
    },
    {
      id: 'si-2',
      supplierCode: 'HAR187',
      rawDescription: 'HARINA SARITA 0000 X 25 KG',
      packageSize: 25,
      packageUnit: 'kg',
      packagePrice: 21126.22,
      isDefault: true,
      ingredient: { id: 'ing-2', name: 'Harina de trigo 0000', unit: 'kg' },
    },
    {
      id: 'si-3',
      supplierCode: 'AZU015',
      rawDescription: 'AZUCAR TIPO A 10x1kg',
      packageSize: 10,
      packageUnit: 'kg',
      packagePrice: 11400,
      isDefault: true,
      ingredient: { id: 'ing-3', name: 'Azúcar común tipo A', unit: 'kg' },
    },
    {
      id: 'si-4',
      supplierCode: 'CRE101',
      rawDescription: 'MANTECA COTAGU X 5 KG',
      packageSize: 5,
      packageUnit: 'kg',
      packagePrice: 50254.7,
      isDefault: false,
      ingredient: { id: 'ing-4', name: 'Manteca en bloque mayorista', unit: 'kg' },
    },
  ],
}

/** Respuesta de GET /suppliers/:id con las presentaciones en una sola página. */
const unaPagina = (supplier: SupplierDetail) => ({
  supplier,
  meta: { total: supplier.ingredients.length, page: 1, limit: 20, totalPages: supplier.ingredients.length === 0 ? 0 : 1 },
})

function renderPage(supplierId = 'sup-marjuanc') {
  return render(
    <MemoryRouter initialEntries={[`/proveedores/${supplierId}`]}>
      <Routes>
        <Route path="/proveedores/:id" element={<SupplierDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('SupplierDetailPage (/proveedores/:id) — Escenarios Gherkin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supplierService.getPage).mockResolvedValue(unaPagina(mockSupplier))
  })

  it('Escenario Gherkin "Ver presentaciones": ve las cuatro con insumo, código y precio', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Distribuidora MarJuanC Alimentos' })).toBeInTheDocument()
    expect(screen.getByText('Presentaciones del proveedor (4)')).toBeInTheDocument()

    const list = screen.getByRole('list', { name: 'Presentaciones mayoristas' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(4)

    expect(within(items[0]).getByText('Harina de trigo 000')).toBeInTheDocument()
    expect(within(items[0]).getByText('SKU: HAR188')).toBeInTheDocument()
    expect(within(items[0]).getByText('$18.406,25')).toBeInTheDocument()

    expect(within(items[1]).getByText('Harina de trigo 0000')).toBeInTheDocument()
    expect(within(items[2]).getByText('Azúcar común tipo A')).toBeInTheDocument()
    expect(within(items[3]).getByText('Manteca en bloque mayorista')).toBeInTheDocument()
  })

  it('Escenario Gherkin "Corregir un código": edita y guarda un nuevo código de artículo', async () => {
    const user = userEvent.setup()
    vi.mocked(supplierService.addPackaging).mockResolvedValue({
      supplierIngredient: {
        id: 'si-1',
        supplierId: 'sup-marjuanc',
        ingredientId: 'ing-1',
        packageSize: 25,
        packageUnit: 'kg',
        packagePrice: 18406.25,
        isDefault: true,
        supplierCode: 'HAR-000-NEW',
        rawDescription: 'HARINA NUEVA',
      },
      unitCost: 736.25,
    })

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Distribuidora MarJuanC Alimentos' })
    await user.click(screen.getByRole('button', { name: 'Editar presentación de Harina de trigo 000' }))

    const codeInput = screen.getByLabelText(/Código de artículo/)
    await user.clear(codeInput)
    await user.type(codeInput, 'HAR-000-NEW')

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(supplierService.addPackaging).toHaveBeenCalledWith(
        expect.any(Function),
        'sup-marjuanc',
        expect.objectContaining({
          ingredientId: 'ing-1',
          supplierCode: 'HAR-000-NEW',
        })
      )
    })
    expect(await screen.findByText('Presentación actualizada correctamente')).toBeInTheDocument()

    // Regresión [RV341-B1]: comprobar que las demás presentaciones predeterminadas conservan su estado
    const list = screen.getByRole('list', { name: 'Presentaciones mayoristas' })
    const items = within(list).getAllByRole('listitem')
    expect(within(items[0]).getByText('Predeterminada')).toBeInTheDocument()
    expect(within(items[1]).getByText('Predeterminada')).toBeInTheDocument()
    expect(within(items[2]).getByText('Predeterminada')).toBeInTheDocument()
    expect(within(items[3]).queryByText('Predeterminada')).toBeNull()
  })

  it('Escenario Gherkin "Código repetido": error 409 se muestra en el campo y no se guarda', async () => {
    const user = userEvent.setup()
    vi.mocked(supplierService.addPackaging).mockRejectedValue(
      new ApiError('El código de proveedor "HAR188" ya lo usa el insumo "Harina de trigo 000".', 409)
    )

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Distribuidora MarJuanC Alimentos' })
    await user.click(screen.getByRole('button', { name: 'Editar presentación de Manteca en bloque mayorista' }))

    const codeInput = screen.getByLabelText(/Código de artículo/)
    await user.clear(codeInput)
    await user.type(codeInput, 'HAR188')

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(
      await screen.findByText('El código de proveedor "HAR188" ya lo usa el insumo "Harina de trigo 000".')
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Código de artículo/)).toHaveAttribute('aria-invalid', 'true')
  })

  it('Escenario Gherkin "Quitar la predeterminada": si responde 409 se le pide elegir otra primero', async () => {
    const user = userEvent.setup()
    vi.mocked(supplierService.removePackaging).mockRejectedValue(
      new ApiError(
        'No puedes eliminar la presentación predeterminada mientras existan otras. Selecciona otra como predeterminada primero.',
        409
      )
    )

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Distribuidora MarJuanC Alimentos' })
    await user.click(screen.getByRole('button', { name: 'Quitar presentación de Harina de trigo 000' }))

    expect(screen.getByRole('dialog')).toHaveTextContent('¿Quitar presentación de Harina de trigo 000?')
    await user.click(screen.getByRole('button', { name: 'Sí, quitar' }))

    expect(
      await screen.findByText(
        'No puedes eliminar la presentación predeterminada mientras existan otras. Selecciona otra como predeterminada primero.'
      )
    ).toBeInTheDocument()
    expect(supplierService.removePackaging).toHaveBeenCalledWith(expect.any(Function), 'sup-marjuanc', 'ing-1')
  })

  it('permite conmutar la presentación como predeterminada actualizando el insumo', async () => {
    const user = userEvent.setup()
    vi.mocked(supplierService.addPackaging).mockResolvedValue({
      supplierIngredient: {
        id: 'si-4',
        supplierId: 'sup-marjuanc',
        ingredientId: 'ing-4',
        packageSize: 5,
        packageUnit: 'kg',
        packagePrice: 50254.7,
        isDefault: true,
      },
      unitCost: 10050.94,
    })

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Distribuidora MarJuanC Alimentos' })
    await user.click(screen.getByRole('button', { name: 'Hacer predeterminada' }))

    await waitFor(() => {
      expect(supplierService.addPackaging).toHaveBeenCalledWith(
        expect.any(Function),
        'sup-marjuanc',
        expect.objectContaining({
          ingredientId: 'ing-4',
          isDefault: true,
        })
      )
    })
    expect(
      await screen.findByText('Presentación de "Manteca en bloque mayorista" establecida como predeterminada')
    ).toBeInTheDocument()

    // Regresión [RV341-B1]: Manteca se vuelve predeterminada sin desmarcar a Harina 000, Harina 0000 ni Azúcar
    const list = screen.getByRole('list', { name: 'Presentaciones mayoristas' })
    const items = within(list).getAllByRole('listitem')
    expect(within(items[0]).getByText('Predeterminada')).toBeInTheDocument()
    expect(within(items[1]).getByText('Predeterminada')).toBeInTheDocument()
    expect(within(items[2]).getByText('Predeterminada')).toBeInTheDocument()
    expect(within(items[3]).getByText('Predeterminada')).toBeInTheDocument()
  })

  it('muestra estado de error con botón Reintentar si falla la carga inicial', async () => {
    const user = userEvent.setup()
    vi.mocked(supplierService.getPage).mockRejectedValueOnce(new TypeError('Failed to fetch'))

    renderPage()

    expect(await screen.findByText('Error al cargar el proveedor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument()

    vi.mocked(supplierService.getPage).mockResolvedValueOnce(unaPagina(mockSupplier))
    await user.click(screen.getByRole('button', { name: /reintentar/i }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Distribuidora MarJuanC Alimentos' })).toBeInTheDocument()
  })
})
describe('SupplierDetailPage - presentaciones paginadas y búsqueda (#350)', () => {
  const TOTAL = 67
  const presentacion = (i: number) => ({
    id: `si-${i}`,
    supplierCode: `ART${String(i).padStart(3, '0')}`,
    rawDescription: `ARTICULO ${i}`,
    packageSize: 25,
    packageUnit: 'kg',
    packagePrice: 18406.25,
    isDefault: i % 2 === 0,
    isQuarantined: i === 66,
    ingredient: { id: `ing-${i}`, name: `Harina de trigo 000 lote ${i}`, unit: 'kg' },
  })
  const semillas = { ...presentacion(60), id: 'si-sesamo', ingredient: { id: 'ing-sesamo', name: 'Semillas de sésamo La Molinera', unit: 'kg' } }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supplierService.getPage).mockImplementation(async (_getToken, _id, params) => {
      if (params.search) {
        return { supplier: { ...mockSupplier, ingredients: [semillas] }, meta: { total: 1, page: 1, limit: params.limit, totalPages: 1 } }
      }
      const start = (params.page - 1) * params.limit
      const ingredients = Array.from({ length: Math.min(params.limit, TOTAL - start) }, (_, i) => presentacion(start + i))
      return {
        supplier: { ...mockSupplier, ingredients },
        meta: { total: TOTAL, page: params.page, limit: params.limit, totalPages: Math.ceil(TOTAL / params.limit) },
      }
    })
  })

  it('muestra 20 de 67 presentaciones con paginador y contadores sobre el total', async () => {
    renderPage()

    expect(await screen.findByText('Presentaciones del proveedor (67)')).toBeInTheDocument()
    expect(screen.getByText('Mostrando 1–20 de 67 presentaciones')).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Presentaciones mayoristas' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(20)

    // Predeterminadas y en cuarentena se cuentan sobre las 67, no sobre la página visible.
    const predeterminadas = within(screen.getByText('Predeterminadas').parentElement as HTMLElement)
    await waitFor(() => expect(predeterminadas.getByText('34')).toBeInTheDocument())
    expect(within(screen.getByText('En cuarentena').parentElement as HTMLElement).getByText('1')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(await screen.findByText('Mostrando 21–40 de 67 presentaciones')).toBeInTheDocument()
    expect(supplierService.getPage).toHaveBeenCalledWith(expect.any(Function), 'sup-marjuanc', { page: 2, limit: 20, search: '' })
  })

  it('busca presentaciones en la API y avisa si no hay coincidencias', async () => {
    renderPage()
    await screen.findByText('Mostrando 1–20 de 67 presentaciones')

    fireEvent.change(screen.getByLabelText('Buscar presentaciones por insumo o código'), { target: { value: 'sesamo' } })
    expect(await screen.findByText('Semillas de sésamo La Molinera', undefined, BUSQUEDA)).toBeInTheDocument()
    expect(supplierService.getPage).toHaveBeenLastCalledWith(expect.any(Function), 'sup-marjuanc', { page: 1, limit: 20, search: 'sesamo' })

    vi.mocked(supplierService.getPage).mockResolvedValueOnce({
      supplier: { ...mockSupplier, ingredients: [] },
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    })
    fireEvent.change(screen.getByLabelText('Buscar presentaciones por insumo o código'), { target: { value: 'azafran' } })
    expect(await screen.findByText('No hay presentaciones que coincidan con "azafran".', undefined, BUSQUEDA)).toBeInTheDocument()
  })
})

describe('SupplierDetailPage - datos del proveedor (#362)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supplierService.getPage).mockResolvedValue(unaPagina(mockSupplier))
  })

  it('agrupa teléfono, correo y dirección en una lista rotulada debajo del nombre', async () => {
    renderPage()
    const titulo = await screen.findByRole('heading', { level: 1, name: 'Distribuidora MarJuanC Alimentos' })
    const datos = screen.getByRole('list', { name: 'Datos de contacto' })
    const items = within(datos).getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual([
      'Teléfono: +54 11 3758-0195',
      'Correo: ventas@marjuanc.com',
      'Dirección: Grito de Asencio 3632',
    ])
    // Misma columna que el nombre: se lee de arriba hacia abajo y no compite con el título.
    expect(titulo.closest('[data-testid="supplier-identity"]')).toContainElement(datos)
    for (const li of items) {
      expect(li.className.split(/\s+/)).toEqual(expect.arrayContaining(['min-w-0', 'max-w-full', 'wrap-anywhere']))
    }
  })

  it('sin datos de contacto no muestra una lista vacía', async () => {
    vi.mocked(supplierService.getPage).mockResolvedValue(
      unaPagina({ ...mockSupplier, contactPhone: null, email: null, address: null })
    )
    renderPage()
    await screen.findByRole('heading', { level: 1, name: 'Distribuidora MarJuanC Alimentos' })
    expect(screen.queryByRole('list', { name: 'Datos de contacto' })).toBeNull()
  })
})
