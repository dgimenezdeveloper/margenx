import { describe, it, expect } from 'vitest';
import { parseArgentineDecimal } from './argentineNumber';

describe('parseArgentineDecimal', () => {
  it('interpreta correctamente números con formato argentino estándar (coma decimal y punto de miles)', () => {
    expect(parseArgentineDecimal('1.234,56').toString()).toBe('1234.56');
    expect(parseArgentineDecimal('1.500.000,50').toString()).toBe('1500000.5');
    expect(parseArgentineDecimal('1234,56').toString()).toBe('1234.56');
    expect(parseArgentineDecimal('0,75').toString()).toBe('0.75');
  });

  it('interpreta correctamente grupos de miles puros sin coma', () => {
    expect(parseArgentineDecimal('1.234').toString()).toBe('1234');
    expect(parseArgentineDecimal('15.000').toString()).toBe('15000');
    expect(parseArgentineDecimal('1.500.000').toString()).toBe('1500000');
  });

  it('resuelve 1234.567 como punto decimal y NO como separador de miles (Fix Bloqueante Review)', () => {
    // Al tener 4 dígitos antes del punto, no es un grupo de miles; es un decimal estándar con 3 cifras
    expect(parseArgentineDecimal('1234.567').toString()).toBe('1234.567');
    expect(parseArgentineDecimal('12345.678').toString()).toBe('12345.678');
  });

  it('admite números flotantes estándar y enteros puros', () => {
    expect(parseArgentineDecimal('12.5').toString()).toBe('12.5');
    expect(parseArgentineDecimal('1500').toString()).toBe('1500');
    expect(parseArgentineDecimal(2500.75).toString()).toBe('2500.75');
  });

  it('rechaza entradas inválidas o ambiguas', () => {
    expect(() => parseArgentineDecimal('')).toThrow(/obligatorio/);
    expect(() => parseArgentineDecimal(null)).toThrow(/obligatorio/);
    expect(() => parseArgentineDecimal('abc')).toThrow(/decimal válido/);
    expect(() => parseArgentineDecimal('1.2.3')).toThrow(/decimal válido/);
    expect(() => parseArgentineDecimal('12,34,56')).toThrow(/decimal válido/);
  });

  it('rechaza desbordes numéricos por encima de $99.999.999,99', () => {
    expect(() => parseArgentineDecimal('100.000.000')).toThrow(/no puede superar \$99\.999\.999,99/);
    expect(() => parseArgentineDecimal('100000000.00')).toThrow(/no puede superar \$99\.999\.999,99/);
  });
});