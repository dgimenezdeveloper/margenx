import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/services/api'
import { productService, type Product } from '@/services/productService'
import ProductsPage from './page'

/** La búsqueda espera 300 ms antes de ir a la API: margen para entornos cargados. */
const BUSQUEDA = { timeout: 3000 }

const getToken = vi.fn().mockResolvedValue('token')
const currentUser: { role: 'ADMIN' | 'COLLABORATOR' } = { role: 'ADMIN' }

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken }),
}))

vi.mock('@/lib/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: currentUser }),
}))

vi.mock('@/components/navbar', () => ({ Navbar: () => null }))
vi.mock('@/components/bottom-nav', () => ({ BottomNav: () => null }))
vi.mock('@/components/desktop-footer', () => ({ DesktopFooter: () => null }))

vi.mock('@/services/productService', () => ({
  productService: { list: vi.fn() },
}))

const TOTAL = 339
const producto = (i: number): Product => ({
  id: `prod-${i}`,
  name: `Medialuna de manteca ${i}`,
  salePrice: 950,
  cost: 410,
  marginPercent: 56.84,
  minMarginPercent: 30,
  ingredients: [],
})
const panDeSesamo: Product = { ...producto(250), id: 'prod-sesamo', name: 'Pan de hamburguesa con sésamo' }

const renderPage = () =>
  render(
    <MemoryRouter>
      <ProductsPage />
    </MemoryRouter>
  )

describe('ProductsPage - paginación y búsqueda en la API (#350)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentUser.role = 'ADMIN'
    vi.mocked(productService.list).mockImplementation(async (_getToken, params) => {
      if (params.search) {
        return { items: [panDeSesamo], meta: { total: 1, page: 1, limit: params.limit, totalPages: 1 } }
      }
      const start = (params.page - 1) * params.limit
      const items = Array.from({ length: Math.min(params.limit, TOTAL - start) }, (_, i) => producto(start + i))
      return { items, meta: { total: TOTAL, page: params.page, limit: params.limit, totalPages: Math.ceil(TOTAL / params.limit) } }
    })
  })

  it('muestra el total real del catálogo y navega con el paginador', async () => {
    renderPage()

    expect(await screen.findByText('Mostrando 1–20 de 339 productos')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))

    expect(await screen.findByText('Mostrando 21–40 de 339 productos')).toBeInTheDocument()
    expect(productService.list).toHaveBeenLastCalledWith(getToken, { page: 2, limit: 20, search: '' })
  })

  it('en mobile, "Cargar más" suma la página siguiente', async () => {
    renderPage()
    expect(await screen.findByText('Mostrando 20 de 339 productos')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cargar más' }))

    expect(await screen.findByText('Mostrando 40 de 339 productos')).toBeInTheDocument()
  })

  it('busca contra la API y encuentra un producto fuera de la primera página', async () => {
    renderPage()
    await screen.findByText('Mostrando 1–20 de 339 productos')

    fireEvent.change(screen.getByLabelText('Buscar productos por nombre'), { target: { value: 'sesamo' } })

    expect((await screen.findAllByText('Pan de hamburguesa con sésamo', undefined, BUSQUEDA)).length).toBeGreaterThan(0)
    expect(productService.list).toHaveBeenLastCalledWith(getToken, { page: 1, limit: 20, search: 'sesamo' })
  })

  it('una búsqueda sin resultados muestra el término buscado', async () => {
    vi.mocked(productService.list).mockImplementation(async (_getToken, params) =>
      params.search
        ? { items: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }
        : { items: [producto(1)], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } }
    )
    renderPage()
    await screen.findAllByText('Medialuna de manteca 1')

    fireEvent.change(screen.getByLabelText('Buscar productos por nombre'), { target: { value: 'chipa' } })

    expect(await screen.findByText('No hay productos que coincidan con la búsqueda "chipa".', undefined, BUSQUEDA)).toBeInTheDocument()
  })

  it('sin productos muestra el estado vacío y no el paginador', async () => {
    vi.mocked(productService.list).mockResolvedValue({ items: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } })
    renderPage()

    expect(await screen.findByText('Aún no tenés productos cargados')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Paginación de productos' })).toBeNull()
  })

  it('el colaborador ve el catálogo paginado sin columnas financieras', async () => {
    currentUser.role = 'COLLABORATOR'
    renderPage()

    await screen.findByText('Mostrando 1–20 de 339 productos')
    expect(screen.queryByText('Costo (Receta)')).toBeNull()
    expect(screen.queryByText('Margen')).toBeNull()
  })

  it('muestra el error de la API si la carga falla', async () => {
    vi.mocked(productService.list).mockRejectedValueOnce(new ApiError('No autorizado.', 401))
    renderPage()

    await waitFor(() => expect(screen.getByText('No autorizado.')).toBeInTheDocument())
  })
})

describe('ProductsPage - aviso al colaborador redirigido (#364)', () => {
  const renderRedirigido = (state: unknown) => {
    const router = createMemoryRouter([{ path: '/productos', element: <ProductsPage /> }], {
      initialEntries: [{ pathname: '/productos', state }],
    })
    render(<RouterProvider router={router} />)
    return router
  }

  beforeEach(() => {
    vi.clearAllMocks()
    currentUser.role = 'COLLABORATOR'
    vi.mocked(productService.list).mockResolvedValue({
      items: [producto(1)],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    })
  })

  it('Escenario Gherkin "Colaborador redirigido": al volver desde /insumos ve que esa pantalla es del administrador', async () => {
    renderRedirigido({ adminOnlyFrom: '/insumos' })

    const aviso = await screen.findByRole('status')
    expect(aviso).toHaveTextContent('Esa pantalla es solo para el administrador')
    expect(aviso).toHaveTextContent('Te trajimos al catálogo de productos.')
  })

  it('el aviso se consume: el estado del historial se limpia para que recargar no lo repita', async () => {
    const router = renderRedirigido({ adminOnlyFrom: '/proveedores/cuarentena' })

    await screen.findByText('Esa pantalla es solo para el administrador')
    await waitFor(() => expect(router.state.location.state).toBeNull())
    expect(router.state.location.pathname).toBe('/productos')
  })

  it('el aviso se puede cerrar con la X', async () => {
    renderRedirigido({ adminOnlyFrom: '/productos/nuevo' })

    await screen.findByText('Esa pantalla es solo para el administrador')
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar notificación' }))

    await waitFor(() =>
      expect(screen.queryByText('Esa pantalla es solo para el administrador')).not.toBeInTheDocument()
    )
  })

  it('entrar a /productos de forma normal no muestra ningún aviso', async () => {
    renderRedirigido(null)

    expect((await screen.findAllByText('Medialuna de manteca 1')).length).toBeGreaterThan(0)
    expect(screen.queryByText('Esa pantalla es solo para el administrador')).not.toBeInTheDocument()
  })
})
