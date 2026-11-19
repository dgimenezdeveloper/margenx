import '@testing-library/jest-dom'
import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RecipeIngredientCombobox } from '@/components/recipe-ingredient-combobox'
import type { Ingredient } from '@/services/ingredientService'

vi.mock('@clerk/clerk-react', () => ({ useAuth: () => ({ getToken: vi.fn().mockResolvedValue('token') }) }))
vi.mock('@/hooks/useIngredientSearch', () => ({ useIngredientSearch: () => ({ results: null, isSearching: false }) }))

const HARINA = { id: 'harina', name: 'Harina 000', unit: 'kg', currentCost: 850 } as Ingredient
const MANTECA = { id: 'manteca', name: 'Manteca', unit: 'kg', currentCost: 9500 } as Ingredient

function Harness({ existing = [] as string[], onCreate = vi.fn() }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Ingredient>()
  return (
    <>
      <button type="button">Botón externo</button>
      <RecipeIngredientCombobox supplies={[HARINA, MANTECA]} selectedSupply={selected} existingIngredientIds={existing} isOpen={open} onOpenChange={setOpen} onSelect={setSelected} onOpenQuickCreate={onCreate} label="Seleccionar Insumo" />
    </>
  )
}

describe('RecipeIngredientCombobox (#357)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('expone combobox, listbox y options y navega con teclado', async () => {
    const user = userEvent.setup()
    render(<Harness existing={[HARINA.id]} />)
    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await user.click(trigger)

    const input = screen.getByRole('combobox')
    expect(input).toHaveAttribute('aria-expanded', 'true')
    const listbox = screen.getByRole('listbox', { name: 'Insumos disponibles' })
    expect(within(listbox).getAllByRole('option')).toHaveLength(3)

    await user.keyboard('{ArrowDown}')
    const manteca = screen.getByRole('option', { name: /Manteca/ })
    expect(input).toHaveAttribute('aria-activedescendant', manteca.id)
    await user.keyboard('{Enter}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveTextContent('Manteca')
  })

  it('Escape cierra solo la lista y cierra al hacer clic fuera sin robar foco', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('combobox'))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveFocus()

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('button', { name: 'Botón externo' }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('marca repetidos como disabled y permite iniciar alta rápida', async () => {
    const onCreate = vi.fn()
    const user = userEvent.setup()
    render(<Harness existing={[HARINA.id]} onCreate={onCreate} />)
    await user.click(screen.getByRole('combobox'))

    const repeated = screen.getByRole('option', { name: /Harina 000/ })
    expect(repeated).toHaveTextContent('Ya en la receta')
    expect(repeated).toBeDisabled()
    await user.type(screen.getByRole('combobox'), 'Cacao')
    await user.click(screen.getByRole('option', { name: '+ Crear nuevo insumo' }))
    expect(onCreate).toHaveBeenCalledWith('Cacao')
  })
})
