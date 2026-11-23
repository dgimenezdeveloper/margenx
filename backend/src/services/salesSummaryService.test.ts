import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';
import {
  argentinaDateOf,
  buildSummaryTotals,
  parseSummaryPeriod,
  rankProducts,
  summaryRange,
} from './salesSummaryService';

const D = (v: string | number) => new Prisma.Decimal(v);

describe('parseSummaryPeriod', () => {
  it('acepta day, week y month; por defecto, week', () => {
    expect(parseSummaryPeriod({ period: 'day' })).toBe('day');
    expect(parseSummaryPeriod({ period: 'month' })).toBe('month');
    expect(parseSummaryPeriod({})).toBe('week');
  });

  it('rechaza otro período con 400', () => {
    expect(() => parseSummaryPeriod({ period: 'year' })).toThrow(AppError);
    try {
      parseSummaryPeriod({ period: ['day', 'week'] });
    } catch (error) {
      expect((error as AppError).statusCode).toBe(400);
    }
  });
});

describe('summaryRange: días calendario de Argentina (UTC−3)', () => {
  // Martes 24/11/2026 a las 22:30 de Argentina = miércoles 25/11 01:30 UTC.
  const ahora = new Date('2026-11-25T01:30:00.000Z');

  it('toma la fecha de Argentina, no la de UTC', () => {
    expect(argentinaDateOf(ahora)).toBe('2026-11-24');
  });

  it('day: hoy, y el período anterior es ayer', () => {
    const r = summaryRange('day', ahora);
    expect(r.start.toISOString()).toBe('2026-11-24T03:00:00.000Z');
    expect(r.end.toISOString()).toBe('2026-11-25T03:00:00.000Z');
    expect(r.previousStart.toISOString()).toBe('2026-11-23T03:00:00.000Z');
    expect(r).toMatchObject({ from: '2026-11-24', to: '2026-11-24', previousFrom: '2026-11-23', previousTo: '2026-11-23' });
  });

  it('week: hoy y los 6 días anteriores, como la ventana del reporte semanal; el anterior, los 7 de antes', () => {
    const r = summaryRange('week', ahora);
    expect(r).toMatchObject({ from: '2026-11-18', to: '2026-11-24', previousFrom: '2026-11-11', previousTo: '2026-11-17' });
    expect(r.start.toISOString()).toBe('2026-11-18T03:00:00.000Z');
    expect(r.previousEnd.toISOString()).toBe(r.start.toISOString());
  });

  it('month: hoy y los 29 días anteriores', () => {
    expect(summaryRange('month', ahora)).toMatchObject({ from: '2026-10-26', to: '2026-11-24', previousFrom: '2026-09-26', previousTo: '2026-10-25' });
  });
});

describe('buildSummaryTotals', () => {
  it('Escenario "Margen ponderado": $100.000 en ventas y $62.000 de costo → ganancia $38.000 y margen 38,00 %', () => {
    const totals = buildSummaryTotals({ salesCount: 41, salesTotal: D('100000'), costTotal: D('62000') });
    expect(totals).toEqual({ salesCount: 41, salesTotal: '100000.00', costTotal: '62000.00', profit: '38000.00', marginPercent: '38.00' });
  });

  it('el margen se redondea con ROUND_HALF_UP a 2 decimales', () => {
    // 1 / 3 = 33,333… → 33,33; 2 / 3 = 66,666… → 66,67
    expect(buildSummaryTotals({ salesCount: 1, salesTotal: D('3'), costTotal: D('2') }).marginPercent).toBe('33.33');
    expect(buildSummaryTotals({ salesCount: 1, salesTotal: D('3'), costTotal: D('1') }).marginPercent).toBe('66.67');
  });

  it('sin ventas, todo en cero y el margen en null (nunca divide por cero)', () => {
    expect(buildSummaryTotals({ salesCount: 0, salesTotal: null, costTotal: null })).toEqual({
      salesCount: 0,
      salesTotal: '0.00',
      costTotal: '0.00',
      profit: '0.00',
      marginPercent: null,
    });
  });

  it('una ganancia negativa (vender debajo del costo) da margen negativo', () => {
    expect(buildSummaryTotals({ salesCount: 2, salesTotal: D('1000'), costTotal: D('1250') })).toMatchObject({
      profit: '-250.00',
      marginPercent: '-25.00',
    });
  });
});

describe('rankProducts', () => {
  const grupos = [
    { productId: 'p-medialunas', productName: 'Medialunas de manteca — docena (12 unidades)', _sum: { quantity: 30, lineTotal: D('405000'), lineCost: D('132000') } },
    { productId: 'p-pan', productName: 'Pan flauta — 1 kg', _sum: { quantity: 80, lineTotal: D('346571.20'), lineCost: D('201000') } },
    { productId: 'p-tarta', productName: 'Tarta de ricota — 24 cm', _sum: { quantity: 6, lineTotal: D('168000'), lineCost: D('60000') } },
    { productId: null, productName: 'Prepizzas — x2 unidades (dado de baja)', _sum: { quantity: 12, lineTotal: D('43200'), lineCost: D('14000') } },
  ];

  it('ordena los más vendidos por unidades y los que más ganancia dejan por ganancia', () => {
    const { topSold, topProfit } = rankProducts(grupos, 3);
    expect(topSold.map((p) => p.productName)).toEqual([
      'Pan flauta — 1 kg',
      'Medialunas de manteca — docena (12 unidades)',
      'Prepizzas — x2 unidades (dado de baja)',
    ]);
    expect(topProfit.map((p) => [p.productName, p.profit])).toEqual([
      ['Medialunas de manteca — docena (12 unidades)', '273000.00'],
      ['Pan flauta — 1 kg', '145571.20'],
      ['Tarta de ricota — 24 cm', '108000.00'],
    ]);
  });

  it('cada producto trae unidades, ventas, ganancia y su margen; un producto dado de baja conserva su nombre', () => {
    const { topSold } = rankProducts(grupos, 5);
    expect(topSold.find((p) => p.productId === null)).toEqual({
      productId: null,
      productName: 'Prepizzas — x2 unidades (dado de baja)',
      quantity: 12,
      salesTotal: '43200.00',
      profit: '29200.00',
      marginPercent: '67.59',
    });
  });

  it('a igualdad de unidades, ordena por nombre para que el resultado sea estable', () => {
    const empate = [
      { productId: 'b', productName: 'Bizcochitos de grasa — 1 kg', _sum: { quantity: 5, lineTotal: D('16000'), lineCost: D('6000') } },
      { productId: 'a', productName: 'Alfajores de maicena', _sum: { quantity: 5, lineTotal: D('16000'), lineCost: D('6000') } },
    ];
    expect(rankProducts(empate, 5).topSold.map((p) => p.productId)).toEqual(['a', 'b']);
  });
});
