import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ingredientService, type Ingredient } from '@/services/ingredientService'
import { ProductAddIngredientModal } from './ProductAddIngredientModal'

/** La búsqueda espera 300 ms antes de ir a la API: margen para entornos cargados. */
const BUSQUEDA = { timeout: 3000 }

const getToken = vi.fn().mockResolvedValue('token')

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken }),
}))

vi.mock('@/services/ingredientService', () => ({
  ingredientService: { list: vi.fn(), create: vi.fn() },
}))

const harina = { id: 'ing-harina', name: 'Harina de trigo 000 Olavarriense', unit: 'kg', currentCost: 736.25 } as Ingredient
const sesamo = { id: 'ing-sesamo', name: 'Semillas de sésamo La Molinera', unit: 'kg', currentCost: 5400 } as Ingredient

describe('ProductAddIngredientModal - búsqueda en la API (#350)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('busca "sesamo" en la API y suma el insumo elegido aunque no esté en la despensa cargada', async () => {
    vi.mocked(ingredientService.list).mockResolvedValue({
      items: [sesamo],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    })
    const onAdd = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(
      <ProductAddIngredientModal isOpen onClose={vi.fn()} availablePantry={[harina]} isLoadingSupplies={false} onAdd={onAdd} />
    )

    await user.click(screen.getByRole('combobox', { name: /Seleccionar Insumo/i }))
    await user.type(screen.getByPlaceholderText(/Filtrar/), 'sesamo')
    await user.click(await screen.findByRole('option', { name: /Semillas de sésamo La Molinera/ }, BUSQUEDA))

    expect(ingredientService.list).toHaveBeenLastCalledWith(getToken, { page: 1, limit: 100, search: 'sesamo' })
    expect(screen.getByText(/Semillas de sésamo La Molinera \(/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Sumar a la receta|Agregar/i }))
    expect(onAdd).toHaveBeenCalledWith(sesamo, expect.any(Number), expect.any(String), expect.any(Number))
  })

  it('sin coincidencias avisa que no hay insumos', async () => {
    vi.mocked(ingredientService.list).mockResolvedValue({
      items: [],
      meta: { total: 0, page: 1, limit: 100, totalPages: 0 },
    })
    const user = userEvent.setup()
    render(
      <ProductAddIngredientModal isOpen onClose={vi.fn()} availablePantry={[harina]} isLoadingSupplies={false} onAdd={vi.fn()} />
    )

    await user.click(screen.getByRole('combobox', { name: /Seleccionar Insumo/i }))
    await user.type(screen.getByPlaceholderText(/Filtrar/), 'azafran')

    expect(screen.getByText('Buscando insumos...')).toBeInTheDocument()
    expect(await screen.findByText('No se encontraron insumos.', undefined, BUSQUEDA)).toBeInTheDocument()
  })
})
