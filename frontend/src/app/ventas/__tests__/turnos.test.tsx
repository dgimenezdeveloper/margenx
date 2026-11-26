import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import CloseCashShiftPage from '@/app/ventas/turnos/[id]/cerrar/page'
import CashShiftSummaryPage from '@/app/ventas/turnos/[id]/page'
import CashShiftsPage from '@/app/ventas/turnos/page'
import { ApiError } from '@/services/api'
import { cashShiftService, type CashShift } from '@/services/cashShiftService'

vi.mock('@/components/navbar', () => ({ Navbar: () => null }))
vi.mock('@/components/bottom-nav', () => ({ BottomNav: () => null }))
vi.mock('@/components/desktop-footer', () => ({ DesktopFooter: () => null }))
const getToken = vi.hoisted(() => () => Promise.resolve('token-cajera'))
vi.mock('@/hooks/useTokenGetter', () => ({ useTokenGetter: () => getToken }))
vi.mock('@/services/cashShiftService', () => ({
  cashShiftService: { getById: vi.fn(), close: vi.fn(), list: vi.fn() },
}))

const SHIFT_ID = '7a1b2c3d-0000-4000-8000-000000000001'

/* Turno de la mañana de Panadería Central: $10.000 iniciales, $25.000 en efectivo y $8.400 por transferencia. */
function turnoAbierto(overrides: Partial<CashShift> = {}): CashShift {
  return {
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
    methods: [
      { paymentMethod: 'CASH', salesTotal: '25000.00', expected: '35000.00', counted: null, difference: null },
      { paymentMethod: 'TRANSFER', salesTotal: '8400.00', expected: '8400.00', counted: null, difference: null },
      { paymentMethod: 'MERCADO_PAGO', salesTotal: '0.00', expected: '0.00', counted: null, difference: null },
    ],
    expectedTotal: '43400.00',
    countedTotal: null,
    difference: null,
    businessName: 'Panadería Central',
    ...overrides,
  }
}

