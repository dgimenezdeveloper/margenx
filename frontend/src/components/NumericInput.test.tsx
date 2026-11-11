import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
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

  it('no muestra "0" si se monta con un valor inválido (RV279-B1)', () => {
    render(<NumericInput value="abc" />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('no convierte 1,250 en 1250 al volver a entrar y salir del campo (#352)', () => {
    const emitted: string[] = [];
    function Harness() {
      // Como los formularios reales: el estado guarda lo que emite onChange y vuelve como prop
      const [value, setValue] = useState('1');
      return <NumericInput value={value} maxDecimals={3} onChange={(v) => { emitted.push(v); setValue(v); }} />;
    }
    render(<Harness />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '1,250' } });
    fireEvent.blur(input);
    expect(input.value).toBe('1,25');

    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(input.value).toBe('1,25');
    expect(emitted.every((v) => Number(v) === 1.25)).toBe(true);
  });

  it('muestra un valor canónico de 3 decimales recibido por props sin leerlo como miles', () => {
    render(<NumericInput value="1.125" maxDecimals={3} />);
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('1,125');
  });

  it('muestra 2 decimales por defecto y respeta maxDecimals para cantidades de receta', () => {
    const { unmount } = render(<NumericInput value={1.125} />);
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('1,13');
    unmount();

    render(<NumericInput value={1.125} maxDecimals={3} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('1,125');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '2,375' } });
    fireEvent.blur(input);
    expect(input.value).toBe('2,375');
  });
});