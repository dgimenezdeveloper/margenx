import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MarginBadge } from '../MarginBadge'

describe('MarginBadge Component', () => {
  it('Blindaje RBAC: no renderiza absolutamente nada en el DOM si el usuario es colaborador', () => {
    const { container } = render(
      <MarginBadge
        marginPercent={45}
        minMarginPercent={30}
        hasRecipe={true}
        isCollaborator={true}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('Estado "Sin Receta": renderiza el badge neutro si hasRecipe es false o la receta no tiene ingredientes', () => {
    render(<MarginBadge hasRecipe={false} />)
    expect(screen.getByText('Sin Receta')).toBeDefined()

    render(<MarginBadge ingredientsCount={0} />)
    expect(screen.getAllByText('Sin Receta')).toHaveLength(2)

    render(<MarginBadge ingredients={[]} />)
    expect(screen.getAllByText('Sin Receta')).toHaveLength(3)
  })

  it('Guarda defensiva: no renderiza si faltan los porcentajes de margen en un producto con receta', () => {
    const { container } = render(
      <MarginBadge hasRecipe={true} marginPercent={null} minMarginPercent={30} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('Estado "Crítico": renderiza semáforo rojo cuando el margen cae por debajo del umbral mínimo', () => {
    render(
      <MarginBadge
        hasRecipe={true}
        marginPercent={25.4}
        minMarginPercent={30}
        showValue={true}
      />
    )

    expect(screen.getByText(/Crítico/i)).toBeDefined()
    expect(screen.getByText(/25.4%/)).toBeDefined()
  })

  it('Estado "Saludable": renderiza semáforo verde cuando el margen cumple o supera el umbral', () => {
    render(
      <MarginBadge
        hasRecipe={true}
        marginPercent={60.0}
        minMarginPercent={30}
        showValue={true}
      />
    )

    expect(screen.getByText(/Saludable/i)).toBeDefined()
    expect(screen.getByText(/60%/)).toBeDefined()
  })

  it('Soporta ocultar el valor numérico con showValue=false', () => {
    render(
      <MarginBadge
        hasRecipe={true}
        marginPercent={40}
        minMarginPercent={30}
        showValue={false}
      />
    )

    expect(screen.getByText('Saludable')).toBeDefined()
    expect(screen.queryByText(/40%/)).toBeNull()
  })

  it('Aplica las clases responsivas según el tamaño (sm / md)', () => {
    const { container: smContainer } = render(
      <MarginBadge hasRecipe={true} marginPercent={50} minMarginPercent={30} size="sm" />
    )
    expect(smContainer.firstElementChild?.className).toContain('text-[11px]')

    const { container: mdContainer } = render(
      <MarginBadge hasRecipe={true} marginPercent={50} minMarginPercent={30} size="md" />
    )
    expect(mdContainer.firstElementChild?.className).toContain('text-xs')
  })
})