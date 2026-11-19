import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { QuickCreateIngredientModal } from '@/components/quick-create-ingredient-modal'
import { ApiError } from '@/services/api'
import { ingredientService, type Ingredient } from '@/services/ingredientService'

const getToken = vi.fn().mockResolvedValue('token')
vi.mock('@clerk/clerk-react', () => ({ useAuth: () => ({ getToken }) }))
vi.mock('@/services/ingredientService', () => ({ ingredientService: { create: vi.fn() } }))

describe('QuickCreateIngredientModal (#357)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('prellena el nombre, crea en es-AR y entrega el insumo creado', async () => {
    const created = { id: 'cacao', name: 'Cacao amargo', unit: 'kg', currentCost: 12000 } as Ingredient
    vi.mocked(ingredientService.create).mockResolvedValue(created)
    const onCreated = vi.fn()
    const user = userEvent.setup()
    render(<QuickCreateIngredientModal isOpen initialName="Cacao amargo" onClose={vi.fn()} onCreated={onCreated} />)

    expect(screen.getByLabelText('Nombre del insumo')).toHaveValue('Cacao amargo')
    await user.type(screen.getByLabelText(/Costo unitario/), '12000')
    await user.click(screen.getByRole('button', { name: 'Crear Insumo' }))

    await waitFor(() => expect(ingredientService.create).toHaveBeenCalled())
    expect(onCreated).toHaveBeenCalledWith(created)
  })

  it('muestra 409 en el campo nombre', async () => {
    vi.mocked(ingredientService.create).mockRejectedValue(new ApiError('Ya existe un insumo con ese nombre.', 409))
    const user = userEvent.setup()
    render(<QuickCreateIngredientModal isOpen onClose={vi.fn()} onCreated={vi.fn()} />)
    await user.type(screen.getByLabelText('Nombre del insumo'), 'Harina 000')
    await user.type(screen.getByLabelText(/Costo unitario/), '750')
    await user.click(screen.getByRole('button', { name: 'Crear Insumo' }))
    expect(await screen.findByText('Ya existe un insumo con ese nombre.')).toBeInTheDocument()
  })
})