function turnoCerrado(overrides: Partial<CashShift> = {}): CashShift {
  return turnoAbierto({
    status: 'CLOSED',
    closedAt: '2026-11-24T18:00:00.000Z',
    closedBy: 'cajera.panaderia@seed.example.test',
    methods: [
      { paymentMethod: 'CASH', salesTotal: '25000.00', expected: '35000.00', counted: '34500.00', difference: '-500.00' },
      { paymentMethod: 'TRANSFER', salesTotal: '8400.00', expected: '8400.00', counted: '8400.00', difference: '0.00' },
      { paymentMethod: 'MERCADO_PAGO', salesTotal: '0.00', expected: '0.00', counted: '0.00', difference: '0.00' },
    ],
    countedTotal: '42900.00',
    difference: '-500.00',
    ...overrides,
  })
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/ventas/turnos" element={<CashShiftsPage />} />
        <Route path="/ventas/turnos/:id" element={<CashShiftSummaryPage />} />
        <Route path="/ventas/turnos/:id/cerrar" element={<CloseCashShiftPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Cierre de caja (/ventas/turnos/:id/cerrar)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(cashShiftService.getById).mockResolvedValue(turnoAbierto())
  })

  it('Escenario "Arqueo con diferencia": contando $34.500 en efectivo, la diferencia es −$500 y se resalta como faltante', async () => {
    renderAt(`/ventas/turnos/${SHIFT_ID}/cerrar`)

    const efectivo = await screen.findByRole('group', { name: 'Efectivo' })
    expect(within(efectivo).getByText('$35.000,00')).toBeInTheDocument()
    // Transferencia y Mercado Pago vienen precargados con lo esperado.
    expect(screen.getByLabelText('Contado por transferencia')).toHaveValue('8400,00')
    expect(screen.getByLabelText('Contado por Mercado Pago')).toHaveValue('0,00')
    expect(screen.getByRole('button', { name: 'Cerrar turno' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Contado en efectivo'), { target: { value: '34.500' } })

    expect(within(efectivo).getByTestId('difference')).toHaveTextContent('Falta −$500,00')
    expect(screen.getByTestId('total-difference')).toHaveTextContent('Falta −$500,00')
    expect(screen.getByRole('button', { name: 'Cerrar turno' })).toBeEnabled()
  })

  it('confirma antes de cerrar, manda lo contado y va al resumen', async () => {
    vi.mocked(cashShiftService.close).mockResolvedValue(turnoCerrado())
    // Al entrar, al confirmar (vuelve a pedir lo esperado, sin cambios) y en el resumen.
    vi.mocked(cashShiftService.getById)
      .mockResolvedValueOnce(turnoAbierto())
      .mockResolvedValueOnce(turnoAbierto())
      .mockResolvedValueOnce(turnoCerrado())
    renderAt(`/ventas/turnos/${SHIFT_ID}/cerrar`)

    fireEvent.change(await screen.findByLabelText('Contado en efectivo'), { target: { value: '34500' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar turno' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('ya no se puede vender ni anular')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sí, cerrar' }))

    await waitFor(() =>
      expect(cashShiftService.close).toHaveBeenCalledWith(getToken, SHIFT_ID, {
        countedCash: 34500,
        countedTransfer: 8400,
        countedMercadoPago: 0,
      })
    )
    expect(await screen.findByRole('heading', { name: 'Cierre de caja' })).toBeInTheDocument()
  })

  /* [RV462-I1]: con varios vendedores, otra persona cobra $2.700 por transferencia mientras se cuenta la caja. */
  function turnoConVentaNueva(): CashShift {
    return turnoAbierto({
      salesCount: 12,
      salesTotal: '36100.00',
      methods: [
        { paymentMethod: 'CASH', salesTotal: '25000.00', expected: '35000.00', counted: null, difference: null },
        { paymentMethod: 'TRANSFER', salesTotal: '11100.00', expected: '11100.00', counted: null, difference: null },
        { paymentMethod: 'MERCADO_PAGO', salesTotal: '0.00', expected: '0.00', counted: null, difference: null },
      ],
      expectedTotal: '46100.00',
    })
  }

  it('si entró una venta mientras se contaba, actualiza lo esperado y pide revisar antes de cerrar', async () => {
    vi.mocked(cashShiftService.close).mockResolvedValue(turnoCerrado())
    vi.mocked(cashShiftService.getById)
      .mockResolvedValueOnce(turnoAbierto())
      .mockResolvedValueOnce(turnoConVentaNueva())
      .mockResolvedValueOnce(turnoConVentaNueva())
      .mockResolvedValueOnce(turnoCerrado())
    renderAt(`/ventas/turnos/${SHIFT_ID}/cerrar`)

    fireEvent.change(await screen.findByLabelText('Contado en efectivo'), { target: { value: '35000' } })
    expect(screen.getByTestId('total-difference')).toHaveTextContent('Justo $0,00')
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar turno' }))
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sí, cerrar' }))

    // No cierra con lo esperado viejo: avisa, actualiza la transferencia precargada y la diferencia sigue en "Justo".
    expect(await screen.findByRole('alert')).toHaveTextContent('Mientras contabas entraron o se anularon ventas')
    expect(cashShiftService.close).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(within(screen.getByRole('group', { name: 'Transferencia' })).getByText('$11.100,00')).toBeInTheDocument()
    expect(screen.getByLabelText('Contado por transferencia')).toHaveValue('11100,00')
    expect(screen.getByTestId('total-difference')).toHaveTextContent('Justo $0,00')

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar turno' }))
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sí, cerrar' }))
    await waitFor(() =>
      expect(cashShiftService.close).toHaveBeenCalledWith(getToken, SHIFT_ID, {
        countedCash: 35000,
        countedTransfer: 11100,
        countedMercadoPago: 0,
      })
    )
  })

  it('al actualizar lo esperado, respeta un monto que la persona ya corrigió a mano', async () => {
    vi.mocked(cashShiftService.getById).mockResolvedValueOnce(turnoAbierto()).mockResolvedValueOnce(turnoConVentaNueva())
    renderAt(`/ventas/turnos/${SHIFT_ID}/cerrar`)

    fireEvent.change(await screen.findByLabelText('Contado en efectivo'), { target: { value: '35000' } })
    fireEvent.change(screen.getByLabelText('Contado por transferencia'), { target: { value: '8.000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar turno' }))
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sí, cerrar' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText('Contado por transferencia')).toHaveValue('8.000')
    expect(cashShiftService.close).not.toHaveBeenCalled()
  })

  it('si otra persona cerró el turno mientras se contaba, va a su resumen sin volver a cerrarlo', async () => {
    vi.mocked(cashShiftService.getById)
      .mockResolvedValueOnce(turnoAbierto())
      .mockResolvedValueOnce(turnoCerrado())
      .mockResolvedValueOnce(turnoCerrado())
    renderAt(`/ventas/turnos/${SHIFT_ID}/cerrar`)

    fireEvent.change(await screen.findByLabelText('Contado en efectivo'), { target: { value: '35000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar turno' }))
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sí, cerrar' }))

    expect(await screen.findByRole('heading', { name: 'Cierre de caja' })).toBeInTheDocument()
    expect(cashShiftService.close).not.toHaveBeenCalled()
  })

  it('un monto inválido no deja cerrar y explica qué escribir', async () => {
    renderAt(`/ventas/turnos/${SHIFT_ID}/cerrar`)

    fireEvent.change(await screen.findByLabelText('Contado en efectivo'), { target: { value: '-50' } })

    expect(screen.getByText('Escribí un monto, por ejemplo 34.500.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cerrar turno' })).toBeDisabled()
  })

  it('si la API no deja cerrar, muestra su mensaje', async () => {
    vi.mocked(cashShiftService.close).mockRejectedValue(new ApiError('El turno ya está cerrado.', 409))
    renderAt(`/ventas/turnos/${SHIFT_ID}/cerrar`)

    fireEvent.change(await screen.findByLabelText('Contado en efectivo'), { target: { value: '35000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar turno' }))
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sí, cerrar' }))

    expect(await screen.findByText('El turno ya está cerrado.')).toBeInTheDocument()
  })

  it('un turno ya cerrado va directo a su resumen', async () => {
    vi.mocked(cashShiftService.getById).mockResolvedValue(turnoCerrado())
    renderAt(`/ventas/turnos/${SHIFT_ID}/cerrar`)

    expect(await screen.findByRole('heading', { name: 'Cierre de caja' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Contado en efectivo')).toBeNull()
  })
})

describe('Resumen del turno (/ventas/turnos/:id)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('muestra el arqueo guardado por medio de pago, la diferencia total y las ventas anuladas', async () => {
    vi.mocked(cashShiftService.getById).mockResolvedValue(turnoCerrado())
    renderAt(`/ventas/turnos/${SHIFT_ID}`)

    const resumen = await screen.findByRole('article', { name: 'Cierre de caja' })
    expect(within(resumen).getByText('Panadería Central')).toBeInTheDocument()
    expect(within(resumen).getByRole('img', { name: 'MargenX' })).toBeInTheDocument()
    expect(within(resumen).getByText('11 ventas · 1 anulada')).toBeInTheDocument()
    // Un bloque por medio de pago, uno debajo del otro: entra en una ticketera de 58 mm.
    const efectivo = within(resumen).getByRole('table', { name: 'Efectivo' })
    expect(efectivo).toHaveTextContent('$35.000,00')
    expect(efectivo).toHaveTextContent('$34.500,00')
    expect(efectivo).toHaveTextContent('−$500,00')
    expect(within(resumen).getByTestId('total-difference')).toHaveTextContent('Falta −$500,00')
    expect(screen.getByRole('link', { name: 'Ver las ventas del turno' })).toHaveAttribute('href', `/ventas?turno=${SHIFT_ID}`)
  })

  it('se imprime en el formato elegido', async () => {
    const print = vi.fn()
    vi.stubGlobal('print', print)
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0)
      return 0
    })
    vi.mocked(cashShiftService.getById).mockResolvedValue(turnoCerrado())
    const { container } = renderAt(`/ventas/turnos/${SHIFT_ID}`)
    await screen.findByRole('article', { name: 'Cierre de caja' })

    fireEvent.change(screen.getByLabelText('Formato de impresión'), { target: { value: 'A4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }))

    expect(container.querySelector('style')?.textContent).toContain('size: A4')
    expect(print).toHaveBeenCalledTimes(1)
  })

  it('un turno abierto muestra lo esperado hasta ahora y ofrece cerrarlo', async () => {
    vi.mocked(cashShiftService.getById).mockResolvedValue(turnoAbierto())
    renderAt(`/ventas/turnos/${SHIFT_ID}`)

    expect(await screen.findByRole('article', { name: 'Turno abierto' })).toHaveTextContent('$43.400,00')
    expect(screen.getByRole('link', { name: 'Cerrar turno' })).toHaveAttribute('href', `/ventas/turnos/${SHIFT_ID}/cerrar`)
  })

  it('un turno que no existe lo dice', async () => {
    vi.mocked(cashShiftService.getById).mockRejectedValue(new ApiError('El turno no existe.', 404))
    renderAt(`/ventas/turnos/${SHIFT_ID}`)

    expect(await screen.findByText('El turno no existe')).toBeInTheDocument()
  })
})

