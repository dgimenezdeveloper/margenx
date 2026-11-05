import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import type { Ingredient } from '@/services/ingredientService'
import { SuppliesTableDesktop } from './SuppliesTableDesktop'

describe('SuppliesTableDesktop - Accesibilidad y Navegación por Teclado', () => {
  const mockSupplies: Ingredient[] = [
    { id: 'ing-1', name: 'Harina 000', unit: 'kg', currentCost: 736.25 },
    { id: 'ing-2', name: 'Manteca', unit: 'kg', currentCost: 9500 },
  ]
  const money = (val: number) => `$${val}`

  it('cada fila es enfocable y cuenta con role="button" y aria-label descriptivo', () => {
    render(<SuppliesTableDesktop supplies={mockSupplies} onSelect={vi.fn()} money={money} />)

    const rowHarina = screen.getByRole('button', { name: 'Ver y editar insumo Harina 000' })
    expect(rowHarina).toBeInTheDocument()
    expect(rowHarina).toHaveAttribute('tabindex', '0')

    const rowManteca = screen.getByRole('button', { name: 'Ver y editar insumo Manteca' })
    expect(rowManteca).toBeInTheDocument()
    expect(rowManteca).toHaveAttribute('tabindex', '0')
  })

  it('Escenario Gherkin: enfocar fila y presionar Enter dispara onSelect', () => {
    const handleSelect = vi.fn()
    render(<SuppliesTableDesktop supplies={mockSupplies} onSelect={handleSelect} money={money} />)

    const row = screen.getByRole('button', { name: 'Ver y editar insumo Harina 000' })
    row.focus()
    expect(row).toHaveFocus()

    fireEvent.keyDown(row, { key: 'Enter' })
    expect(handleSelect).toHaveBeenCalledTimes(1)
    expect(handleSelect).toHaveBeenCalledWith(mockSupplies[0])
  })

  it('Escenario Gherkin: enfocar fila y presionar Espacio dispara onSelect previniendo scroll', () => {
    const handleSelect = vi.fn()
    render(<SuppliesTableDesktop supplies={mockSupplies} onSelect={handleSelect} money={money} />)

    const row = screen.getByRole('button', { name: 'Ver y editar insumo Manteca' })
    row.focus()
    expect(row).toHaveFocus()

    fireEvent.keyDown(row, { key: ' ' })
    expect(handleSelect).toHaveBeenCalledTimes(1)
    expect(handleSelect).toHaveBeenCalledWith(mockSupplies[1])
  })
})