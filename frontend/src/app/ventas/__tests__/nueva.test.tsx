import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import NewSalePage from '@/app/ventas/nueva/page'
import { ApiError } from '@/services/api'
import { productService, type Product } from '@/services/productService'
import { cashShiftService } from '@/services/cashShiftService'
import { saleService } from '@/services/saleService'

vi.mock('@/components/navbar', () => ({ Navbar: () => null }))
vi.mock('@/components/bottom-nav', () => ({ BottomNav: () => null }))
// Referencia estable, como el hook real: si cambiara en cada render, el efecto volvería a pedir los datos.
const getToken = vi.hoisted(() => () => Promise.resolve('token-cajera'))
vi.mock('@/hooks/useTokenGetter', () => ({ useTokenGetter: () => getToken }))
vi.mock('@/services/productService', () => ({ productService: { getAll: vi.fn() } }))
vi.mock('@/services/saleService', () => ({ saleService: { create: vi.fn() } }))
vi.mock('@/services/cashShiftService', () => ({ cashShiftService: { current: vi.fn() } }))

const receta = [{ ingredientId: 'harina-000', quantity: 0.05 }]
const catalogo: Product[] = [
  { id: 'p-medialuna', name: 'Medialuna de manteca', salePrice: 900, ingredients: receta },
  { id: 'p-cafe', name: 'Café con leche', salePrice: 1500, ingredients: receta },
  { id: 'p-pan-dulce', name: 'Pan dulce (sin receta)', salePrice: 8000, ingredients: [] },
  { id: 'p-bizcochitos', name: 'Bizcochitos de grasa', salePrice: 0, ingredients: receta },
]

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/ventas/nueva']}>
      <Routes>
        <Route path="/ventas/nueva" element={<NewSalePage />} />
        <Route path="/ventas/:id/ticket" element={<p>Pantalla del ticket</p>} />
        <Route path="/ventas" element={<p>Historial de ventas</p>} />
      </Routes>
    </MemoryRouter>
  )
}

const card = (name: string) => screen.getByText(name).closest('li') as HTMLElement

