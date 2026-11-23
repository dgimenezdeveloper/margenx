import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import type { Product } from '@/services/productService'
import type { ActiveHealthBucket } from '@/lib/healthBucket'
import { MonitoredCatalogGrid } from './MonitoredCatalogGrid'

vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

const NOMBRES = [
  'Medialuna de manteca',
  'Pan de campo',
  'Factura de dulce de leche',
  'Torta rogel',
  'Alfajor de maicena',
  'Budín de limón',
  'Chipá',
  'Prepizza',
  'Bizcochitos de grasa',
  'Pan lactal',
]

/**
 * Catálogo como el de la cuenta Demo del recorrido del 10/11: 339 productos.
 * 12 a pérdida, 107 en riesgo, 130 en objetivo, 40 en superávit y 50 en borrador.
 */
function catalogo(): Product[] {
  const tramos: Array<{ n: number; margen: (i: number) => number; receta: boolean }> = [
    { n: 12, margen: (i) => -5 - i, receta: true },
    { n: 107, margen: (i) => (i % 30) + 1, receta: true },
    { n: 130, margen: (i) => 35 + (i % 25), receta: true },
    { n: 40, margen: (i) => 61 + i, receta: true },
    { n: 50, margen: () => 0, receta: false },
  ]
  let id = 0
  return tramos.flatMap(({ n, margen, receta }) =>
    Array.from({ length: n }, (_, i) => {
      id += 1
      return {
        id: `prod-${id}`,
        name: `${NOMBRES[id % NOMBRES.length]} ${String(id).padStart(3, '0')}`,
        salePrice: 1500,
        cost: 900,
        minMarginPercent: 35,
        marginPercent: margen(i),
        ingredients: receta ? [{ ingredientId: 'harina-000', quantity: 0.25 }] : [],
      }
    })
  )
}

function renderGrilla(selectedBucket: ActiveHealthBucket | null = null, products = catalogo()) {
  const onClearFilter = vi.fn()
  const utils = render(
    <MonitoredCatalogGrid
      products={products}
      isLoading={false}
      isCollaborator={false}
      selectedBucket={selectedBucket}
      onClearFilter={onClearFilter}
    />
  )
  return { ...utils, onClearFilter }
}

function tarjetas() {
  return screen.getAllByRole('heading', { level: 3 })
}

