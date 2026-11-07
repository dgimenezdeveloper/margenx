import { describe, it, expect } from 'vitest';
import { parseNumeroAR, formatNumeroAR } from './numericFormat';

describe('numericFormat', () => {
  describe('parseNumeroAR', () => {
    it('maneja valores vacíos, nulos e indefinidos', () => {
      expect(parseNumeroAR('')).toBe('');
      expect(parseNumeroAR(null)).toBe('');
      expect(parseNumeroAR(undefined)).toBe('');
      expect(parseNumeroAR('   ')).toBe('');
    });

    it('coma como decimal y puntos como miles', () => {
      expect(parseNumeroAR('1.234,56')).toBe('1234.56');
      expect(parseNumeroAR('1,5')).toBe('1.5');
      expect(parseNumeroAR('1.000.000,99')).toBe('1000000.99');
      expect(parseNumeroAR('1.500.000,00')).toBe('1500000.00');
    });

    it('un solo punto con 1 a 3 dígitos iniciales y 3 dígitos finales se toma como miles', () => {
      expect(parseNumeroAR('1.234')).toBe('1234');
      expect(parseNumeroAR('12.345')).toBe('12345');
      expect(parseNumeroAR('123.456')).toBe('123456');
      expect(parseNumeroAR('-5.000')).toBe('-5000');
    });

    it('múltiples puntos de miles sin coma (B1: 1.500.000)', () => {
      expect(parseNumeroAR('1.500.000')).toBe('1500000');
      expect(parseNumeroAR('1.234.567')).toBe('1234567');
      expect(parseNumeroAR('10.000.000')).toBe('10000000');
      expect(parseNumeroAR('-1.500.000')).toBe('-1500000');
    });

    it('múltiples puntos ambiguos o inválidos se descartan como vacíos', () => {
      expect(parseNumeroAR('1.2.3')).toBe('');
      expect(parseNumeroAR('12.34.56')).toBe('');
      expect(parseNumeroAR('1..500')).toBe('');
    });

    it('múltiples comas se descartan como inválidas', () => {
      expect(parseNumeroAR('1,2,3')).toBe('');
      expect(parseNumeroAR('12,34,56')).toBe('');
    });

    it('cualquier otro caso con un punto se toma como decimal (RV279-M1)', () => {
      expect(parseNumeroAR('12.5')).toBe('12.5');
      expect(parseNumeroAR('123.45')).toBe('123.45');
      expect(parseNumeroAR('12.5000')).toBe('12.5000');
      // Más de 3 dígitos antes del punto con 3 decimales no es miles, se toma como decimal
      expect(parseNumeroAR('12345.678')).toBe('12345.678');
    });

    it('caracteres alfabéticos devuelven vacío', () => {
      expect(parseNumeroAR('abc')).toBe('');
      expect(parseNumeroAR('12a.5')).toBe('');
    });
  });

  describe('formatNumeroAR', () => {
    it('formatea correctamente a es-AR importes estándar', () => {
      expect(formatNumeroAR(1234.56)).toBe('1.234,56');
      expect(formatNumeroAR('1234.56')).toBe('1.234,56');
      expect(formatNumeroAR(1234)).toBe('1.234');
      expect(formatNumeroAR(0)).toBe('0');
      expect(formatNumeroAR('0')).toBe('0');
    });

    it('formatea números grandes sin cortar en 1,5', () => {
      expect(formatNumeroAR(1500000)).toBe('1.500.000');
      expect(formatNumeroAR('1500000')).toBe('1.500.000');
      expect(formatNumeroAR('1.500.000')).toBe('1.500.000');
      expect(formatNumeroAR('1.500.000,50')).toBe('1.500.000,5');
    });

    it('devuelve vacío ante entradas inválidas (RV279-B1)', () => {
      expect(formatNumeroAR('abc')).toBe('');
      expect(formatNumeroAR('1.2.3')).toBe('');
      expect(formatNumeroAR('')).toBe('');
      expect(formatNumeroAR(null)).toBe('');
      expect(formatNumeroAR(undefined)).toBe('');
    });
  });
});