import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom'

import { ProductMobileFooter } from './ProductMobileFooter'

describe('ProductMobileFooter (Mobile 360px)', () => {
  it('renderiza el precio, costo, ganancia y badge de margen en la fila de información', () => {
    render(
      <ProductMobileFooter
        isCollaborator={false}
        watchedSalePrice={15000}
        gain={5000}
        cost={10000}
        margin={33.3}
        targetMargin={30}
        itemsCount={3}
        isSaving={false}
        onOpenSimulator={vi.fn()}
      />
    )

    expect(screen.getByText('Precio:')).toBeInTheDocument()
    expect(screen.getByText('$15.000')).toBeInTheDocument()
    expect(screen.getByText('Ganancia:')).toBeInTheDocument()
    expect(screen.getByText('$5.000')).toBeInTheDocument()
    expect(screen.getByText('Costo:')).toBeInTheDocument()
    expect(screen.getByText('$10.000')).toBeInTheDocument()
    expect(screen.getByText(/Saludable/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ajustar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Guardar/i })).toBeInTheDocument()
  })

  it('oculta datos financieros y botones de mutación para rol colaborador', () => {
    render(
      <ProductMobileFooter
        isCollaborator={true}
        watchedSalePrice={15000}
        gain={5000}
        cost={10000}
        margin={33.3}
        targetMargin={30}
        itemsCount={3}
        isSaving={false}
        onOpenSimulator={vi.fn()}
      />
    )

    expect(screen.getByText('Precio:')).toBeInTheDocument()
    expect(screen.getByText('$15.000')).toBeInTheDocument()
    expect(screen.queryByText('Ganancia:')).not.toBeInTheDocument()
    expect(screen.queryByText('Costo:')).not.toBeInTheDocument()
    expect(screen.queryByText(/Saludable/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Ajustar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Guardar/i })).not.toBeInTheDocument()
  })
})