describe('Historial de turnos (/ventas/turnos)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lista los turnos con su diferencia y abre cada resumen; "Cargar más" trae la página siguiente', async () => {
    vi.mocked(cashShiftService.list)
      .mockResolvedValueOnce({ data: [turnoAbierto({ id: 'turno-2' }), turnoCerrado()], meta: { total: 3, page: 1, limit: 2, totalPages: 2 } })
      .mockResolvedValueOnce({ data: [turnoCerrado({ id: 'turno-0', difference: '0.00' })], meta: { total: 3, page: 2, limit: 2, totalPages: 2 } })
    renderAt('/ventas/turnos')

    const abierto = await screen.findByRole('link', { name: /Abierto/ })
    expect(abierto).toHaveAttribute('href', '/ventas/turnos/turno-2')
    const cerrado = screen.getByRole('link', { name: /Falta −\$500,00/ })
    expect(cerrado).toHaveAttribute('href', `/ventas/turnos/${SHIFT_ID}`)

    fireEvent.click(screen.getByRole('button', { name: 'Cargar más' }))
    expect(await screen.findByRole('link', { name: /Justo/ })).toHaveAttribute('href', '/ventas/turnos/turno-0')
    expect(cashShiftService.list).toHaveBeenLastCalledWith(getToken, { page: 2 })
  })

  it('sin turnos lo explica', async () => {
    vi.mocked(cashShiftService.list).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } })
    renderAt('/ventas/turnos')

    expect(await screen.findByText('Todavía no hay turnos')).toBeInTheDocument()
  })
})

// Recorrida estética del 26/11 (#495): con md:max-w-3xl la barra de escritorio tapaba el botón de volver y el título.
describe('Turno y cierre: ancho de escritorio (#495)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    ['el detalle del turno', `/ventas/turnos/${SHIFT_ID}`, () => turnoCerrado()],
    ['el cierre del turno', `/ventas/turnos/${SHIFT_ID}/cerrar`, () => turnoAbierto()],
  ])('Escenario "El encabezado no queda tapado": %s usa el ancho de las demás pantallas', async (_nombre, ruta, turno) => {
    vi.mocked(cashShiftService.getById).mockResolvedValue(turno())
    const { container } = renderAt(ruta)
    await waitFor(() => expect(cashShiftService.getById).toHaveBeenCalled())

    const clases = (container.querySelector('main > div') as HTMLElement).className.split(/\s+/)
    expect(clases).toEqual(expect.arrayContaining(['md:max-w-5xl', 'lg:max-w-6xl']))
    expect(clases).not.toContain('md:max-w-3xl')
  })
})
