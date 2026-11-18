import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { ingredientService, type PriceHistory } from '@/services/ingredientService'
import { PriceHistoryModal } from '../price-history-modal'

const mockGetToken = vi.fn().mockResolvedValue('token')

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}))

vi.mock('@/services/ingredientService', () => ({
  ingredientService: { getHistory: vi.fn() },
}))

const mockHistory: PriceHistory[] = [
  { id: 'h-1', ingredientId: 'ing-1', oldCost: 100, newCost: 120, changedAt: '2026-09-01T10:00:00.000Z' },
  { id: 'h-2', ingredientId: 'ing-1', oldCost: 120, newCost: 150, changedAt: '2026-10-01T10:00:00.000Z' },
  { id: 'h-3', ingredientId: 'ing-1', oldCost: 150, newCost: 200, changedAt: '2026-11-01T10:00:00.000Z' },
]

describe('PriceHistoryModal - Criterios de Aceptación Issue #354', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Escenario Gherkin "Historial": el primero de la lista es el más reciente (orden desc por defecto)', async () => {
    vi.mocked(ingredientService.getHistory).mockResolvedValueOnce(mockHistory)

    render(
      <PriceHistoryModal
        isOpen
        onClose={vi.fn()}
        ingredientId="ing-1"
        ingredientName="Harina 000"
      />
    )

    await waitFor(() => {
      expect(screen.queryByText('Cargando historial...')).not.toBeInTheDocument()
    })

    const newPrices = screen.getAllByText('Nuevo').map((label) => label.nextElementSibling?.textContent)
    expect(newPrices).toEqual(['$200,00', '$150,00', '$120,00'])

    expect(screen.getByRole('button', { name: /Ordenar por más antiguos primero/i })).toBeInTheDocument()
  })

  it('permite alternar el orden hacia más antiguos primero al hacer click en el botón de orden', async () => {
    vi.mocked(ingredientService.getHistory).mockResolvedValueOnce(mockHistory)

    render(
      <PriceHistoryModal
        isOpen
        onClose={vi.fn()}
        ingredientId="ing-1"
        ingredientName="Harina 000"
      />
    )

    await waitFor(() => {
      expect(screen.queryByText('Cargando historial...')).not.toBeInTheDocument()
    })

    const toggleBtn = screen.getByRole('button', { name: /Ordenar por más antiguos primero/i })
    fireEvent.click(toggleBtn)

    const newPrices = screen.getAllByText('Nuevo').map((label) => label.nextElementSibling?.textContent)
    expect(newPrices).toEqual(['$120,00', '$150,00', '$200,00'])
    expect(screen.getByRole('button', { name: /Ordenar por más recientes primero/i })).toBeInTheDocument()
  })

  it('muestra estado vacío si el insumo no tiene variaciones registradas', async () => {
    vi.mocked(ingredientService.getHistory).mockResolvedValueOnce([])

    render(
      <PriceHistoryModal
        isOpen
        onClose={vi.fn()}
        ingredientId="ing-1"
        ingredientName="Harina 000"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Sin variaciones registradas')).toBeInTheDocument()
    })
  })
})