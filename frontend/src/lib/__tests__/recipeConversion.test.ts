import { describe, it, expect } from 'vitest';
import { getAvailableRecipeUnits, convertToBaseQty, convertToRecipeUnitQty } from '../recipeConversion';

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
});