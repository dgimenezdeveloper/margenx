import { describe, it, expect } from 'vitest';
import { productSchema } from '../productSchema';

describe('productSchema', () => {
  it('valida exitosamente un producto comercial correcto', () => {
    const valid = {
      name: 'Medialunas de manteca — docena',
      salePrice: 13500,
      minMarginPercent: 65,
    };
    const parsed = productSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('coacciona números expresados como cadenas numéricas', () => {
    const input = {
      name: 'Pan flauta 1kg',
      salePrice: '4332.14',
      minMarginPercent: '55.00',
    };
    const parsed = productSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.salePrice).toBe(4332.14);
      expect(parsed.data.minMarginPercent).toBe(55);
    }
  });

  it('rechaza nombres vacíos o con longitud menor a 2 caracteres', () => {
    expect(productSchema.safeParse({ name: '', salePrice: 1000, minMarginPercent: 30 }).success).toBe(false);
    expect(productSchema.safeParse({ name: '   ', salePrice: 1000, minMarginPercent: 30 }).success).toBe(false);
    expect(productSchema.safeParse({ name: 'A', salePrice: 1000, minMarginPercent: 30 }).success).toBe(false);
  });

  it('rechaza precios de venta menores o iguales a cero', () => {
    const zero = productSchema.safeParse({ name: 'Venta 0', salePrice: 0, minMarginPercent: 30 });
    expect(zero.success).toBe(false);
    if (!zero.success) {
      expect(zero.error.issues[0].message).toBe('El precio de venta debe ser mayor a 0');
    }

    const negative = productSchema.safeParse({ name: 'Negativo', salePrice: -50, minMarginPercent: 30 });
    expect(negative.success).toBe(false);
  });

  it('rechaza precios de venta que superan el límite de $99.999.999,99', () => {
    const overflow = productSchema.safeParse({
      name: 'Exceso',
      salePrice: 100_000_000,
      minMarginPercent: 30,
    });
    expect(overflow.success).toBe(false);
    if (!overflow.success) {
      expect(overflow.error.issues[0].message).toBe('El precio de venta no puede superar $99.999.999,99.');
    }
  });

  it('valida el rango de margen mínimo entre 0% y 999.99%', () => {
    expect(productSchema.safeParse({ name: 'Min Zero', salePrice: 100, minMarginPercent: 0 }).success).toBe(true);
    expect(productSchema.safeParse({ name: 'Max DB', salePrice: 100, minMarginPercent: 999.99 }).success).toBe(true);

    const negativeMargin = productSchema.safeParse({ name: 'Neg Margin', salePrice: 100, minMarginPercent: -1 });
    expect(negativeMargin.success).toBe(false);

    const overflowMargin = productSchema.safeParse({ name: 'Over Margin', salePrice: 100, minMarginPercent: 1000 });
    expect(overflowMargin.success).toBe(false);
  });
});