describe('Nueva venta (/ventas/nueva)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(productService.getAll).mockResolvedValue(catalogo)
    vi.mocked(cashShiftService.current).mockResolvedValue({
      id: '7a1b2c3d-0000-4000-8000-000000000001',
      status: 'OPEN',
      openedAt: '2026-11-24T10:00:00.000Z',
      openedBy: 'cajera.panaderia@seed.example.test',
      closedAt: null,
      closedBy: null,
      openingAmount: '10000.00',
      salesCount: 0,
      voidedCount: 0,
      salesTotal: '0.00',
      methods: [],
      expectedTotal: '10000.00',
      countedTotal: null,
      difference: null,
    })
  })

  it('con el turno abierto lo indica, y sin turno avisa antes de armar la venta', async () => {
    renderPage()
    expect(await screen.findByText('Turno abierto desde 24/11/2026 07:00')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('sin turno abierto, el aviso con "Abrir el turno" aparece al entrar', async () => {
    vi.mocked(cashShiftService.current).mockResolvedValue(null)
    renderPage()

    const aviso = await screen.findByRole('alert')
    expect(aviso).toHaveTextContent('No hay un turno de caja abierto')
    expect(within(aviso).getByRole('link', { name: 'Abrir el turno' })).toHaveAttribute('href', '/ventas')
  })

  it('solo ofrece productos con receta y precio, y busca sin tildes', async () => {
    renderPage()

    expect(await screen.findByText('Medialuna de manteca')).toBeInTheDocument()
    expect(screen.getByText('Café con leche')).toBeInTheDocument()
    expect(screen.queryByText('Pan dulce (sin receta)')).toBeNull()
    expect(screen.queryByText('Bizcochitos de grasa')).toBeNull()

    fireEvent.change(screen.getByPlaceholderText('Buscar producto'), { target: { value: 'cafe' } })
    expect(screen.queryByText('Medialuna de manteca')).toBeNull()
    expect(screen.getByText('Café con leche')).toBeInTheDocument()
  })

  it('Escenario "Venta con ticket": 2 medialunas y 1 café en efectivo, total en es-AR y va al ticket', async () => {
    vi.mocked(saleService.create).mockResolvedValue({ id: 'venta-8' } as never)
    renderPage()
    await screen.findByText('Medialuna de manteca')

    const cobrar = screen.getByRole('button', { name: /^Cobrar/ })
    expect(cobrar).toBeDisabled()

    const agregarMedialuna = within(card('Medialuna de manteca')).getByRole('button', { name: /Agregar una unidad/ })
    fireEvent.click(agregarMedialuna)
    fireEvent.click(agregarMedialuna)
    fireEvent.click(within(card('Café con leche')).getByRole('button', { name: /Agregar una unidad/ }))

    expect(screen.getByTestId('sale-total')).toHaveTextContent('$3.300,00')
    expect(screen.getByText(/3 unidades/)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Efectivo' })).toBeChecked()

    fireEvent.click(screen.getByRole('button', { name: 'Cobrar $3.300,00' }))

    await waitFor(() => expect(screen.getByText('Pantalla del ticket')).toBeInTheDocument())
    expect(saleService.create).toHaveBeenCalledWith(expect.any(Function), {
      paymentMethod: 'CASH',
      items: [
        { productId: 'p-medialuna', quantity: 2 },
        { productId: 'p-cafe', quantity: 1 },
      ],
    })
  })

  it('el botón − resta y el medio de pago se puede cambiar', async () => {
    vi.mocked(saleService.create).mockResolvedValue({ id: 'venta-9' } as never)
    renderPage()
    await screen.findByText('Medialuna de manteca')

    const tarjeta = card('Medialuna de manteca')
    fireEvent.click(within(tarjeta).getByRole('button', { name: /Agregar una unidad/ }))
    fireEvent.click(within(tarjeta).getByRole('button', { name: /Agregar una unidad/ }))
    fireEvent.click(within(tarjeta).getByRole('button', { name: /Quitar una unidad/ }))
    expect(screen.getByTestId('sale-total')).toHaveTextContent('$900,00')

    fireEvent.click(screen.getByRole('radio', { name: 'Mercado Pago' }))
    fireEvent.click(screen.getByRole('button', { name: /^Cobrar/ }))

    await waitFor(() =>
      expect(saleService.create).toHaveBeenCalledWith(expect.any(Function), {
        paymentMethod: 'MERCADO_PAGO',
        items: [{ productId: 'p-medialuna', quantity: 1 }],
      })
    )
  })

  it('Escenario "Sin turno abierto": con 409 ofrece abrir el turno y no sale de la pantalla', async () => {
    vi.mocked(saleService.create).mockRejectedValue(
      new ApiError('No hay un turno de caja abierto. Abrí el turno para empezar a cobrar.', 409)
    )
    renderPage()
    await screen.findByText('Café con leche')

    fireEvent.click(within(card('Café con leche')).getByRole('button', { name: /Agregar una unidad/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Cobrar/ }))

    const aviso = await screen.findByRole('alert')
    expect(aviso).toHaveTextContent('No hay un turno de caja abierto')
    const abrir = within(aviso).getByRole('link', { name: 'Abrir el turno' })
    expect(abrir).toHaveAttribute('href', '/ventas')
    expect(screen.getByTestId('sale-total')).toHaveTextContent('$1.500,00')
  })

  it('otro error de la API se muestra en un aviso y deja reintentar', async () => {
    vi.mocked(saleService.create).mockRejectedValue(new ApiError('"Café con leche" no tiene precio de venta cargado y no se puede vender.', 422))
    renderPage()
    await screen.findByText('Café con leche')

    fireEvent.click(within(card('Café con leche')).getByRole('button', { name: /Agregar una unidad/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Cobrar/ }))

    expect(await screen.findByText(/no tiene precio de venta cargado/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Cobrar/ })).toBeEnabled()
  })

  it('si no carga el catálogo, muestra el error con Reintentar', async () => {
    vi.mocked(productService.getAll).mockRejectedValueOnce(new Error('Failed to fetch'))
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /reintentar/i }))
    expect(await screen.findByText('Medialuna de manteca')).toBeInTheDocument()
  })

  it('sin productos vendibles lo explica', async () => {
    vi.mocked(productService.getAll).mockResolvedValue([catalogo[2]!])
    renderPage()
    expect(await screen.findByText('No hay productos para vender')).toBeInTheDocument()
  })
})

// Recorrida estética del 26/11 (#495). jsdom no mide superposiciones: se fijan las clases que las causaban.
describe('Nueva venta: maquetación (#495)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(productService.getAll).mockResolvedValue(catalogo)
    vi.mocked(cashShiftService.current).mockResolvedValue(null)
  })

  it('Escenario "El buscador se lee completo": el texto empieza después de la lupa (el px-3 de las clases canónicas no pisa el pl-9)', async () => {
    renderPage()

    const buscador = await screen.findByRole('searchbox', { name: 'Buscar producto' })
    // tailwind-merge conserva px-3 y aplica pl-9 después; el defecto era que pl-9 desaparecía.
    const clases = buscador.className.split(/\s+/)
    expect(clases).toContain('pl-9')
    if (clases.includes('px-3')) expect(clases.indexOf('pl-9')).toBeGreaterThan(clases.indexOf('px-3'))
  })

  it('Escenario "El panel de cobro no tapa productos": en escritorio el contenido deja lugar abajo y el panel tiene el ancho de la grilla', async () => {
    const { container } = renderPage()
    await screen.findByText('Medialuna de manteca')

    const contenido = container.querySelector('main > div > div') as HTMLElement
    expect(contenido.className.split(/\s+/)).toContain('md:pb-52')
    expect(contenido.className.split(/\s+/)).not.toContain('md:pb-12')

    const anchoContenido = (container.querySelector('main > div') as HTMLElement).className.split(/\s+/)
    const anchoPanel = (screen.getByRole('region', { name: 'Cobro' }).firstElementChild as HTMLElement).className.split(/\s+/)
    for (const clase of ['md:max-w-5xl', 'md:px-8', 'lg:max-w-6xl', 'lg:px-12']) {
      expect(anchoContenido, `contenido: ${clase}`).toContain(clase)
      expect(anchoPanel, `panel: ${clase}`).toContain(clase)
    }
  })
})
