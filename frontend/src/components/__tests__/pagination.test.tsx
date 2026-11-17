import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import '@testing-library/jest-dom'
import { Pagination } from '@/components/pagination'

function renderPagination(overrides: Partial<Parameters<typeof Pagination>[0]> = {}) {
  const props = {
    page: 2,
    totalPages: 11,
    total: 218,
    limit: 20,
    shown: 40,
    itemLabel: 'insumos',
    hasMore: true,
    onPageChange: vi.fn(),
    onLimitChange: vi.fn(),
    onLoadMore: vi.fn(),
    ...overrides,
  }
  render(<Pagination {...props} />)
  return props
}

describe('Pagination', () => {
  it('muestra el rango y el total real, y navega con anterior y siguiente', () => {
    const props = renderPagination()

    expect(screen.getByRole('navigation', { name: 'Paginación de insumos' })).toBeInTheDocument()
    expect(screen.getByText('Mostrando 21–40 de 218 insumos')).toBeInTheDocument()
    expect(screen.getByText('Página 2 de 11')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(props.onPageChange).toHaveBeenCalledWith(3)
    fireEvent.click(screen.getByRole('button', { name: 'Página anterior' }))
    expect(props.onPageChange).toHaveBeenCalledWith(1)
  })

  it('ofrece 20, 50 y 100 filas por página', () => {
    const props = renderPagination()
    const select = screen.getByLabelText('Filas por página')

    expect([...select.querySelectorAll('option')].map((o) => o.textContent)).toEqual(['20', '50', '100'])
    fireEvent.change(select, { target: { value: '50' } })
    expect(props.onLimitChange).toHaveBeenCalledWith(50)
  })

  it('deshabilita anterior en la primera página y siguiente en la última', () => {
    renderPagination({ page: 1, totalPages: 1, total: 7, shown: 7, hasMore: false })

    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled()
    expect(screen.getByText('Mostrando 1–7 de 7 insumos')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cargar más' })).not.toBeInTheDocument()
  })

  it('en mobile ofrece "Cargar más" con lo cargado sobre el total', () => {
    const props = renderPagination()

    expect(screen.getByText('Mostrando 40 de 218 insumos')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cargar más' }))
    expect(props.onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('indica la carga en curso', () => {
    renderPagination({ isLoadingMore: true })
    expect(screen.getByRole('button', { name: 'Cargando...' })).toBeDisabled()
  })

  it('no se muestra si no hay resultados', () => {
    const { container } = render(
      <Pagination
        page={1}
        totalPages={0}
        total={0}
        limit={20}
        shown={0}
        itemLabel="productos"
        hasMore={false}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
        onLoadMore={vi.fn()}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })
})
