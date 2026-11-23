import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import SalesHistoryPage from '@/app/ventas/page'
import { ApiError } from '@/services/api'
import { cashShiftService, type CashShift } from '@/services/cashShiftService'
import { saleService, type SaleListItem } from '@/services/saleService'

vi.mock('@/components/navbar', () => ({ Navbar: () => null }))
vi.mock('@/components/bottom-nav', () => ({ BottomNav: () => null }))
vi.mock('@/components/desktop-footer', () => ({ DesktopFooter: () => null }))
const getToken = vi.hoisted(() => () => Promise.resolve('token-cajera'))
vi.mock('@/hooks/useTokenGetter', () => ({ useTokenGetter: () => getToken }))
vi.mock('@/services/saleService', () => ({ saleService: { list: vi.fn() } }))
vi.mock('@/services/cashShiftService', () => ({ cashShiftService: { current: vi.fn(), open: vi.fn() } }))
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

const SHIFT_ID = '7a1b2c3d-0000-4000-8000-000000000001'

const turno: CashShift = {
  id: SHIFT_ID,
  status: 'OPEN',
  openedAt: '2026-11-24T10:00:00.000Z',
  openedBy: 'cajera.panaderia@seed.example.test',
  closedAt: null,
  closedBy: null,
  openingAmount: '10000.00',
  salesCount: 11,
  voidedCount: 1,
  salesTotal: '33400.00',
  methods: [],
  expectedTotal: '43400.00',
  countedTotal: null,
  difference: null,
}

const renderPage = (path = '/ventas') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/ventas" element={<SalesHistoryPage />} />
      </Routes>
    </MemoryRouter>
  )

describe('Historial de ventas (/ventas)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(cashShiftService.current).mockResolvedValue(null)
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

  it('sin turno abierto ofrece abrirlo con el monto inicial y después muestra el turno', async () => {
    vi.mocked(saleService.list).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } })
    vi.mocked(cashShiftService.open).mockResolvedValue({ ...turno, salesCount: 0, salesTotal: '0.00' })
    renderPage()

    const monto = await screen.findByLabelText('Monto inicial en caja')
    fireEvent.click(screen.getByRole('button', { name: 'Abrir turno' }))
    expect(screen.getByText('Escribí el monto inicial, por ejemplo 10.000.')).toBeInTheDocument()
    expect(cashShiftService.open).not.toHaveBeenCalled()

    fireEvent.change(monto, { target: { value: '10.000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Abrir turno' }))

    await waitFor(() => expect(cashShiftService.open).toHaveBeenCalledWith(getToken, 10000))
    expect(await screen.findByText('Turno abierto')).toBeInTheDocument()
  })

  it('si otra persona abrió el turno al mismo tiempo, muestra el aviso y trae el turno abierto', async () => {
    vi.mocked(saleService.list).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } })
    vi.mocked(cashShiftService.current).mockResolvedValueOnce(null).mockResolvedValueOnce(turno)
    vi.mocked(cashShiftService.open).mockRejectedValue(
      new ApiError('Ya hay un turno de caja abierto. Cerralo antes de abrir otro.', 409)
    )
    renderPage()

    fireEvent.change(await screen.findByLabelText('Monto inicial en caja'), { target: { value: '5000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Abrir turno' }))

    expect(await screen.findByText('Turno abierto')).toBeInTheDocument()
    expect(screen.getByText('Ya hay un turno de caja abierto. Cerralo antes de abrir otro.')).toBeInTheDocument()
  })

  it('con el turno abierto muestra quién lo abrió, lo vendido y el acceso al cierre, y filtra "Del turno"', async () => {
    vi.mocked(cashShiftService.current).mockResolvedValue(turno)
    vi.mocked(saleService.list).mockResolvedValue({ data: [venta(9)], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } })
    renderPage()

    const panel = await screen.findByRole('region', { name: 'Turno de caja' })
    expect(panel).toHaveTextContent('Turno abierto')
    expect(panel).toHaveTextContent('cajera.panaderia@seed.example.test')
    expect(panel).toHaveTextContent('11 ventas · $33.400,00')
    expect(screen.getByRole('link', { name: 'Cerrar turno' })).toHaveAttribute('href', `/ventas/turnos/${SHIFT_ID}/cerrar`)
    expect(screen.getByRole('link', { name: 'Ver turnos' })).toHaveAttribute('href', '/ventas/turnos')

    fireEvent.click(screen.getByRole('button', { name: 'Del turno' }))
    await waitFor(() => expect(saleService.list).toHaveBeenLastCalledWith(getToken, { page: 1, cashShiftId: SHIFT_ID }))
  })

  it('con ?turno= muestra las ventas de ese turno (enlace desde el resumen del cierre)', async () => {
    vi.mocked(saleService.list).mockResolvedValue({ data: [venta(9)], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } })
    renderPage(`/ventas?turno=${SHIFT_ID}`)

    await screen.findByRole('link', { name: /000009/ })
    expect(saleService.list).toHaveBeenCalledWith(getToken, { page: 1, cashShiftId: SHIFT_ID })
    expect(screen.getByRole('button', { name: 'Del turno' })).toHaveAttribute('aria-pressed', 'true')
  })
})
