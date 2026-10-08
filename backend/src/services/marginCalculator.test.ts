import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  calculateItemCost,
  calculateRecipeTotal,
  calculateMarginAmount,
  calculateMarginPercent,
  calculateUnitCost,
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

  it('calcula 18500 / 25 = 740', () => {
    expect(calculateUnitCost(D('18500'), D('25')).toString()).toBe('740');
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
});