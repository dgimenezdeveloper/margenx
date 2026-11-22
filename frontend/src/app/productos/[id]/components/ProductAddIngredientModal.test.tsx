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

describe('ProductAddIngredientModal - selector de la receta (#357)', () => {
  const azafran = { id: 'ing-azafran', name: 'Azafrán en hebras', unit: 'kg', currentCost: 85000.5 } as Ingredient

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ingredientService.list).mockResolvedValue({
      items: [],
      meta: { total: 0, page: 1, limit: 100, totalPages: 0 },
    })
  })

  it('no preselecciona un insumo que ya está en la receta y lo muestra como "Ya en la receta"', async () => {
    const user = userEvent.setup()
    render(
      <ProductAddIngredientModal isOpen onClose={vi.fn()} availablePantry={[harina, sesamo]} existingIngredientIds={[harina.id]} isLoadingSupplies={false} onAdd={vi.fn()} />
    )

    const trigger = screen.getByRole('combobox', { name: /Seleccionar Insumo/i })
    expect(trigger).toHaveTextContent('Semillas de sésamo La Molinera')
    expect(trigger).not.toHaveTextContent('Harina de trigo 000 Olavarriense')

    await user.click(trigger)
    const repetida = screen.getByRole('option', { name: /Harina de trigo 000 Olavarriense/ })
    expect(repetida).toHaveTextContent('Ya en la receta')
    expect(repetida).toHaveAttribute('aria-disabled', 'true')
    expect(repetida).toBeDisabled()
  })

  it('Escape con la lista abierta cierra solo la lista y el modal sigue abierto', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <ProductAddIngredientModal isOpen onClose={onClose} availablePantry={[harina, sesamo]} isLoadingSupplies={false} onAdd={vi.fn()} />
    )

    await user.click(screen.getByRole('combobox', { name: /Seleccionar Insumo/i }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Sumar Insumo a la Receta' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /Seleccionar Insumo/i })).toHaveFocus()
    expect(onClose).not.toHaveBeenCalled()

    // Con la lista cerrada, Escape sí cierra el modal.
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('un clic en "Cantidad utilizada" cierra la lista y deja el modal abierto', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <ProductAddIngredientModal isOpen onClose={onClose} availablePantry={[harina, sesamo]} isLoadingSupplies={false} onAdd={vi.fn()} />
    )

    await user.click(screen.getByRole('combobox', { name: /Seleccionar Insumo/i }))
    await user.click(screen.getByLabelText('Cantidad utilizada'))

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Sumar Insumo a la Receta' })).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('alta rápida: el insumo creado queda elegido y se puede sumar sin cerrar el modal', async () => {
    vi.mocked(ingredientService.create).mockResolvedValue(azafran)
    const onClose = vi.fn()
    const onAdd = vi.fn().mockResolvedValue(undefined)
    const onIngredientCreated = vi.fn()
    const user = userEvent.setup()
    render(
      <ProductAddIngredientModal isOpen onClose={onClose} availablePantry={[harina]} existingIngredientIds={[harina.id]} isLoadingSupplies={false} onAdd={onAdd} onIngredientCreated={onIngredientCreated} />
    )

    await user.click(screen.getByRole('combobox', { name: /Seleccionar Insumo/i }))
    await user.type(screen.getByPlaceholderText(/Filtrar/), 'Azafrán en hebras')
    // "Crear" aparece recién cuando termina la búsqueda (#432).
    await user.click(await screen.findByRole('option', { name: '+ Crear nuevo insumo' }))

    expect(await screen.findByRole('dialog', { name: 'Nuevo insumo' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre del insumo')).toHaveValue('Azafrán en hebras')
    await user.type(screen.getByLabelText(/Costo unitario/), '85000,50')
    await user.click(screen.getByRole('button', { name: 'Crear Insumo' }))

    await vi.waitFor(() => expect(onIngredientCreated).toHaveBeenCalledWith(azafran))
    expect(ingredientService.create).toHaveBeenCalledWith(getToken, { name: 'Azafrán en hebras', unit: 'kg', currentCost: 85000.5 })
    await vi.waitFor(() => expect(screen.queryByRole('dialog', { name: 'Nuevo insumo' })).not.toBeInTheDocument())
    expect(screen.getByRole('combobox', { name: /Seleccionar Insumo/i })).toHaveTextContent('Azafrán en hebras')
    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /Agregar/i }))
    expect(onAdd).toHaveBeenCalledWith(azafran, expect.any(Number), expect.any(String), expect.any(Number))
  })
})
