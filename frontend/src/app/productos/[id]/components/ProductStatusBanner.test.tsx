import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '@testing-library/jest-dom'

import { ProductStatusBanner } from './ProductStatusBanner'

describe('ProductStatusBanner - Nomenclatura unificada (#358)', () => {
  it('no renderiza nada para el rol colaborador', () => {
    const { container } = render(
      <ProductStatusBanner
        isCollaborator={true}
        hasRecipe={true}
        targetMargin={30}
        margin={20}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('muestra "Borrador" cuando el producto no tiene receta', () => {
    render(
      <ProductStatusBanner
        isCollaborator={false}
        hasRecipe={false}
        targetMargin={30}
        margin={0}
      />
    )
    expect(screen.getByText('Borrador')).toBeInTheDocument()
  })

  it('muestra "Pérdida" cuando el margen es negativo', () => {
    render(
      <ProductStatusBanner
        isCollaborator={false}
        hasRecipe={true}
        targetMargin={35}
        margin={-15.5}
      />
    )
    expect(screen.getByText('Pérdida')).toBeInTheDocument()
    expect(screen.getByText('-15,5 %')).toBeInTheDocument()
    expect(screen.getByText(/venta a pérdida/i)).toBeInTheDocument()
  })

  it('muestra "En riesgo" cuando el margen >= 0 está por debajo del objetivo', () => {
    render(
      <ProductStatusBanner
        isCollaborator={false}
        hasRecipe={true}
        targetMargin={35}
        margin={22.4}
      />
    )
    expect(screen.getByText('En riesgo')).toBeInTheDocument()
    expect(screen.getByText('22,4 %')).toBeInTheDocument()
    expect(screen.getByText(/por debajo del mínimo \(35 %\)/i)).toBeInTheDocument()
  })

  it('muestra "En objetivo" cuando cumple el mínimo hasta el 60 %', () => {
    render(
      <ProductStatusBanner
        isCollaborator={false}
        hasRecipe={true}
        targetMargin={35}
        margin={45.0}
      />
    )
    expect(screen.getByText('En objetivo')).toBeInTheDocument()
    expect(screen.getByText('45,0 %')).toBeInTheDocument()
  })

  it('muestra "Superávit" cuando supera el mínimo y el 60 %', () => {
    render(
      <ProductStatusBanner
        isCollaborator={false}
        hasRecipe={true}
        targetMargin={40}
        margin={72.5}
      />
    )
    expect(screen.getByText('Superávit')).toBeInTheDocument()
    expect(screen.getByText('72,5 %')).toBeInTheDocument()
  })
})

describe('ProductStatusBanner - contraste AA que marcó axe (#442)', () => {
  it('el aviso de borrador se lee en claro (gris 100) y en oscuro (gris 900)', () => {
    render(<ProductStatusBanner isCollaborator={false} hasRecipe={false} targetMargin={30} margin={0} />)

    for (const texto of [screen.getByText('Estado del producto'), screen.getByText(/Agregá materias primas/)]) {
      // gray-500 sobre gray-100 da 4,39:1 y sobre gray-900, 3,66:1.
      expect(texto).not.toHaveClass('text-gray-500')
      expect(texto).toHaveClass('text-gray-600', 'dark:text-gray-400')
    }
  })
})
