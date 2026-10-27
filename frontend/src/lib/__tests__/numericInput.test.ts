import { describe, it, expect, vi } from 'vitest';
import { sanitizeDecimal, handleNumericKeyDown } from '../numericInput';

describe('numericInput utility', () => {
  describe('sanitizeDecimal', () => {
    it('preserva números decimales regulares y enteros', () => {
      expect(sanitizeDecimal('1234')).toBe('1234');
      expect(sanitizeDecimal('1234.56')).toBe('1234.56');
    });

    it('elimina caracteres alfabéticos y símbolos monetarios', () => {
      expect(sanitizeDecimal('$1.250,50')).toBe('1.25050');
      expect(sanitizeDecimal('abc-45.99xyz')).toBe('45.99');
    });

    it('colapsa múltiples puntos decimales en un único separador válido', () => {
      expect(sanitizeDecimal('12.34.56.78')).toBe('12.345678');
      expect(sanitizeDecimal('...5')).toBe('.5');
    });

    it('maneja cadenas vacías', () => {
      expect(sanitizeDecimal('')).toBe('');
    });
  });

  describe('handleNumericKeyDown', () => {
    const createEvent = (key: string, value: string, ctrlKey = false, metaKey = false) => {
      const preventDefault = vi.fn();
      const event = {
        key,
        ctrlKey,
        metaKey,
        currentTarget: { value },
        preventDefault,
      } as unknown as React.KeyboardEvent<HTMLInputElement>;
      return { event, preventDefault };
    };

    it('permite dígitos numéricos estándar del 0 al 9', () => {
      for (let i = 0; i <= 9; i++) {
        const { event, preventDefault } = createEvent(String(i), '123');
        handleNumericKeyDown(event);
        expect(preventDefault).not.toHaveBeenCalled();
      }
    });

    it('permite teclas de control y navegación (Backspace, Delete, Tab, Flechas, Enter)', () => {
      const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
      allowed.forEach((k) => {
        const { event, preventDefault } = createEvent(k, '100');
        handleNumericKeyDown(event);
        expect(preventDefault).not.toHaveBeenCalled();
      });
    });

    it('permite combinaciones de atajos con Ctrl o Meta (Cmd)', () => {
      const { event: copyEvt, preventDefault: copyPrevent } = createEvent('c', '100', true);
      handleNumericKeyDown(copyEvt);
      expect(copyPrevent).not.toHaveBeenCalled();

      const { event: pasteEvt, preventDefault: pastePrevent } = createEvent('v', '100', false, true);
      handleNumericKeyDown(pasteEvt);
      expect(pastePrevent).not.toHaveBeenCalled();
    });

    it('permite escribir un único punto decimal en un campo con contenido', () => {
      const { event, preventDefault } = createEvent('.', '125');
      handleNumericKeyDown(event);
      expect(preventDefault).not.toHaveBeenCalled();
    });

    it('bloquea el punto decimal si el campo ya contiene uno', () => {
      const { event, preventDefault } = createEvent('.', '125.50');
      handleNumericKeyDown(event);
      expect(preventDefault).toHaveBeenCalled();
    });

    it('bloquea el punto decimal si el campo está vacío para evitar "." solitario', () => {
      const { event, preventDefault } = createEvent('.', '');
      handleNumericKeyDown(event);
      expect(preventDefault).toHaveBeenCalled();
    });

    it('bloquea letras y caracteres especiales', () => {
      ['a', 'Z', '-', '+', ',', '!', 'e'].forEach((key) => {
        const { event, preventDefault } = createEvent(key, '100');
        handleNumericKeyDown(event);
        expect(preventDefault).toHaveBeenCalled();
      });
    });
  });
});