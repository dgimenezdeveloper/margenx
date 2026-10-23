import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'
import { QuarantineList } from './QuarantineList'

// Mock de useAuth
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: vi.fn() })
}))

// Mock del store
vi.mock('@/stores/useQuarantineStore', () => ({
  useQuarantineStore: () => ({
    removeItemLocally: vi.fn()
  })
}))

const mockItems = [
  {
    id: 'q1',
    ingredientId: 'ing1',
    supplierId: 'sup1',
    packagePrice: 20000,
    packageSize: 10,
    isDefault: true,
    isQuarantined: true,
    ingredient: { id: 'ing1', name: 'Harina', currentCost: 1000 },
    supplier: { id: 'sup1', name: 'Molino' }
  }
]

describe('QuarantineList', () => {
  it('renderiza la tabla con los datos correctos', () => {
    render(<QuarantineList items={mockItems} onShowToast={vi.fn()} />)
    expect(screen.getAllByText('Harina').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Molino').length).toBeGreaterThan(0)
    // 20000 / 10 = 2000 propuesto vs 1000 actual (+100%)
    expect(screen.getAllByText('+100.0%').length).toBeGreaterThan(0)
  })

  it('abre el modal de confirmación al hacer clic en Liberar', () => {
    render(<QuarantineList items={mockItems} onShowToast={vi.fn()} />)
    const releaseBtns = screen.getAllByText('Liberar')
    fireEvent.click(releaseBtns[0]) // Click en desktop
    expect(screen.getByText('¿Liberar precio?')).toBeInTheDocument()
  })

  it('abre el modal de confirmación al hacer clic en Rechazar', () => {
    render(<QuarantineList items={mockItems} onShowToast={vi.fn()} />)
    const rejectBtns = screen.getAllByText('Rechazar')
    fireEvent.click(rejectBtns[0]) // Click en desktop
    expect(screen.getByText('¿Rechazar precio?')).toBeInTheDocument()
  })
})