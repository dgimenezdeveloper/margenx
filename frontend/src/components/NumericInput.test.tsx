import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import { NumericInput } from './NumericInput'

describe('NumericInput', () => {
  it('muestra el valor formateado inicialmente', () => {
    render(<NumericInput value="1234.56" />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input.value).toBe('1.234,56')
  })

  it('permite escribir y llama a onChange con el valor parseado', () => {
    const handleChange = vi.fn()
    render(<NumericInput value="" onChange={handleChange} />)
    const input = screen.getByRole('textbox') as HTMLInputElement

    fireEvent.change(input, { target: { value: '1.234,56' } })
    expect(input.value).toBe('1.234,56')
    expect(handleChange).toHaveBeenCalledWith('1234.56')
  })

  it('formatea el valor al perder el foco', () => {
    const handleChange = vi.fn()
    render(<NumericInput value="" onChange={handleChange} />)
    const input = screen.getByRole('textbox') as HTMLInputElement

    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '1234,5' } })
    fireEvent.blur(input)

    expect(input.value).toBe('1.234,50')
    expect(handleChange).toHaveBeenCalledWith('1234.5')
  })

  it('muestra el error si se provee', () => {
    render(<NumericInput value="" error="Campo requerido" />)
    expect(screen.getByText('Campo requerido')).toBeInTheDocument()
  })
})