import { describe, it, expect, vi } from 'vitest';
import { sanitizeDecimal, handleNumericKeyDown, sanitizeDecimalAR, handleDecimalARKeyDown } from '../numericInput';

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

  describe('sanitizeDecimalAR (importes en es-AR, #359)', () => {
    it('conserva el punto de miles y la coma decimal tal como se escriben', () => {
      expect(sanitizeDecimalAR('1.234,56')).toBe('1.234,56');
      expect(sanitizeDecimalAR('1.250')).toBe('1.250');
      expect(sanitizeDecimalAR('2179,13')).toBe('2179,13');
    });

    it('quita símbolos y espacios, y deja una sola coma', () => {
      expect(sanitizeDecimalAR('$ 1.234,56')).toBe('1.234,56');
      expect(sanitizeDecimalAR('1.234,5,6')).toBe('1.234,56');
      expect(sanitizeDecimalAR('12,3.4')).toBe('12,34');
    });

    it('maneja cadenas vacías', () => {
      expect(sanitizeDecimalAR('')).toBe('');
    });
  });

  describe('handleDecimalARKeyDown (importes en es-AR, #359)', () => {
    const keyOn = (key: string, value: string, selectionStart = value.length, selectionEnd = selectionStart) => {
      const preventDefault = vi.fn();
      const event = {
        key,
        ctrlKey: false,
        metaKey: false,
        currentTarget: { value, selectionStart, selectionEnd },
        preventDefault,
      } as unknown as React.KeyboardEvent<HTMLInputElement>;
      handleDecimalARKeyDown(event);
      return preventDefault;
    };

    it('permite el punto de miles y después la coma decimal', () => {
      expect(keyOn('.', '1')).not.toHaveBeenCalled();
      expect(keyOn('.', '1.234')).not.toHaveBeenCalled();
      expect(keyOn(',', '1.234')).not.toHaveBeenCalled();
    });

    it('bloquea la coma o el punto al principio, una segunda coma y un punto después de la coma', () => {
      expect(keyOn('.', '')).toHaveBeenCalled();
      expect(keyOn(',', '')).toHaveBeenCalled();
      expect(keyOn(',', '1.234,5')).toHaveBeenCalled();
      expect(keyOn('.', '1.234,5')).toHaveBeenCalled();
    });

    it('permite la coma si reemplaza a la que está seleccionada', () => {
      expect(keyOn(',', '12,50', 2, 3)).not.toHaveBeenCalled();
    });

    it('delega el resto de las teclas en handleNumericKeyDown', () => {
      expect(keyOn('7', '1.234,5')).not.toHaveBeenCalled();
      expect(keyOn('a', '1.234')).toHaveBeenCalled();
    });
  });
});
