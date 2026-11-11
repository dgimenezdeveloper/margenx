import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ingredientService, type Ingredient } from '@/services/ingredientService'
import { useRecipeStore } from '@/stores/useRecipeStore'
import NewProductPage from './page'

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
  ingredientService: { getAll: vi.fn() },
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
