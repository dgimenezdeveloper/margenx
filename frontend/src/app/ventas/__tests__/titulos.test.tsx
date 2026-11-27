// Observación O5 de la recorrida del 26/11 (#502): el nombre de la pantalla no se repite.
// La barra real dibuja su título como encabezado de nivel 1 (lo fija components/__tests__/navbar-titulo.test.tsx); la simulada hace lo mismo para poder contarlo.
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import SalesHistoryPage from '@/app/ventas/page'
import RealProfitPage from '@/app/ventas/ganancia/page'
import CashShiftsPage from '@/app/ventas/turnos/page'
import { cashShiftService } from '@/services/cashShiftService'
import { saleService } from '@/services/saleService'
import { salesSummaryService, type SalesSummary } from '@/services/salesSummaryService'

vi.mock('@/components/navbar', () => ({
  Navbar: ({ title }: { title?: string }) => (title ? <h1>{title}</h1> : <div data-testid="barra-sin-titulo" />),
}))
vi.mock('@/components/bottom-nav', () => ({ BottomNav: () => null }))
vi.mock('@/components/desktop-footer', () => ({ DesktopFooter: () => null }))
const getToken = vi.hoisted(() => () => Promise.resolve('token-cajera'))
vi.mock('@/hooks/useTokenGetter', () => ({ useTokenGetter: () => getToken }))
vi.mock('@/services/saleService', () => ({ saleService: { list: vi.fn() } }))
vi.mock('@/services/cashShiftService', () => ({ cashShiftService: { current: vi.fn(), open: vi.fn(), list: vi.fn() } }))
vi.mock('@/services/salesSummaryService', () => ({ salesSummaryService: { get: vi.fn() } }))
vi.mock('@/lib/sales', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/sales')>()),
  argentinaToday: () => '2026-11-24',
}))

const semanaSinVentas: SalesSummary = {
  period: 'week',
  from: '2026-11-18',
  to: '2026-11-24',
  salesCount: 0,
  salesTotal: '0.00',
  costTotal: '0.00',
  profit: '0.00',
  marginPercent: null,
  previous: { from: '2026-11-11', to: '2026-11-17', salesCount: 0, salesTotal: '0.00', costTotal: '0.00', profit: '0.00', marginPercent: null },
  change: { salesTotal: null, profit: null },
  topSold: [],
  topProfit: [],
}

const renderAt = (page: React.ReactElement) => render(<MemoryRouter>{page}</MemoryRouter>)

describe('Escenario "Un solo título por pantalla" (#502)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(cashShiftService.current).mockResolvedValue(null)
    vi.mocked(cashShiftService.list).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } })
    vi.mocked(saleService.list).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } })
    vi.mocked(salesSummaryService.get).mockResolvedValue(semanaSinVentas)
  })

  it.each([
    ['Turnos de caja', () => <CashShiftsPage />],
    ['Ganancia real', () => <RealProfitPage />],
  ])('%s: el título está solo en la barra, sin repetirse dentro de la página', async (titulo, pagina) => {
    renderAt(pagina())
    await screen.findAllByRole('heading')

    expect(screen.getAllByRole('heading', { name: titulo })).toHaveLength(1)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('Ventas: la barra muestra el logo y el comercio, y "Ventas" es el único encabezado de nivel 1', async () => {
    renderAt(<SalesHistoryPage />)

    expect(await screen.findByTestId('barra-sin-titulo')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: 'Ventas' })).toHaveLength(1)
    expect(screen.getAllByRole('heading', { level: 1 })).toEqual([screen.getByRole('heading', { name: 'Ventas' })])
  })
})
