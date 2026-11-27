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

  it('RC-09 (#433): con la unidad del insumo, cada precio dice por qué unidad es', async () => {
    vi.mocked(ingredientService.getHistory).mockResolvedValueOnce([
      { id: 'h-9', ingredientId: 'ing-1', oldCost: 900, newCost: 950, changedAt: '2026-11-20T10:00:00.000Z' },
    ])

    render(
      <PriceHistoryModal
        isOpen
        onClose={vi.fn()}
        ingredientId="ing-1"
        ingredientName="Leche entera larga vida Silvia"
        ingredientUnit="l"
      />
    )

    expect(await screen.findByText('$900,00/litro')).toBeInTheDocument()
    expect(screen.getByText('$950,00/litro')).toBeInTheDocument()
  })
  
  it('E2 / C3: con un nombre muy largo, el encabezado no desborda el contenedor ni oculta los botones', async () => {
    const nombreLargo =
      'Harina_de_trigo_0000_orgánica_molida_a_piedra_superespecial_x_50_kg_sin_espacios'
    vi.mocked(ingredientService.getHistory).mockResolvedValueOnce(mockHistory)

    render(
      <PriceHistoryModal
        isOpen
        onClose={vi.fn()}
        ingredientId="ing-1"
        ingredientName={nombreLargo}
      />
    )

    await waitFor(() => {
      expect(screen.queryByText('Cargando historial...')).not.toBeInTheDocument()
    })

    const heading = screen.getByRole('heading', { name: nombreLargo })
    expect(heading.className).toContain('wrap-break-word')
    expect(heading.className).not.toContain('max-w-62.5')
    expect(heading.parentElement?.className).toContain('min-w-0')
    expect(heading.parentElement?.className).toContain('flex-1')

    const closeBtn = screen.getByRole('button', { name: 'Cerrar historial de costos' })
    expect(closeBtn.parentElement?.className).toContain('shrink-0')

    const desc = screen.getByText(`Variaciones registradas en el costo unitario de ${nombreLargo}.`)
    expect(desc.className).toContain('wrap-break-word')
  })
})

