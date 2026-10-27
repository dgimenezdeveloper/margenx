import { describe, it, expect } from 'vitest';
import { ingredientSchema } from '../ingredientSchema';

describe('ingredientSchema', () => {
  it('valida insumos válidos en sus unidades admitidas (kg, litro, unidad)', () => {
    expect(ingredientSchema.safeParse({ name: 'Harina 000', unit: 'kg', currentCost: 736.25 }).success).toBe(true);
    expect(ingredientSchema.safeParse({ name: 'Leche entera', unit: 'litro', currentCost: 1715 }).success).toBe(true);
    expect(ingredientSchema.safeParse({ name: 'Huevo grande', unit: 'unidad', currentCost: 193.33 }).success).toBe(true);
  });

  it('rechaza unidades de medida no estandarizadas', () => {
    const invalidUnit = ingredientSchema.safeParse({ name: 'Sal', unit: 'gramos', currentCost: 200 });
    expect(invalidUnit.success).toBe(false);
    if (!invalidUnit.success) {
      expect(invalidUnit.error.issues[0].message).toBe('Selecciona una unidad válida');
    }
  });

  it('rechaza costos menores o iguales a cero y valores no numéricos', () => {
    expect(ingredientSchema.safeParse({ name: 'Insumo', unit: 'kg', currentCost: 0 }).success).toBe(false);
    expect(ingredientSchema.safeParse({ name: 'Insumo', unit: 'kg', currentCost: -15 }).success).toBe(false);
    expect(ingredientSchema.safeParse({ name: 'Insumo', unit: 'kg', currentCost: 'no-num' }).success).toBe(false);
  });

  it('rechaza costos que exceden el valor máximo de $99.999.999,99', () => {
    const overflow = ingredientSchema.safeParse({
      name: 'Oro',
      unit: 'kg',
      currentCost: 100_000_000,
    });
    expect(overflow.success).toBe(false);
    if (!overflow.success) {
      expect(overflow.error.issues[0].message).toBe('El insumo no puede superar $99.999.999,99.');
    }
  });
});