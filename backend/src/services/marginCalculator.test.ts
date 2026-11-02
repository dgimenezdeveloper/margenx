import { describe, it, expect, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  calculateItemCost,
  calculateRecipeTotal,
  calculateMarginAmount,
  calculateMarginPercent,
  calculateUnitCost,
  applyIngredientCostChange,
  applyBatchIngredientCostChanges,
} from './marginCalculator';

const D = (v: string | number) => new Prisma.Decimal(v);

describe('calculateItemCost', () => {
  it('calcula el costo exacto sin artefactos de punto flotante', () => {
    const result = calculateItemCost(D('0.125'), D('742.98'));
    expect(result.toFixed(2)).toBe('92.87');
    expect(result.toString()).not.toContain('92.8725000');
  });

  it('soporta cantidades mínimas (0.001)', () => {
    expect(calculateItemCost(D('0.001'), D('100')).toFixed(2)).toBe('0.10');
  });

  it('soporta valores monetarios altos sin pérdida de precisión', () => {
    expect(calculateItemCost(D('12'), D('999999.99')).toFixed(2)).toBe('11999999.88');
  });

  it('retorna 0.00 si la cantidad es <= 0', () => {
    expect(calculateItemCost(D('0'), D('100')).toFixed(2)).toBe('0.00');
    expect(calculateItemCost(D('-5'), D('100')).toFixed(2)).toBe('0.00');
  });

  it('retorna 0.00 si el costo unitario es <= 0', () => {
    expect(calculateItemCost(D('5'), D('0')).toFixed(2)).toBe('0.00');
    expect(calculateItemCost(D('5'), D('-10')).toFixed(2)).toBe('0.00');
  });
});

describe('calculateRecipeTotal', () => {
  it('retorna 0.00 si la lista está vacía (producto sin ingredientes)', () => {
    expect(calculateRecipeTotal([]).toFixed(2)).toBe('0.00');
  });

  it('retorna 0.00 si items no es un array', () => {
    // @ts-expect-error — probando robustez ante input inválido en runtime
    expect(calculateRecipeTotal(null).toFixed(2)).toBe('0.00');
  });

  it('suma el costo de múltiples ítems', () => {
    const total = calculateRecipeTotal([
      { quantity: D('0.125'), unitCost: D('742.98') }, // 92.87
      { quantity: D('2'), unitCost: D('10.50') },       // 21.00
    ]);
    expect(total.toFixed(2)).toBe('113.87');
  });

  it('ignora ítems con cantidad inválida dentro de la receta', () => {
    const total = calculateRecipeTotal([
      { quantity: D('2'), unitCost: D('10') },  // 20.00
      { quantity: D('0'), unitCost: D('999') }, // inválido, no suma
    ]);
    expect(total.toFixed(2)).toBe('20.00');
  });
});

describe('calculateMarginAmount', () => {
  it('retorna 0.00 sin ingredientes (totalCost = 0), sin importar el precio', () => {
    // Caso reportado por QA: antes daba 50.00
    expect(calculateMarginAmount(D('50.00'), D('0.00')).toFixed(2)).toBe('0.00');
  });

  it('calcula el margen normalmente cuando hay costo', () => {
    expect(calculateMarginAmount(D('100'), D('60')).toFixed(2)).toBe('40.00');
  });

  it('permite margen negativo cuando salePrice es menor al costo (borrador en $0)', () => {
    // Gherkin: costo $1500, precio $0 => -$1500.00
    expect(calculateMarginAmount(D('0'), D('1500')).toFixed(2)).toBe('-1500.00');
  });

  it('soporta valores monetarios altos', () => {
    expect(calculateMarginAmount(D('999999.99'), D('500000.01')).toFixed(2)).toBe('499999.98');
  });
});

