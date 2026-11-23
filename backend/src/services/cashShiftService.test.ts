import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';
import {
  MAX_CASH_AMOUNT,
  computeExpected,
  computeArqueo,
  parseCloseInput,
  parseOpeningAmount,
  parseShiftListQuery,
  summarizeSales,
} from './cashShiftService';

const D = (v: string | number) => new Prisma.Decimal(v);

function expectAppError(fn: () => unknown, status: number, message?: RegExp) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(status);
    if (message) expect((error as AppError).message).toMatch(message);
    return;
  }
  throw new Error('Se esperaba un AppError');
}

describe('parseOpeningAmount', () => {
  it('acepta el monto inicial como número o texto, con hasta 2 decimales', () => {
    expect(parseOpeningAmount({ openingAmount: 10000 }).toFixed(2)).toBe('10000.00');
    expect(parseOpeningAmount({ openingAmount: '2500.5' }).toFixed(2)).toBe('2500.50');
    expect(parseOpeningAmount({ openingAmount: 0 }).toFixed(2)).toBe('0.00');
  });

  it('rechaza con 400 un monto que falta, negativo, con 3 decimales o mayor al máximo', () => {
    expectAppError(() => parseOpeningAmount({}), 400, /monto inicial/);
    expectAppError(() => parseOpeningAmount({ openingAmount: -1 }), 400);
    expectAppError(() => parseOpeningAmount({ openingAmount: 10.555 }), 400);
    expectAppError(() => parseOpeningAmount({ openingAmount: '1e3' }), 400);
    expectAppError(() => parseOpeningAmount({ openingAmount: MAX_CASH_AMOUNT + 1 }), 400, /99\.999\.999,99/);
    expectAppError(() => parseOpeningAmount(null), 400);
  });
});

describe('parseCloseInput', () => {
  it('exige lo contado en los tres medios de pago', () => {
    const input = parseCloseInput({ countedCash: 34500, countedTransfer: '0', countedMercadoPago: 1200.5 });
    expect(input.CASH.toFixed(2)).toBe('34500.00');
    expect(input.TRANSFER.toFixed(2)).toBe('0.00');
    expect(input.MERCADO_PAGO.toFixed(2)).toBe('1200.50');

    expectAppError(() => parseCloseInput({ countedCash: 34500, countedTransfer: 0 }), 400, /Mercado Pago/);
    expectAppError(() => parseCloseInput({ countedCash: -5, countedTransfer: 0, countedMercadoPago: 0 }), 400, /efectivo/);
  });
});

describe('summarizeSales', () => {
  it('suma por medio de pago solo las ventas completadas y cuenta aparte las anuladas', () => {
    const summary = summarizeSales([
      { paymentMethod: 'CASH', status: 'COMPLETED', _sum: { total: D('25000') }, _count: { _all: 9 } },
      { paymentMethod: 'CASH', status: 'VOIDED', _sum: { total: D('3000') }, _count: { _all: 1 } },
      { paymentMethod: 'TRANSFER', status: 'COMPLETED', _sum: { total: D('8400') }, _count: { _all: 2 } },
    ]);

    expect(summary.byMethod.CASH.toFixed(2)).toBe('25000.00');
    expect(summary.byMethod.TRANSFER.toFixed(2)).toBe('8400.00');
    expect(summary.byMethod.MERCADO_PAGO.toFixed(2)).toBe('0.00');
    expect(summary.salesCount).toBe(11);
    expect(summary.voidedCount).toBe(1);
    expect(summary.salesTotal.toFixed(2)).toBe('33400.00');
  });
});

describe('Escenario "Arqueo con diferencia"', () => {
  it('$10.000 iniciales y $25.000 en efectivo, contando $34.500: esperado $35.000 y diferencia −$500', () => {
    const expected = computeExpected(D('10000'), { CASH: D('25000'), TRANSFER: D('0'), MERCADO_PAGO: D('0') });
    expect(expected.CASH.toFixed(2)).toBe('35000.00');

    const arqueo = computeArqueo(expected, { CASH: D('34500'), TRANSFER: D('0'), MERCADO_PAGO: D('0') });
    expect(arqueo.differenceByMethod.CASH.toFixed(2)).toBe('-500.00');
    expect(arqueo.expectedTotal.toFixed(2)).toBe('35000.00');
    expect(arqueo.countedTotal.toFixed(2)).toBe('34500.00');
    expect(arqueo.difference.toFixed(2)).toBe('-500.00');
  });

  it('el monto inicial va solo al efectivo; transferencia y Mercado Pago se arquean por separado', () => {
    const expected = computeExpected(D('10000'), { CASH: D('0'), TRANSFER: D('8400'), MERCADO_PAGO: D('1500.50') });
    expect(expected).toEqual({ CASH: D('10000'), TRANSFER: D('8400'), MERCADO_PAGO: D('1500.50') });

    const arqueo = computeArqueo(expected, { CASH: D('10000'), TRANSFER: D('8000'), MERCADO_PAGO: D('1600.50') });
    expect(arqueo.differenceByMethod.TRANSFER.toFixed(2)).toBe('-400.00');
    expect(arqueo.differenceByMethod.MERCADO_PAGO.toFixed(2)).toBe('100.00');
    // Un faltante en un medio y un sobrante en otro se compensan en el total, pero se ven por separado.
    expect(arqueo.difference.toFixed(2)).toBe('-300.00');
  });
});

describe('parseShiftListQuery', () => {
  it('pagina como el historial de ventas: una página o un límite inválidos usan los valores por defecto', () => {
    expect(parseShiftListQuery({})).toEqual({ page: 1, limit: 20 });
    expect(parseShiftListQuery({ page: '2', limit: '10' })).toEqual({ page: 2, limit: 10 });
    expect(parseShiftListQuery({ page: '0', limit: '500' })).toEqual({ page: 1, limit: 100 });
  });
});
