import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import RealProfitPage from '@/app/ventas/ganancia/page'
import { salesSummaryService, type SalesSummary } from '@/services/salesSummaryService'

vi.mock('@/components/navbar', () => ({ Navbar: () => null }))
vi.mock('@/components/bottom-nav', () => ({ BottomNav: () => null }))
vi.mock('@/components/desktop-footer', () => ({ DesktopFooter: () => null }))
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
    topSold: [
      { productId: 'p-pan', productName: 'Pan flauta — 1 kg', quantity: 80, salesTotal: '346571.20', profit: '145571.20', marginPercent: '42.00' },
    ],
    topProfit: [
      { productId: 'p-medialunas', productName: 'Medialunas de manteca — docena (12 unidades)', quantity: 30, salesTotal: '405000.00', profit: '273000.00', marginPercent: '67.41' },
    ],
    ...overrides,
  }
}

const renderPage = () => render(<MemoryRouter><RealProfitPage /></MemoryRouter>)

describe('Ganancia real (/ventas/ganancia)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(salesSummaryService.get).mockResolvedValue(resumen())
  })

  it('muestra la semana: ventas, costo, ganancia, margen y la comparación con la semana anterior', async () => {
    renderPage()

    const totales = await screen.findByRole('region', { name: 'Totales del período' })
    expect(totales).toHaveTextContent('$100.000,00')
    expect(totales).toHaveTextContent('$62.000,00')
    expect(totales).toHaveTextContent('$38.000,00')
    expect(totales).toHaveTextContent(/38,0\s%/)
    expect(screen.getByText(/Del 18\/11\/2026 al 24\/11\/2026/)).toBeInTheDocument()
    expect(screen.getByText(/\+35,7\s%.*contra la semana anterior/)).toBeInTheDocument()
    expect(salesSummaryService.get).toHaveBeenCalledWith(getToken, 'week')
  })

  it('lista los más vendidos y los que más ganancia dejan', async () => {
    renderPage()

    const vendidos = await screen.findByRole('table', { name: 'Los más vendidos' })
    expect(within(vendidos).getByRole('row', { name: /Pan flauta/ })).toHaveTextContent('80')
    const ganancia = screen.getByRole('table', { name: 'Los que más ganancia dejan' })
    expect(within(ganancia).getByRole('row', { name: /Medialunas de manteca/ })).toHaveTextContent('$273.000,00')
  })

  it('cambia a hoy y al mes', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('region', { name: 'Totales del período' })

    await user.click(screen.getByRole('button', { name: 'Hoy' }))
    expect(salesSummaryService.get).toHaveBeenLastCalledWith(getToken, 'day')
    await user.click(screen.getByRole('button', { name: 'Mes' }))
    expect(salesSummaryService.get).toHaveBeenLastCalledWith(getToken, 'month')
    expect(screen.getByRole('button', { name: 'Mes' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('sin ventas en el período lo explica, sin tablas vacías', async () => {
    vi.mocked(salesSummaryService.get).mockResolvedValue(
      resumen({ salesCount: 0, salesTotal: '0.00', costTotal: '0.00', profit: '0.00', marginPercent: null, topSold: [], topProfit: [], change: { salesTotal: null, profit: null } })
    )
    renderPage()

    expect(await screen.findByText('No hubo ventas en este período')).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('si falla, ofrece reintentar', async () => {
    vi.mocked(salesSummaryService.get).mockRejectedValueOnce(new Error('Failed to fetch')).mockResolvedValue(resumen())
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /reintentar/i }))
    expect(await screen.findByRole('region', { name: 'Totales del período' })).toBeInTheDocument()
  })
})