describe('calculateMarginPercent', () => {
  it('retorna 0.00% si salePrice <= 0, sin excepción', () => {
    // Gherkin: costo $1500, precio $0 => 0.00%, no Infinity/NaN
    const result = calculateMarginPercent(D('0'), D('1500'));
    expect(result.toFixed(2)).toBe('0.00');
    expect(result.isFinite()).toBe(true);
  });

  it('retorna 0.00% si salePrice es negativo', () => {
    expect(calculateMarginPercent(D('-10'), D('100')).toFixed(2)).toBe('0.00');
  });

  it('retorna 0.00% sin ingredientes (totalCost = 0)', () => {
    expect(calculateMarginPercent(D('100'), D('0')).toFixed(2)).toBe('0.00');
  });

  it('calcula el porcentaje normalmente', () => {
    expect(calculateMarginPercent(D('100'), D('60')).toFixed(2)).toBe('40.00');
  });

  it('redondea correctamente números periódicos (1/3)', () => {
    // (300-100)/300*100 = 66.666...% -> 66.67
    expect(calculateMarginPercent(D('300'), D('100')).toFixed(2)).toBe('66.67');
  });

  it('soporta valores monetarios altos', () => {
    expect(calculateMarginPercent(D('1000000'), D('250000')).toFixed(2)).toBe('75.00');
  });

  it('soporta márgenes negativos y positivos extremos sin romper el parseo', () => {
    expect(calculateMarginPercent(D('2'), D('100')).toFixed(2)).toBe('-4900.00');
    expect(calculateMarginPercent(D('1000000'), D('200000')).toFixed(2)).toBe('80.00');
  });
});

describe('calculateUnitCost', () => {
  it('calcula 35000 / 50 = 700', () => {
    expect(calculateUnitCost(D('35000'), D('50')).toString()).toBe('700');
  });

  it('consulta oldCost a DB cuando previousCost es null en applyIngredientCostChange (Líneas 129-132)', async () => {
    const mockTx = {
      ingredient: {
        findUnique: vi.fn().mockResolvedValue({ currentCost: new Prisma.Decimal('100') }),
      },
      priceHistory: {
        create: vi.fn().mockResolvedValue({}),
      },
      productIngredient: { findMany: vi.fn().mockResolvedValue([]) },
      product: { findUnique: vi.fn(), update: vi.fn() },
    };

    // previousCost es null, forzamos la llamada a la DB
    await applyIngredientCostChange(mockTx, 'ing-1', null, new Prisma.Decimal('120'));

    expect(mockTx.ingredient.findUnique).toHaveBeenCalled();
    expect(mockTx.priceHistory.create).toHaveBeenCalled();
  });

  it('redondea 10000 / 3 con HALF_UP a 3333.33', () => {
    expect(calculateUnitCost(D('10000'), D('3')).toString()).toBe('3333.33');
  });

  it('resuelve presentación fraccionaria 0.5 kg por $1.250 = 2500', () => {
    expect(calculateUnitCost(D('1250'), D('0.5')).toString()).toBe('2500');
  });

  it('lanza un error si packageSize es 0 o negativo', () => {
    expect(() => calculateUnitCost(D('100'), D('0'))).toThrow(/mayor a cero/i);
    expect(() => calculateUnitCost(D('100'), D('-1'))).toThrow(/mayor a cero/i);
  });

  it('lanza un error si el resultado redondeado queda en 0.00', () => {
    expect(() => calculateUnitCost(D('0.01'), D('100'))).toThrow(/mayor a cero/i);
  });

  describe('Casos de frontera (Issue #277 / Reporte Sprint 4 §3.2)', () => {
    it('lanza error cuando packagePrice <= 0 en calculateUnitCost (Líneas 59-60)', () => {
      expect(() =>
        calculateUnitCost(new Prisma.Decimal(0), new Prisma.Decimal(10))
      ).toThrow('El campo "packagePrice" debe ser mayor a cero.');

      expect(() =>
        calculateUnitCost(new Prisma.Decimal(-50), new Prisma.Decimal(10))
      ).toThrow('El campo "packagePrice" debe ser mayor a cero.');
    });

    it('lanza error cuando unitCost excede MAX_MONEY_VALUE en calculateUnitCost (Líneas 67-68)', () => {
      const hugePrice = new Prisma.Decimal('999999999999');
      const tinySize = new Prisma.Decimal('0.001');
      expect(() => calculateUnitCost(hugePrice, tinySize)).toThrow(
        'El costo unitario calculado no puede superar $99.999.999,99.'
      );
    });

    it('registra priceHistory cuando oldCost difiere de newCost en applyIngredientCostChange (Líneas 129-132)', async () => {
      const mockTx = {
        ingredient: {
          findUnique: vi.fn().mockResolvedValue({ currentCost: new Prisma.Decimal('100') }),
        },
        priceHistory: {
          create: vi.fn().mockResolvedValue({}),
        },
        productIngredient: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        product: {
          findUnique: vi.fn(),
          update: vi.fn(),
        },
      };

      await applyIngredientCostChange(
        mockTx,
        'ing-1',
        new Prisma.Decimal('100'),
        new Prisma.Decimal('120')
      );

      expect(mockTx.priceHistory.create).toHaveBeenCalledWith({
        data: {
          ingredientId: 'ing-1',
          oldCost: new Prisma.Decimal('100'),
          newCost: new Prisma.Decimal('120'),
        },
      });
    });
  });
});

