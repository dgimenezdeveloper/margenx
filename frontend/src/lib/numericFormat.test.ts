import { describe, it, expect } from 'vitest';
import { parseNumeroAR, formatNumeroAR } from './numericFormat';

describe('numericFormat', () => {
  describe('parseNumeroAR', () => {
    it('maneja vacíos', () => {
      expect(parseNumeroAR('')).toBe('');
      expect(parseNumeroAR(null)).toBe('');
    });
    it('coma como decimal y puntos como miles', () => {
      expect(parseNumeroAR('1.234,56')).toBe('1234.56');
      expect(parseNumeroAR('1,5')).toBe('1.5');
      expect(parseNumeroAR('1.000.000,99')).toBe('1000000.99');
    });
    it('un solo punto con exactamente 3 dígitos se toma como miles', () => {
      expect(parseNumeroAR('1.234')).toBe('1234');
      expect(parseNumeroAR('-5.000')).toBe('-5000');
    });
    it('cualquier otro caso con punto se toma como decimal', () => {
      expect(parseNumeroAR('12.5')).toBe('12.5');
      expect(parseNumeroAR('123.45')).toBe('123.45');
      expect(parseNumeroAR('abc')).toBe('');
    });
  });

  describe('formatNumeroAR', () => {
    it('formatea correctamente a es-AR', () => {
      expect(formatNumeroAR(1234.56)).toBe('1.234,56');
      expect(formatNumeroAR('1234.56')).toBe('1.234,56');
      expect(formatNumeroAR(1234)).toBe('1.234');
    });
  });
});