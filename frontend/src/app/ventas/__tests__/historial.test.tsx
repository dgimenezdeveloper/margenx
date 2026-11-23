import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import SalesHistoryPage from '@/app/ventas/page'
import { saleService, type SaleListItem } from '@/services/saleService'

vi.mock('@/components/navbar', () => ({ Navbar: () => null }))
vi.mock('@/components/bottom-nav', () => ({ BottomNav: () => null }))
vi.mock('@/components/desktop-footer', () => ({ DesktopFooter: () => null }))
const getToken = vi.hoisted(() => () => Promise.resolve('token-cajera'))
vi.mock('@/hooks/useTokenGetter', () => ({ useTokenGetter: () => getToken }))
vi.mock('@/services/saleService', () => ({ saleService: { list: vi.fn() } }))
vi.mock('@/lib/sales', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/sales')>()),
  argentinaToday: () => '2026-11-24',
}))

function venta(n: number, overrides: Partial<SaleListItem> = {}): SaleListItem {
  return {
    id: `venta-${n}`,
    ticketNumber: n,
    soldAt: '2026-11-24T12:30:00.000Z',
    paymentMethod: 'CASH',
    total: '3300.00',
    status: 'COMPLETED',
    cashShiftId: 'turno-1',
    itemsCount: 2,
    ...overrides,
  }
}

const renderPage = () => render(<MemoryRouter><SalesHistoryPage /></MemoryRouter>)

describe('Historial de ventas (/ventas)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra las ventas de hoy con su ticket, y la anulada tachada', async () => {
    vi.mocked(saleService.list).mockResolvedValue({
      data: [venta(9, { paymentMethod: 'TRANSFER', itemsCount: 1 }), venta(8, { status: 'VOIDED' })],
      meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
    })
    renderPage()

    const ticket9 = await screen.findByRole('link', { name: /Ticket N\.º 000009/ })
    expect(ticket9).toHaveAttribute('href', '/ventas/venta-9/ticket')
    expect(ticket9).toHaveTextContent('Transferencia · 1 producto')
    expect(screen.getByText('Anulada')).toBeInTheDocument()
    expect(saleService.list).toHaveBeenCalledWith(getToken, { page: 1, date: '2026-11-24' })
    expect(screen.getByRole('link', { name: 'Nueva venta' })).toHaveAttribute('href', '/ventas/nueva')
    expect(screen.queryByRole('button', { name: 'Cargar más' })).toBeNull()
  })

  it('"Todas" quita el filtro del día y "Cargar más" trae la página siguiente', async () => {
    vi.mocked(saleService.list)
      .mockResolvedValueOnce({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } })
      .mockResolvedValueOnce({ data: [venta(8)], meta: { total: 2, page: 1, limit: 1, totalPages: 2 } })
      .mockResolvedValueOnce({ data: [venta(7)], meta: { total: 2, page: 2, limit: 1, totalPages: 2 } })
    renderPage()

    expect(await screen.findByText('Todavía no hay ventas hoy')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Todas' }))
    expect(await screen.findByRole('link', { name: /000008/ })).toBeInTheDocument()
    expect(saleService.list).toHaveBeenLastCalledWith(getToken, { page: 1, date: undefined })

    fireEvent.click(screen.getByRole('button', { name: 'Cargar más' }))
    expect(await screen.findByRole('link', { name: /000007/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /000008/ })).toBeInTheDocument()
    expect(saleService.list).toHaveBeenLastCalledWith(getToken, { page: 2, date: undefined })
  })

  it('si falla, ofrece reintentar', async () => {
    vi.mocked(saleService.list)
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce({ data: [venta(1)], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } })
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /reintentar/i }))
    await waitFor(() => expect(screen.getByRole('link', { name: /000001/ })).toBeInTheDocument())
  })
})