describe('applyBatchIngredientCostChanges', () => {
  it('retorna 0 afectados si la lista de cambios está vacía o no es un array', async () => {
    const mockTx = {
      ingredient: { findUnique: vi.fn() },
      priceHistory: { create: vi.fn() },
      productIngredient: { findMany: vi.fn() },
      product: { findMany: vi.fn(), update: vi.fn() },
    };

    const res1 = await applyBatchIngredientCostChanges(mockTx, []);
    expect(res1.affectedProductsCount).toBe(0);
    expect(res1.criticalProducts).toEqual([]);
    expect(mockTx.productIngredient.findMany).not.toHaveBeenCalled();

    // @ts-expect-error probando robustez ante input inválido
    const res2 = await applyBatchIngredientCostChanges(mockTx, null);
    expect(res2.affectedProductsCount).toBe(0);
  });

  it('no registra PriceHistory si oldCost es igual a newCost', async () => {
    const mockTx = {
      priceHistory: { create: vi.fn() },
      productIngredient: { findMany: vi.fn().mockResolvedValue([]) },
    };

    await applyBatchIngredientCostChanges(mockTx, [
      { ingredientId: 'ing-1', previousCost: D('100'), newCost: D('100') },
    ]);

    expect(mockTx.priceHistory.create).not.toHaveBeenCalled();
  });

  it('Gherkin Escenario "Producto compartido": recalcula una sola vez consolidando 3 insumos y genera 1 sola alerta', async () => {
    const productTorta = {
      id: 'prod-torta',
      name: 'Torta Especial',
      salePrice: D('15000.00'),
      minMarginPercent: D('30.00'),
      cost: D('5300.00'),
      marginPercent: D('64.67'),
      ingredients: [
        { ingredientId: 'ing-harina', quantity: D('1.000'), ingredient: { currentCost: D('1000.00') } },
        { ingredientId: 'ing-manteca', quantity: D('0.500'), ingredient: { currentCost: D('8000.00') } },
        { ingredientId: 'ing-azucar', quantity: D('0.300'), ingredient: { currentCost: D('1000.00') } },
      ],
    };

    const mockTx = {
      priceHistory: { create: vi.fn().mockResolvedValue({}) },
      productIngredient: {
        findMany: vi.fn().mockResolvedValue([
          { productId: 'prod-torta' },
          { productId: 'prod-torta' },
          { productId: 'prod-torta' },
        ]),
      },
      product: {
        findMany: vi.fn().mockResolvedValue([productTorta]),
        update: vi.fn().mockResolvedValue({}),
      },
    };

    const changes = [
      { ingredientId: 'ing-harina', previousCost: D('1000.00'), newCost: D('2500.00') },
      { ingredientId: 'ing-manteca', previousCost: D('8000.00'), newCost: D('16000.00') },
      { ingredientId: 'ing-azucar', previousCost: D('1000.00'), newCost: D('3000.00') },
    ];

    const result = await applyBatchIngredientCostChanges(mockTx, changes);

    expect(mockTx.priceHistory.create).toHaveBeenCalledTimes(3);

    expect(mockTx.productIngredient.findMany).toHaveBeenCalledWith({
      where: { ingredientId: { in: ['ing-harina', 'ing-manteca', 'ing-azucar'] } },
      select: { productId: true },
    });

    expect(mockTx.product.findMany).toHaveBeenCalledTimes(1);
    expect(mockTx.product.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['prod-torta'] } },
      include: expect.any(Object),
    });

    expect(mockTx.product.update).toHaveBeenCalledTimes(1);
    expect(mockTx.product.update).toHaveBeenCalledWith({
      where: { id: 'prod-torta' },
      data: {
        cost: D('11400.00'),
        marginAmount: D('3600.00'),
        marginPercent: D('24.00'),
      },
    });

    expect(result.affectedProductsCount).toBe(1);
    expect(result.affectedProducts).toHaveLength(1);
    expect(result.criticalProducts).toHaveLength(1);
    expect(result.criticalProducts[0]).toMatchObject({
      productId: 'prod-torta',
      productName: 'Torta Especial',
      newCost: D('11400.00'),
      currentMarginPercent: D('24.00'),
    });
  });

  it('soporta fallback defensivo con findUnique cuando tx.product.findMany no está mockeado', async () => {
    const productSimple = {
      id: 'prod-1',
      name: 'Pan',
      salePrice: D('2000.00'),
      minMarginPercent: D('30.00'),
      cost: D('1000.00'),
      marginPercent: D('50.00'),
      ingredients: [
        { ingredientId: 'ing-1', quantity: D('1.000'), ingredient: { currentCost: D('1000.00') } },
      ],
    };

    const mockTx = {
      priceHistory: { create: vi.fn().mockResolvedValue({}) },
      productIngredient: { findMany: vi.fn().mockResolvedValue([{ productId: 'prod-1' }]) },
      product: {
        // findMany NO está definido intencionalmente para ejercitar el fallback
        findUnique: vi.fn().mockResolvedValue(productSimple),
        update: vi.fn().mockResolvedValue({}),
      },
    };

    const result = await applyBatchIngredientCostChanges(mockTx, [
      { ingredientId: 'ing-1', previousCost: D('1000.00'), newCost: D('1200.00') },
    ]);

    expect(mockTx.product.findUnique).toHaveBeenCalledTimes(1);
    expect(mockTx.product.update).toHaveBeenCalledTimes(1);
    expect(result.affectedProductsCount).toBe(1);
  });

  it('no marca producto como crítico si ya venía por debajo del margen mínimo (sin cruce)', async () => {
    const productBajo = {
      id: 'prod-bajo',
      name: 'Pan Económico',
      salePrice: D('1000.00'),
      minMarginPercent: D('30.00'),
      cost: D('800.00'),
      marginPercent: D('20.00'),
      ingredients: [
        { ingredientId: 'ing-1', quantity: D('1.000'), ingredient: { currentCost: D('800.00') } },
      ],
    };

    const mockTx = {
      priceHistory: { create: vi.fn().mockResolvedValue({}) },
      productIngredient: { findMany: vi.fn().mockResolvedValue([{ productId: 'prod-bajo' }]) },
      product: {
        findMany: vi.fn().mockResolvedValue([productBajo]),
        update: vi.fn().mockResolvedValue({}),
      },
    };

    const result = await applyBatchIngredientCostChanges(mockTx, [
      { ingredientId: 'ing-1', previousCost: D('800.00'), newCost: D('900.00') },
    ]);

    expect(result.affectedProductsCount).toBe(1);
    expect(result.criticalProducts).toHaveLength(0);
  });
});