import '@testing-library/jest-dom'
import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RecipeIngredientCombobox } from '@/components/recipe-ingredient-combobox'
import type { Ingredient } from '@/services/ingredientService'

vi.mock('@clerk/clerk-react', () => ({ useAuth: () => ({ getToken: vi.fn().mockResolvedValue('token') }) }))
// Búsqueda remota simulada: cada prueba decide si está pendiente o qué devolvió.
const busqueda = vi.hoisted(() => ({ estado: { results: null as unknown[] | null, isSearching: false } }))
vi.mock('@/hooks/useIngredientSearch', () => ({ useIngredientSearch: () => busqueda.estado }))

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
  beforeEach(() => {
    vi.clearAllMocks()
    busqueda.estado = { results: null, isSearching: false }
  })

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

  describe('teclado y opción de crear con la búsqueda remota (#432)', () => {
    it('Escenario "Teclado antes de los resultados": con la búsqueda pendiente, ↓ y Enter no abren "Crear nuevo insumo"', async () => {
      const onCreate = vi.fn()
      const user = userEvent.setup()
      render(<Harness onCreate={onCreate} />)
      await user.click(screen.getByRole('combobox'))
      busqueda.estado = { results: null, isSearching: true }
      await user.keyboard('har')

      expect(screen.getByText('Buscando insumos...')).toBeInTheDocument()
      expect(screen.queryByRole('option', { name: /Crear nuevo insumo/ })).toBeNull()

      await user.keyboard('{ArrowDown}{Enter}')
      expect(onCreate).not.toHaveBeenCalled()
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    it('con los resultados, ↓ y Enter eligen el primer insumo que coincide', async () => {
      const onCreate = vi.fn()
      const user = userEvent.setup()
      busqueda.estado = { results: [HARINA], isSearching: false }
      render(<Harness onCreate={onCreate} />)
      await user.click(screen.getByRole('combobox'))
      await user.keyboard('har{ArrowDown}{Enter}')

      expect(onCreate).not.toHaveBeenCalled()
      expect(screen.getByRole('combobox')).toHaveTextContent('Harina 000')
    })

    it('Escenario "Un solo signo": sin coincidencia exacta ofrece "+ Crear nuevo insumo" con un solo "+"', async () => {
      const user = userEvent.setup()
      busqueda.estado = { results: [HARINA], isSearching: false }
      render(<Harness />)
      await user.click(screen.getByRole('combobox'))
      await user.keyboard('har')

      const crear = screen.getByRole('option', { name: '+ Crear nuevo insumo' })
      expect(crear.textContent).toBe('+ Crear nuevo insumo')
      expect(crear.querySelector('svg')).toBeNull()
    })

    it('si la búsqueda encontró el insumo con el mismo nombre (sin tildes ni mayúsculas), no ofrece crearlo de nuevo', async () => {
      const user = userEvent.setup()
      busqueda.estado = { results: [HARINA], isSearching: false }
      render(<Harness />)
      await user.click(screen.getByRole('combobox'))
      await user.keyboard('HARINA 000')

      expect(screen.getByRole('option', { name: /Harina 000/ })).toBeInTheDocument()
      expect(screen.queryByRole('option', { name: /Crear nuevo insumo/ })).toBeNull()
    })

    it('la cruz para limpiar la búsqueda muestra el cursor de mano', async () => {
      const user = userEvent.setup()
      busqueda.estado = { results: [HARINA], isSearching: false }
      render(<Harness />)
      await user.click(screen.getByRole('combobox'))
      await user.keyboard('har')

      expect(screen.getByRole('button', { name: 'Limpiar búsqueda' })).toHaveClass('cursor-pointer')
    })
  })
})