describe('MonitoredCatalogGrid sobre todo el catálogo (#351 / #358)', () => {
  it('Escenario Gherkin: Link del filtro -> con "En objetivo" el enlace que quita el filtro usa el color de enlace, no el de alerta (#362)', () => {
    const { onClearFilter } = renderGrilla('target')
    const quitarFiltro = screen.getByRole('button', { name: /ver catálogo completo/i })
    expect(quitarFiltro.className).toMatch(/text-indigo-700/)
    expect(quitarFiltro.className).not.toMatch(/rose|red|amber/)
    fireEvent.click(quitarFiltro)
    expect(onClearFilter).toHaveBeenCalledTimes(1)
  })

  it('sin filtro, el enlace al catálogo usa el mismo color de enlace que con filtro (#362)', () => {
    renderGrilla()
    const enlace = screen.getByRole('link', { name: /ver catálogo completo/i })
    expect(enlace.className).toMatch(/text-indigo-700/)
  })

  it('muestra el total real en "Ver catálogo completo" y 20 productos por página', () => {
    renderGrilla()
    expect(screen.getByText('Ver catálogo completo (339)')).toBeInTheDocument()
    expect(tarjetas()).toHaveLength(20)
    expect(screen.getByText(/mostrando 1–20 de 339 productos/i)).toBeInTheDocument()
  })

  it('ordena de menor a mayor margen y deja los borradores al final', () => {
    renderGrilla()
    // El primero es el de mayor pérdida (-16 %).
    expect(tarjetas()[0]).toHaveTextContent('012')
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(screen.getByText(/mostrando 21–40 de 339 productos/i)).toBeInTheDocument()
  })

  it('el paginador cambia la cantidad de filas', () => {
    renderGrilla()
    fireEvent.change(screen.getByLabelText('Filas por página'), { target: { value: '100' } })
    expect(tarjetas()).toHaveLength(100)
    expect(screen.getByText(/página 1 de 4/i)).toBeInTheDocument()
  })

  it('en mobile "Cargar más" suma la página siguiente a las anteriores', () => {
    renderGrilla()
    fireEvent.click(screen.getByRole('button', { name: 'Cargar más' }))
    expect(tarjetas()).toHaveLength(40)
    expect(screen.getByText(/mostrando 40 de 339 productos/i)).toBeInTheDocument()
  })

  it('al filtrar por columna busca en todo el catálogo y muestra el nombre unificado en título y tarjeta', () => {
    renderGrilla('risk')
    expect(screen.getByText(/Productos: En riesgo/i)).toBeInTheDocument()
    expect(screen.getByText('(107 de 339)')).toBeInTheDocument()
    expect(screen.getByText(/mostrando 1–20 de 107 productos/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ver catálogo completo \(339\)/i })).toBeInTheDocument()
    expect(screen.getAllByText('En riesgo').length).toBe(20)
  })

  it('al filtrar por pérdida muestra "Pérdida" tanto en el título como en cada tarjeta', () => {
    renderGrilla('loss')
    expect(screen.getByText(/Productos: Pérdida/i)).toBeInTheDocument()
    expect(screen.getByText('(12 de 339)')).toBeInTheDocument()
    expect(screen.getAllByText('Pérdida').length).toBe(12)
  })

  it('el filtro de superávit trae los 40 productos de más de 60 % con el nombre unificado', () => {
    renderGrilla('surplus')
    expect(screen.getByText(/Productos: Superávit/i)).toBeInTheDocument()
    expect(screen.getByText('(40 de 339)')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    const ultimas = tarjetas()
    expect(ultimas).toHaveLength(20)
  })

  it('al cambiar de columna vuelve a la primera página', () => {
    const { rerender, onClearFilter } = renderGrilla('target')
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(screen.getByText(/mostrando 21–40 de 130 productos/i)).toBeInTheDocument()

    rerender(
      <MonitoredCatalogGrid
        products={catalogo()}
        isLoading={false}
        isCollaborator={false}
        selectedBucket="risk"
        onClearFilter={onClearFilter}
      />
    )
    expect(screen.getByText(/mostrando 1–20 de 107 productos/i)).toBeInTheDocument()
  })

  it('si el catálogo se achica, no queda en una página vacía', () => {
    const { rerender, onClearFilter } = renderGrilla()
    fireEvent.change(screen.getByLabelText('Filas por página'), { target: { value: '100' } })
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(screen.getByText(/página 4 de 4/i)).toBeInTheDocument()

    rerender(
      <MonitoredCatalogGrid
        products={catalogo().slice(0, 150)}
        isLoading={false}
        isCollaborator={false}
        selectedBucket={null}
        onClearFilter={onClearFilter}
      />
    )
    expect(screen.getByText(/página 2 de 2/i)).toBeInTheDocument()
    expect(tarjetas()).toHaveLength(50)
  })

  it('con pocos productos no muestra "Cargar más" y el catálogo vacío no muestra paginador', () => {
    const { unmount } = renderGrilla(null, catalogo().slice(0, 5))
    expect(screen.queryByRole('button', { name: 'Cargar más' })).toBeNull()
    expect(screen.getByText('Ver catálogo completo (5)')).toBeInTheDocument()
    unmount()

    renderGrilla(null, [])
    expect(screen.getByText(/aún no tenés productos/i)).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: /paginación/i })).toBeNull()
  })

  it('el colaborador ve el catálogo paginado por nombre y sin costos', () => {
    render(
      <MonitoredCatalogGrid
        products={catalogo().map(({ id, name, salePrice, ingredients }) => ({ id, name, salePrice, ingredients }))}
        isLoading={false}
        isCollaborator
        selectedBucket={null}
        onClearFilter={vi.fn()}
      />
    )
    expect(tarjetas()).toHaveLength(20)
    expect(tarjetas()[0]).toHaveTextContent(/^Alfajor de maicena/)
    const primera = tarjetas()[0].closest('a') as HTMLElement
    expect(within(primera).queryByText(/costo/i)).toBeNull()
  })
})