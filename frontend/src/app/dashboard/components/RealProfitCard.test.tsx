import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RealProfitCard } from '@/app/dashboard/components/RealProfitCard'
import { salesSummaryService, type SalesSummary } from '@/services/salesSummaryService'

const getToken = vi.hoisted(() => () => Promise.resolve('token-admin'))
vi.mock('@/hooks/useTokenGetter', () => ({ useTokenGetter: () => getToken }))
vi.mock('@/services/salesSummaryService', () => ({ salesSummaryService: { get: vi.fn() } }))

function resumen(overrides: Partial<SalesSummary> = {}): SalesSummary {
  return {
    period: 'week',
    from: '2026-11-18',
    to: '2026-11-24',
    salesCount: 41,
    salesTotal: '100000.00',
    costTotal: '62000.00',
    profit: '38000.00',
    marginPercent: '38.00',
    previous: { from: '2026-11-11', to: '2026-11-17', salesCount: 35, salesTotal: '80000.00', costTotal: '52000.00', profit: '28000.00', marginPercent: '35.00' },
    change: { salesTotal: '25.00', profit: '35.71' },
    topSold: [],
    topProfit: [],
    ...overrides,
  }
}

const renderCard = () => render(<MemoryRouter><RealProfitCard /></MemoryRouter>)

describe('RealProfitCard: ganancia real en el panel (#450)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Escenario "Margen ponderado": muestra hoy y la semana; en la semana, $38.000,00 y 38,0 %', async () => {
    vi.mocked(salesSummaryService.get).mockImplementation((_token, period) =>
      Promise.resolve(
        period === 'day'
          ? resumen({ period: 'day', from: '2026-11-24', salesCount: 6, salesTotal: '15000.00', costTotal: '9300.00', profit: '5700.00', marginPercent: '38.00' })
          : resumen()
      )
    )
    renderCard()

    const tarjeta = await screen.findByRole('region', { name: 'Ganancia real' })
    const semana = await within(tarjeta).findByRole('group', { name: 'Semana' })
    expect(semana).toHaveTextContent('$38.000,00')
    expect(semana).toHaveTextContent(/margen 38,0\s%/)
    expect(semana).toHaveTextContent('41 ventas por $100.000,00')
    expect(within(tarjeta).getByRole('group', { name: 'Hoy' })).toHaveTextContent('$5.700,00')
    expect(within(tarjeta).getByRole('link', { name: /Ver el detalle/ })).toHaveAttribute('href', '/ventas/ganancia')
    expect(salesSummaryService.get).toHaveBeenCalledWith(getToken, 'day')
    expect(salesSummaryService.get).toHaveBeenCalledWith(getToken, 'week')
  })

  it('sin ventas, lo dice en lugar de mostrar un margen', async () => {
    vi.mocked(salesSummaryService.get).mockResolvedValue(
      resumen({ salesCount: 0, salesTotal: '0.00', costTotal: '0.00', profit: '0.00', marginPercent: null })
    )
    renderCard()

    const semana = await screen.findByRole('group', { name: 'Semana' })
    expect(semana).toHaveTextContent('Sin ventas')
    expect(semana).not.toHaveTextContent('margen')
  })

  it('una ganancia negativa se marca como pérdida, no solo con el color', async () => {
    vi.mocked(salesSummaryService.get).mockResolvedValue(resumen({ profit: '-2500.00', marginPercent: '-2.50' }))
    renderCard()

    expect(await screen.findByRole('group', { name: 'Semana' })).toHaveTextContent('Pérdida −$2.500,00')
  })

  it('si falla, avisa y permite reintentar', async () => {
    vi.mocked(salesSummaryService.get).mockRejectedValueOnce(new Error('Failed to fetch')).mockResolvedValue(resumen())
    const user = userEvent.setup()
    renderCard()

    await user.click(await screen.findByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('group', { name: 'Semana' })).toHaveTextContent('$38.000,00')
  })
})
