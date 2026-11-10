import { describe, it, expect } from 'vitest';
import { getAvailableRecipeUnits, convertToBaseQty, convertToRecipeUnitQty } from '../recipeConversion';

describe('recipeConversion', () => {
  it('getAvailableRecipeUnits devuelve las unidades correctas', () => {
    expect(getAvailableRecipeUnits('kg')).toEqual(['gr', 'kg']);
    expect(getAvailableRecipeUnits('l')).toEqual(['ml', 'litro']);
    expect(getAvailableRecipeUnits('u')).toEqual(['u']);
  });

  it('convertToBaseQty convierte y detecta pérdida de precisión', () => {
    expect(convertToBaseQty(250, 'gr', 'kg')).toEqual({ baseQty: 0.25, precisionLost: false });
    expect(convertToBaseQty(0.5, 'gr', 'kg')).toEqual({ baseQty: 0.001, precisionLost: true });
    expect(convertToBaseQty(1, 'kg', 'kg')).toEqual({ baseQty: 1, precisionLost: false });
  });

  it('convertToRecipeUnitQty convierte de vuelta a la unidad de receta', () => {
    expect(convertToRecipeUnitQty(0.25, 'gr', 'kg')).toBe(250);
    expect(convertToRecipeUnitQty(1, 'kg', 'kg')).toBe(1);
  });
});