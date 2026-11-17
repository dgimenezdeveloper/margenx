import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ProductMasterDataForm } from '../app/productos/[id]/components/ProductMasterDataForm'
import { CANONICAL_FOCUS_CLASSES } from '../lib/accessibility'

describe('Accesibilidad en ProductMasterDataForm (/productos/:id) (#361)', () => {
  const defaultProps = {
    isCollaborator: false,
    isDirty: false,
    productName: 'Pan flauta',
    salePrice: 4500,
    register: vi.fn((name: string) => ({
      name,
      onChange: vi.fn(),
      onBlur: vi.fn(),
      ref: vi.fn(),
    })) as never,
    setValue: vi.fn(),
    errors: {},
    watchedMinMargin: '30',
  }

  it('vincula explícitamente etiquetas con sus respectivos inputs mediante htmlFor e id', () => {
    render(<ProductMasterDataForm {...defaultProps} />)

    const nameInput = screen.getByLabelText(/nombre del producto/i)
    const marginInput = screen.getByLabelText(/margen mínimo objetivo/i)

    expect(nameInput).toBeInTheDocument()
    expect(nameInput.getAttribute('id')).toBe('product-name')

    expect(marginInput).toBeInTheDocument()
    expect(marginInput.getAttribute('id')).toBe('product-min-margin')

    expect((nameInput as HTMLInputElement).labels?.length).toBeGreaterThan(0)
    expect((marginInput as HTMLInputElement).labels?.length).toBeGreaterThan(0)
  })

  it('hacer clic en la etiqueta transfiere el foco al input correspondiente', async () => {
    const user = userEvent.setup()
    render(<ProductMasterDataForm {...defaultProps} />)

    const nameLabel = screen.getByText(/nombre del producto/i)
    await user.click(nameLabel)
    expect(document.activeElement).toBe(screen.getByLabelText(/nombre del producto/i))

    const marginLabel = screen.getByText(/margen mínimo objetivo/i)
    await user.click(marginLabel)
    expect(document.activeElement).toBe(screen.getByLabelText(/margen mínimo objetivo/i))
  })

  it('aplica las clases canónicas de anillo de foco accesible en los campos editables', () => {
    render(<ProductMasterDataForm {...defaultProps} />)

    const nameInput = screen.getByLabelText(/nombre del producto/i)
    CANONICAL_FOCUS_CLASSES.split(' ').forEach((cls) => {
      expect(nameInput.className).toContain(cls)
    })
  })

  it('para rol colaborador omite inputs editables y mantiene lectura accesible', () => {
    render(<ProductMasterDataForm {...defaultProps} isCollaborator={true} />)

    // No debe existir ningún input o textbox editable
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByLabelText(/nombre del producto/i)).toBeNull()
    expect(screen.queryByLabelText(/margen mínimo objetivo/i)).toBeNull()

    // Los datos deben estar presentes como texto legible
    expect(screen.getByText('Pan flauta')).toBeInTheDocument()
    expect(screen.getByText('$4.500,00')).toBeInTheDocument()
  })
})