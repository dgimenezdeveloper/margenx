import { describe, it, expect } from 'vitest';
import { getAvailableRecipeUnits, convertToBaseQty, convertToRecipeUnitQty, checkRecipeQuantity } from '../recipeConversion';

describe('recipeConversion', () => {
  it('getAvailableRecipeUnits devuelve las unidades correctas', () => {
    expect(getAvailableRecipeUnits('kg')).toEqual(['gr', 'kg']);
    expect(getAvailableRecipeUnits('l')).toEqual(['ml', 'litro']);
    expect(getAvailableRecipeUnits('u')).toEqual(['u']);
  });

  it('convertToBaseQty convierte y detecta pérdida de precisión en masa (gr a kg)', () => {
    expect(convertToBaseQty(250, 'gr', 'kg')).toEqual({ baseQty: 0.25, precisionLost: false });
    expect(convertToBaseQty(0.5, 'gr', 'kg')).toEqual({ baseQty: 0.001, precisionLost: true });
    expect(convertToBaseQty(1, 'kg', 'kg')).toEqual({ baseQty: 1, precisionLost: false });
  });

  it('convertToBaseQty convierte y detecta pérdida de precisión en volumen (ml a l / litro)', () => {
    // Conversión estándar sin pérdida
    expect(convertToBaseQty(250, 'ml', 'l')).toEqual({ baseQty: 0.25, precisionLost: false });
    expect(convertToBaseQty(500, 'ml', 'litro')).toEqual({ baseQty: 0.5, precisionLost: false });

    // Detección de pérdida de precisión por submúltiplo menor al límite de 3 decimales
    expect(convertToBaseQty(0.5, 'ml', 'l')).toEqual({ baseQty: 0.001, precisionLost: true });
    expect(convertToBaseQty(1, 'litro', 'litro')).toEqual({ baseQty: 1, precisionLost: false });
  });

  it('convertToRecipeUnitQty convierte de vuelta a la unidad de receta (base a submúltiplo)', () => {
    // Masa: kg a gr
    expect(convertToRecipeUnitQty(0.25, 'gr', 'kg')).toBe(250);
    expect(convertToRecipeUnitQty(1, 'kg', 'kg')).toBe(1);

    // Volumen: l / litro a ml
    expect(convertToRecipeUnitQty(0.25, 'ml', 'l')).toBe(250);
    expect(convertToRecipeUnitQty(0.75, 'ml', 'litro')).toBe(750);
    expect(convertToRecipeUnitQty(1, 'litro', 'l')).toBe(1);
  });

  it('convertToRecipeUnitQty no deja restos de coma flotante (1,005 kg = 1005 gr)', () => {
    expect(1.005 * 1000).not.toBe(1005);
    expect(convertToRecipeUnitQty(1.005, 'gr', 'kg')).toBe(1005);
    expect(convertToRecipeUnitQty(0.057, 'ml', 'litro')).toBe(57);
  });

  describe('checkRecipeQuantity', () => {
    it('acepta tal cual una cantidad que la base puede guardar', () => {
      expect(checkRecipeQuantity('250', 'gr', 'kg')).toEqual({ status: 'ok', inputQty: 250, baseQty: 0.25 });
      expect(checkRecipeQuantity('1.125', 'kg', 'kg')).toEqual({ status: 'ok', inputQty: 1.125, baseQty: 1.125 });
    });

    it('redondea a 3 decimales de la unidad del insumo y devuelve el equivalente que se guarda', () => {
      // 0,5 gr de levadura = 0,0005 kg → se guarda 0,001 kg = 1 gr
      expect(checkRecipeQuantity('0.5', 'gr', 'kg')).toEqual({ status: 'rounded', inputQty: 1, baseQty: 0.001 });
      expect(checkRecipeQuantity('1.2346', 'kg', 'kg')).toEqual({ status: 'rounded', inputQty: 1.235, baseQty: 1.235 });
      expect(checkRecipeQuantity('12.6', 'ml', 'litro')).toEqual({ status: 'rounded', inputQty: 13, baseQty: 0.013 });
    });

    it('marca como menor al mínimo una cantidad que redondea a 0 (la API la rechazaría con 400)', () => {
      expect(checkRecipeQuantity('0.4', 'gr', 'kg')).toEqual({ status: 'belowMinimum' });
      expect(checkRecipeQuantity('0.0004', 'kg', 'kg')).toEqual({ status: 'belowMinimum' });
      expect(checkRecipeQuantity('0.3', 'ml', 'l')).toEqual({ status: 'belowMinimum' });
    });

    it('marca como inválida una cantidad vacía, en cero, negativa o no numérica', () => {
      expect(checkRecipeQuantity('', 'gr', 'kg')).toEqual({ status: 'invalid' });
      expect(checkRecipeQuantity('0', 'gr', 'kg')).toEqual({ status: 'invalid' });
      expect(checkRecipeQuantity('-5', 'gr', 'kg')).toEqual({ status: 'invalid' });
      expect(checkRecipeQuantity('abc', 'gr', 'kg')).toEqual({ status: 'invalid' });
    });
  });
});
