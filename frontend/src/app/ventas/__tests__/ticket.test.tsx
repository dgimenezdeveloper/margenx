import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import SaleTicketPage from '@/app/ventas/[id]/ticket/page'
import { PRINT_CSS } from '@/lib/print'
import { ApiError } from '@/services/api'
import { saleService, type Sale } from '@/services/saleService'

vi.mock('@/components/navbar', () => ({ Navbar: () => null }))
vi.mock('@/components/bottom-nav', () => ({ BottomNav: () => null }))
// Referencia estable, como el hook real: si cambiara en cada render, el efecto volvería a pedir los datos.
const getToken = vi.hoisted(() => () => Promise.resolve('token-cajera'))
vi.mock('@/hooks/useTokenGetter', () => ({ useTokenGetter: () => getToken }))
vi.mock('@/services/saleService', () => ({ saleService: { getById: vi.fn(), void: vi.fn() } }))

const venta: Sale = {
  id: '9f1c2a3b-0000-4000-8000-000000000001',
  ticketNumber: 8,
  businessName: 'Panadería Central',
  soldAt: '2026-11-24T12:30:00.000Z',
  paymentMethod: 'CASH',
  total: '3300.00',
  status: 'COMPLETED',
  cashShiftId: '7a1b2c3d-0000-4000-8000-000000000001',
  voidedAt: null,
  voidReason: null,
  items: [
    { productId: 'p-cafe', productName: 'Café con leche', quantity: 1, unitPrice: '1500.00', lineTotal: '1500.00' },
    { productId: 'p-medialuna', productName: 'Medialuna de manteca', quantity: 2, unitPrice: '900.00', lineTotal: '1800.00' },
  ],
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/ventas/${venta.id}/ticket`]}>
      <Routes>
        <Route path="/ventas/:id/ticket" element={<SaleTicketPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Ticket de la venta (/ventas/:id/ticket)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(saleService.getById).mockResolvedValue(venta)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('muestra comercio, número, fecha de Argentina, ítems, total, medio de pago y la leyenda no fiscal', async () => {
    renderPage()

    const ticket = await screen.findByRole('article', { name: 'Ticket N.º 000008' })
    expect(within(ticket).getByText('Panadería Central')).toBeInTheDocument()
    expect(within(ticket).getByText('Ticket N.º 000008')).toBeInTheDocument()
    expect(within(ticket).getByText('24/11/2026 09:30')).toBeInTheDocument()
    expect(within(ticket).getByText('2 × Medialuna de manteca', { exact: false })).toBeInTheDocument()
    expect(within(ticket).getByText('$1.800,00')).toBeInTheDocument()
    expect(within(ticket).getByTestId('ticket-total')).toHaveTextContent('$3.300,00')
    expect(within(ticket).getByText('Efectivo')).toBeInTheDocument()
    expect(within(ticket).getByText('Comprobante no válido como factura')).toBeInTheDocument()
    expect(saleService.getById).toHaveBeenCalledWith(expect.any(Function), venta.id)
  })

  it('lleva el logo completo de MargenX y la firma, en pantalla y al imprimir', async () => {
    const { container } = renderPage()

    const ticket = await screen.findByRole('article', { name: 'Ticket N.º 000008' })
    expect(within(ticket).getByRole('img', { name: 'MargenX' })).toHaveAttribute('src', '/logo.png')
    expect(within(ticket).getByText('Control de rentabilidad en tiempo real')).toBeInTheDocument()
    expect(within(ticket).getByText('Emitido con MargenX · margenx.tech')).toBeInTheDocument()

    // Ticketera: logo en negro puro (la impresora térmica no tiene color) y sin el lema.
    const css = () => container.querySelector('style')?.textContent ?? ''
    expect(css()).toContain('.mx-ticket-logo { filter: grayscale(1) brightness(0) !important;')
    expect(css()).toContain('.mx-ticket-tagline { display: none; }')

    // A4 (y el PDF): logo en color y con el lema.
    fireEvent.change(screen.getByLabelText('Formato de impresión'), { target: { value: 'A4' } })
    expect(css()).toMatch(/\.mx-ticket-logo \{[^}]*filter: none !important;/)
    expect(css()).not.toContain('.mx-ticket-tagline { display: none; }')
  })

  it('Compartir por WhatsApp abre wa.me con el texto del ticket', async () => {
    renderPage()
    const enlace = await screen.findByRole('link', { name: 'Compartir por WhatsApp' })
    const href = enlace.getAttribute('href') ?? ''
    expect(href.startsWith('https://wa.me/?text=')).toBe(true)
    const texto = decodeURIComponent(href.replace('https://wa.me/?text=', ''))
    expect(texto).toContain('Ticket N.º 000008')
    expect(texto).toContain('Comprobante no válido como factura')
    expect(texto).toContain('Emitido con MargenX · margenx.tech')
    expect(enlace).toHaveAttribute('target', '_blank')
    expect(enlace).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('Imprimir usa el formato elegido y Descargar PDF imprime en A4', async () => {
    const print = vi.fn()
    vi.stubGlobal('print', print)
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0)
      return 0
    })
    const { container } = renderPage()
    await screen.findByRole('article')

    // Por defecto, ticketera de 80 mm: el papel lo pone la impresora y el ticket mide 74 mm.
    expect(container.querySelector('style')?.textContent).toContain(PRINT_CSS['80'])

    fireEvent.change(screen.getByLabelText('Formato de impresión'), { target: { value: '58' } })
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }))
    expect(container.querySelector('style')?.textContent).toContain(PRINT_CSS['58'])
    expect(print).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Descargar PDF' }))
    expect(container.querySelector('style')?.textContent).toContain('size: A4')
    expect(print).toHaveBeenCalledTimes(2)
  })

  it('anula la venta con su motivo y el ticket pasa a decir VENTA ANULADA', async () => {
    vi.mocked(saleService.void).mockResolvedValue({ ...venta, status: 'VOIDED', voidReason: 'Cobré dos veces la misma venta' })
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Anular venta' }))
    const confirmar = screen.getByRole('button', { name: 'Anular' })
    expect(confirmar).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: '  Cobré dos veces la misma venta ' } })
    fireEvent.click(confirmar)

    await waitFor(() => expect(screen.getByText(/VENTA ANULADA · Cobré dos veces la misma venta/)).toBeInTheDocument())
    expect(saleService.void).toHaveBeenCalledWith(expect.any(Function), venta.id, 'Cobré dos veces la misma venta')
    expect(screen.queryByRole('button', { name: 'Anular venta' })).toBeNull()
  })

  it('si la API no deja anular, muestra su mensaje dentro del diálogo', async () => {
    vi.mocked(saleService.void).mockRejectedValue(
      new ApiError('Solo podés anular ventas del turno abierto. Pedile la anulación a un administrador.', 403)
    )
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Anular venta' }))
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Error en el medio de pago' } })
    fireEvent.click(screen.getByRole('button', { name: 'Anular' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Solo podés anular ventas del turno abierto')
  })

  it('una venta que no existe (o de otra persona) muestra que no existe', async () => {
    vi.mocked(saleService.getById).mockRejectedValue(new ApiError('La venta no existe.', 404))
    renderPage()
    expect(await screen.findByText('La venta no existe')).toBeInTheDocument()
  })

  it('un error de red ofrece reintentar', async () => {
    vi.mocked(saleService.getById).mockRejectedValueOnce(new Error('Failed to fetch'))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /reintentar/i }))
    expect(await screen.findByRole('article')).toBeInTheDocument()
  })
})

// Recorrida estética del 26/11 (#495): con md:max-w-3xl la barra de escritorio tapaba el botón de volver y el título.
describe('Ticket: ancho de escritorio (#495)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(saleService.getById).mockResolvedValue(venta)
  })

  it('Escenario "El encabezado no queda tapado": usa el ancho de las demás pantallas, y el ticket sigue centrado y angosto', async () => {
    const { container } = renderPage()
    const ticket = await screen.findByRole('article', { name: 'Ticket N.º 000008' })

    const clases = (container.querySelector('main > div') as HTMLElement).className.split(/\s+/)
    expect(clases).toEqual(expect.arrayContaining(['md:max-w-5xl', 'lg:max-w-6xl']))
    expect(clases).not.toContain('md:max-w-3xl')
    expect(ticket.className.split(/\s+/)).toEqual(expect.arrayContaining(['mx-auto', 'max-w-sm']))
  })
})
