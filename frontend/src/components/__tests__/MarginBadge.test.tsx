import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MarginBadge } from '../MarginBadge'

describe('MarginBadge Component (#358)', () => {
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

  it('Estado "Borrador": renderiza el badge neutro si hasRecipe es false o la receta no tiene ingredientes', () => {
    render(<MarginBadge hasRecipe={false} />)
    expect(screen.getByText('Borrador')).toBeDefined()

    render(<MarginBadge ingredientsCount={0} />)
    expect(screen.getAllByText('Borrador')).toHaveLength(2)

    render(<MarginBadge ingredients={[]} />)
    expect(screen.getAllByText('Borrador')).toHaveLength(3)
  })

  it('Guarda defensiva: no renderiza si faltan los porcentajes de margen en un producto con receta', () => {
    const { container } = render(
      <MarginBadge hasRecipe={true} marginPercent={null} minMarginPercent={30} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('Estado "Pérdida": muestra Pérdida y formatea valores negativos extremos en es-AR', () => {
    render(
      <MarginBadge
        hasRecipe={true}
        marginPercent={-29546.15}
        minMarginPercent={30}
        showValue={true}
      />
    )

    expect(screen.getByText('Pérdida')).toBeDefined()
    expect(screen.getByText(/-29\.546,2 %/)).toBeDefined()
    expect(screen.getByLabelText(/Pérdida: -29\.546,2 %/)).toBeDefined()
  })

  it('Estado "En riesgo": renderiza el estado unificado cuando el margen >= 0 está por debajo del mínimo', () => {
    render(
      <MarginBadge
        hasRecipe={true}
        marginPercent={25.4}
        minMarginPercent={30}
        showValue={true}
      />
    )

    expect(screen.getByText('En riesgo')).toBeDefined()
    expect(screen.getByText(/25,4 %/)).toBeDefined()
  })

  it('Estado "En objetivo": renderiza el estado unificado cuando cumple el mínimo hasta 60 %', () => {
    render(
      <MarginBadge
        hasRecipe={true}
        marginPercent={60.0}
        minMarginPercent={30}
        showValue={true}
      />
    )

    expect(screen.getByText('En objetivo')).toBeDefined()
    expect(screen.getByText(/60 %/)).toBeDefined()
  })

  it('Estado "Superávit": renderiza el estado unificado cuando supera el mínimo y el 60 %', () => {
    render(
      <MarginBadge
        hasRecipe={true}
        marginPercent={73.2}
        minMarginPercent={65}
        showValue={true}
      />
    )

    expect(screen.getByText('Superávit')).toBeDefined()
    expect(screen.getByText(/73,2 %/)).toBeDefined()
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

    expect(screen.getByText('En objetivo')).toBeDefined()
    expect(screen.queryByText(/40 %/)).toBeNull()
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