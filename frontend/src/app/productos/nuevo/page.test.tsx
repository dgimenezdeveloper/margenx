import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ingredientService, type Ingredient } from '@/services/ingredientService'
import { useRecipeStore } from '@/stores/useRecipeStore'
import NewProductPage from './page'

/** La búsqueda espera 300 ms antes de ir a la API: margen para entornos cargados. */
const BUSQUEDA = { timeout: 3000 }

const getToken = vi.fn().mockResolvedValue('token')

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken }),
}))

vi.mock('@/lib/useCurrentUser', () => ({
  useCurrentUser: () => ({ defaultMinMarginPercent: 30, isLoading: false }),
}))

vi.mock('@/services/productService', () => ({
  productService: { create: vi.fn() },
}))

vi.mock('@/services/ingredientService', () => ({
  ingredientService: { getAll: vi.fn(), list: vi.fn(), create: vi.fn() },
}))

// Insumo de panadería que se compra por kg
const levadura = { id: 'ing-lev', name: 'Levadura fresca', unit: 'kg', currentCost: 4800 } as Ingredient

function renderPage() {
  const router = createMemoryRouter([{ path: '/productos/nuevo', element: <NewProductPage /> }], {
    initialEntries: ['/productos/nuevo'],
  })
  render(<RouterProvider router={router} />)
}

// Al salir del campo se vuelve a montar con la cantidad vigente: siempre se busca de nuevo
const campoLevadura = () => screen.getByLabelText('Cantidad de Levadura fresca')
const cantidadEnReceta = () => useRecipeStore.getState().items[0]?.quantity

async function agregarLevadura() {
  const user = userEvent.setup()
  renderPage()
  const agregar = await screen.findByRole('button', { name: /Agregar Insumo a la Receta/i })
  await vi.waitFor(() => expect(agregar).toBeEnabled())
  await user.click(agregar)
  // Se agrega con la cantidad por defecto del formulario: 100 gr
  expect(campoLevadura()).toHaveValue('100')
  return user
}

describe('NewProductPage - edición de cantidades en la lista de receta', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ingredientService.getAll).mockResolvedValue([levadura])
  })

  it('una cantidad menor al mínimo se avisa, no cambia la receta y se restaura la vigente', async () => {
    const user = await agregarLevadura()

    await user.clear(campoLevadura())
    await user.type(campoLevadura(), '0,3')
    await user.tab()

    expect(screen.getByRole('status')).toHaveTextContent(
      'Es menor al mínimo que se puede guardar (0,001 kg). Se mantiene 100 gr.'
    )
    expect(campoLevadura()).toHaveValue('100')
    expect(cantidadEnReceta()).toBe(0.1)
  })

  it('una cantidad que se redondea se avisa y la receta guarda lo mismo que se muestra', async () => {
    const user = await agregarLevadura()

    await user.clear(campoLevadura())
    await user.type(campoLevadura(), '0,5')
    await user.tab()

    expect(screen.getByRole('status')).toHaveTextContent('Se guarda como 1 gr (0,001 kg): hasta 3 decimales en kg.')
    expect(campoLevadura()).toHaveValue('1')
    expect(cantidadEnReceta()).toBe(0.001)
  })
})

describe('NewProductPage - selector de insumos que busca en la API (#350)', () => {
  const sesamo = { id: 'ing-sesamo', name: 'Semillas de sésamo La Molinera', unit: 'kg', currentCost: 5400 } as Ingredient

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ingredientService.getAll).mockResolvedValue([levadura])
  })

  it('escribir "sesamo" consulta la API y permite sumar un insumo que no estaba en la lista cargada', async () => {
    vi.mocked(ingredientService.list).mockResolvedValue({
      items: [sesamo],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('combobox', { name: /Levadura fresca/ }))
    await user.type(screen.getByPlaceholderText('Filtrar por nombre...'), 'sesamo')

    await user.click(await screen.findByRole('option', { name: /Semillas de sésamo La Molinera/ }, BUSQUEDA))
    expect(ingredientService.list).toHaveBeenLastCalledWith(getToken, { page: 1, limit: 100, search: 'sesamo' })

    await user.click(screen.getByRole('button', { name: /Agregar Insumo a la Receta/i }))
    expect(useRecipeStore.getState().items[0]?.ingredientId).toBe('ing-sesamo')
  })

  it('mientras busca lo indica y, sin coincidencias, avisa que no hay insumos', async () => {
    let resolver: (value: Awaited<ReturnType<typeof ingredientService.list>>) => void = () => {}
    vi.mocked(ingredientService.list).mockReturnValue(new Promise((resolve) => { resolver = resolve }))
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('combobox', { name: /Levadura fresca/ }))
    await user.type(screen.getByPlaceholderText('Filtrar por nombre...'), 'azafran')

    expect(screen.getByText('Buscando insumos...')).toBeInTheDocument()
    await vi.waitFor(() => expect(ingredientService.list).toHaveBeenCalled())
    resolver({ items: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } })
    expect(await screen.findByText('No se encontraron insumos con ese nombre.', undefined, BUSQUEDA)).toBeInTheDocument()
  })
})

describe('NewProductPage - barra de abajo en mobile y zona segura de iOS (#406)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ingredientService.getAll).mockResolvedValue([levadura])
  })

  it('la barra de guardado queda apoyada sobre la BottomNav, a la misma altura que en la ficha del producto', async () => {
    renderPage()
    const botones = await screen.findAllByRole('button', { name: /Guardar Producto/i })
    const barra = botones.map((boton) => boton.closest('footer')).find(Boolean)

    // La BottomNav mide 3.125rem más su relleno inferior, que incluye la zona segura
    expect(barra).toHaveClass('bottom-[calc(3.125rem+max(0.75rem,env(safe-area-inset-bottom)))]')
  })

  it('el final del formulario deja lugar a la barra de guardado, la BottomNav y la zona segura de iOS', async () => {
    renderPage()
    await screen.findAllByRole('button', { name: /Guardar Producto/i })

    // Barra de guardado (90 px) + BottomNav (50 px + max(12 px, zona segura)) entran en 11rem + zona segura
    expect(screen.getByRole('main')).toHaveClass('pb-[calc(11rem+env(safe-area-inset-bottom))]')
  })
})
