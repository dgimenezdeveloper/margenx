import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { NumericInput } from './NumericInput';

describe('NumericInput', () => {
  it('muestra el valor formateado inicialmente', () => {
    render(<NumericInput value="1234.56" />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('1.234,56');
  });

  it('permite escribir y llama a onChange con el valor parseado', () => {
    const handleChange = vi.fn();
    render(<NumericInput value="" onChange={handleChange} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '1.234,56' } });
    expect(input.value).toBe('1.234,56');
    expect(handleChange).toHaveBeenCalledWith('1234.56');
  });

  it('formatea el valor al perder el foco sin pisarlo con vacío (B2)', () => {
    const handleChange = vi.fn();
    render(<NumericInput value="" onChange={handleChange} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '1234,56' } });
    fireEvent.blur(input);

    expect(input.value).toBe('1.234,56');
    expect(handleChange).toHaveBeenCalledWith('1234.56');
  });

  it('soporta montos millonarios con puntos de miles como 1.500.000 sin corromper a 1,5 (B1)', () => {
    const handleChange = vi.fn();
    render(<NumericInput value="" onChange={handleChange} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '1.500.000' } });
    fireEvent.blur(input);

    expect(input.value).toBe('1.500.000');
    expect(handleChange).toHaveBeenCalledWith('1500000');
  });

  it('muestra el mensaje de error si se provee', () => {
    render(<NumericInput value="" error="El costo debe ser mayor a 0" />);
    expect(screen.getByText('El costo debe ser mayor a 0')).toBeInTheDocument();
  });
});