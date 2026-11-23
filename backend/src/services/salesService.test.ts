import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';
import {
  argentinaDayRange,
  buildSaleLines,
  parseSaleInput,
  parseSaleListQuery,
  parseVoidReason,
  serializeSale,
  type ProductForSale,
  type SaleWithItems,
} from './salesService';

const D = (v: string | number) => new Prisma.Decimal(v);

/** Productos de Panadería Central (docs/qa/seed-data-comercios.md). */
const MEDIALUNA: ProductForSale = {
  id: '6f1d2c3b-0000-4000-8000-00000000a001',
  name: 'Medialuna de manteca',
  salePrice: D('900.00'),
  cost: D('301.35'),
  ingredientsCount: 4,
};
const CAFE: ProductForSale = {
  id: '6f1d2c3b-0000-4000-8000-00000000a002',
  name: 'Café con leche',
  salePrice: D('1500.00'),
  cost: D('412.50'),
  ingredientsCount: 2,
};
const BORRADOR: ProductForSale = {
  id: '6f1d2c3b-0000-4000-8000-00000000a003',
  name: 'Pan dulce (sin receta)',
  salePrice: D('8000.00'),
  cost: D('0'),
  ingredientsCount: 0,
};
const SIN_PRECIO: ProductForSale = {
  id: '6f1d2c3b-0000-4000-8000-00000000a004',
  name: 'Bizcochitos de grasa',
  salePrice: D('0'),
  cost: D('1662.69'),
  ingredientsCount: 3,
};

function expectAppError(fn: () => unknown, status: number, message?: RegExp) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(status);
    if (message) expect((error as AppError).message).toMatch(message);
    return;
  }
  throw new Error('se esperaba un AppError');
}

describe('parseSaleInput', () => {
  it('acepta ítems y medio de pago, y suma las cantidades de un producto repetido', () => {
    const input = parseSaleInput({
      paymentMethod: 'CASH',
      items: [
        { productId: MEDIALUNA.id, quantity: 2 },
        { productId: CAFE.id, quantity: 1 },
        { productId: MEDIALUNA.id, quantity: 1 },
      ],
    });
    expect(input).toEqual({
      paymentMethod: 'CASH',
      items: [
        { productId: MEDIALUNA.id, quantity: 3 },
        { productId: CAFE.id, quantity: 1 },
      ],
    });
  });

  it.each([
    [{ items: [{ productId: MEDIALUNA.id, quantity: 1 }] }, /medio de pago/],
    [{ paymentMethod: 'TARJETA', items: [{ productId: MEDIALUNA.id, quantity: 1 }] }, /medio de pago/],
    [{ paymentMethod: 'CASH', items: [] }, /al menos un producto/],
    [{ paymentMethod: 'CASH' }, /al menos un producto/],
    [{ paymentMethod: 'CASH', items: [{ productId: 'medialuna', quantity: 1 }] }, /producto/],
    [{ paymentMethod: 'CASH', items: [{ productId: MEDIALUNA.id, quantity: 0 }] }, /cantidad/],
    [{ paymentMethod: 'CASH', items: [{ productId: MEDIALUNA.id, quantity: 1.5 }] }, /cantidad/],
    [{ paymentMethod: 'CASH', items: [{ productId: MEDIALUNA.id, quantity: 1000 }] }, /cantidad/],
    [{ paymentMethod: 'CASH', items: [{ productId: MEDIALUNA.id, quantity: '2' }] }, /cantidad/],
  ])('rechaza con 400 un cuerpo inválido: %j', (body, message) => {
    expectAppError(() => parseSaleInput(body), 400, message);
  });

  it('no acepta precio ni costo del cliente: los ignora', () => {
    const input = parseSaleInput({
      paymentMethod: 'TRANSFER',
      items: [{ productId: CAFE.id, quantity: 1, unitPrice: 1, unitCost: 0 }],
      total: 1,
      accountId: 'otra-cuenta',
    });
    expect(input).toEqual({ paymentMethod: 'TRANSFER', items: [{ productId: CAFE.id, quantity: 1 }] });
  });

  it('rechaza más de 50 productos distintos en una venta', () => {
    const items = Array.from({ length: 51 }, (_, i) => ({
      productId: `6f1d2c3b-0000-4000-8000-${String(i).padStart(12, '0')}`,
      quantity: 1,
    }));
    expectAppError(() => parseSaleInput({ paymentMethod: 'CASH', items }), 400, /50/);
  });
});

describe('buildSaleLines: precio, costo y margen del momento (ADR-010)', () => {
  it('2 medialunas y 1 café: total, costo y margen de cada renglón con Decimal', () => {
    const { lines, total, totalCost } = buildSaleLines(
      [
        { productId: MEDIALUNA.id, quantity: 2 },
        { productId: CAFE.id, quantity: 1 },
      ],
      [MEDIALUNA, CAFE]
    );

    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ productId: MEDIALUNA.id, productName: 'Medialuna de manteca', quantity: 2 });
    expect(lines[0]!.unitPrice.toFixed(2)).toBe('900.00');
    expect(lines[0]!.unitCost.toFixed(2)).toBe('301.35');
    expect(lines[0]!.lineTotal.toFixed(2)).toBe('1800.00');
    expect(lines[0]!.lineCost.toFixed(2)).toBe('602.70');
    // (900 − 301,35) / 900 = 66,516… → 66,52 (ROUND_HALF_UP)
    expect(lines[0]!.marginPercent.toFixed(2)).toBe('66.52');
    // (1500 − 412,50) / 1500 = 72,5 %
    expect(lines[1]!.marginPercent.toFixed(2)).toBe('72.50');
    expect(total.toFixed(2)).toBe('3300.00');
    expect(totalCost.toFixed(2)).toBe('1015.20');
  });

  it('redondea el margen con ROUND_HALF_UP: 0,125 % se lleva a 0,13 %', () => {
    const producto: ProductForSale = { ...CAFE, salePrice: D('800.00'), cost: D('799.00') };
    const { lines } = buildSaleLines([{ productId: CAFE.id, quantity: 1 }], [producto]);
    expect(lines[0]!.marginPercent.toFixed(2)).toBe('0.13');
  });

  it('un producto que no está en la cuenta responde 404 sin decir de quién es', () => {
    expectAppError(
      () => buildSaleLines([{ productId: '6f1d2c3b-0000-4000-8000-0000000000ff', quantity: 1 }], [MEDIALUNA]),
      404,
      /no existe/
    );
  });

  it('un producto en borrador (sin receta) no se vende: 422', () => {
    expectAppError(
      () => buildSaleLines([{ productId: BORRADOR.id, quantity: 1 }], [BORRADOR]),
      422,
      /Pan dulce \(sin receta\).*borrador/
    );
  });

  it('un producto con precio en $0 no se vende: 422', () => {
    expectAppError(
      () => buildSaleLines([{ productId: SIN_PRECIO.id, quantity: 1 }], [SIN_PRECIO]),
      422,
      /Bizcochitos de grasa.*precio/
    );
  });
});

const VENTA: SaleWithItems = {
  id: '9f1c2a3b-0000-4000-8000-000000000001',
  accountId: 'acc-panaderia-central',
  cashShiftId: '7a1b2c3d-0000-4000-8000-000000000001',
  soldById: 'u-cajera-panaderia',
  ticketNumber: 42,
  soldAt: new Date('2026-11-24T12:30:00.000Z'),
  paymentMethod: 'CASH',
  total: D('3300'),
  status: 'COMPLETED',
  voidedAt: null,
  voidedById: null,
  voidReason: null,
  items: [
    {
      id: 'it-1',
      saleId: '9f1c2a3b-0000-4000-8000-000000000001',
      productId: MEDIALUNA.id,
      productName: 'Medialuna de manteca',
      quantity: 2,
      unitPrice: D('900'),
      unitCost: D('301.35'),
      marginPercent: D('66.52'),
      lineTotal: D('1800'),
      lineCost: D('602.7'),
    },
  ],
};

describe('serializeSale: el colaborador nunca recibe costos ni márgenes', () => {
  it('al ADMIN le devuelve costo, margen y costo total con dos decimales', () => {
    const body = serializeSale(VENTA, 'ADMIN', 'Panadería Central');
    expect(body).toMatchObject({
      id: VENTA.id,
      ticketNumber: 42,
      businessName: 'Panadería Central',
      paymentMethod: 'CASH',
      total: '3300.00',
      totalCost: '602.70',
      status: 'COMPLETED',
    });
    expect(body.items[0]).toEqual({
      productId: MEDIALUNA.id,
      productName: 'Medialuna de manteca',
      quantity: 2,
      unitPrice: '900.00',
      lineTotal: '1800.00',
      unitCost: '301.35',
      lineCost: '602.70',
      marginPercent: '66.52',
    });
  });

  it('al COLLABORATOR le devuelve cantidades y precios, sin ningún campo de costo o margen', () => {
    const body = serializeSale(VENTA, 'COLLABORATOR', 'Panadería Central');
    const texto = JSON.stringify(body);
    for (const campo of ['unitCost', 'lineCost', 'marginPercent', 'totalCost']) {
      expect(texto).not.toContain(campo);
    }
    expect(body.items[0]).toEqual({
      productId: MEDIALUNA.id,
      productName: 'Medialuna de manteca',
      quantity: 2,
      unitPrice: '900.00',
      lineTotal: '1800.00',
    });
  });
});

describe('parseSaleListQuery y argentinaDayRange', () => {
  it('pagina con 20 por defecto y tope de 100', () => {
    expect(parseSaleListQuery({})).toEqual({ page: 1, limit: 20 });
    expect(parseSaleListQuery({ page: '3', limit: '500' })).toEqual({ page: 3, limit: 100 });
  });

  it('filtra por día de Argentina: 24/11 va de 00:00 a 24:00 en UTC−3', () => {
    expect(parseSaleListQuery({ date: '2026-11-24' }).date).toBe('2026-11-24');
    const { start, end } = argentinaDayRange('2026-11-24');
    expect(start.toISOString()).toBe('2026-11-24T03:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-25T03:00:00.000Z');
  });

  it('acepta el turno por su id', () => {
    expect(parseSaleListQuery({ cashShiftId: VENTA.cashShiftId }).cashShiftId).toBe(VENTA.cashShiftId);
  });

  it.each([
    [{ date: '24/11/2026' }, /fecha/],
    [{ date: '2026-02-30' }, /fecha/],
    [{ cashShiftId: 'turno-1' }, /turno/],
  ])('rechaza con 400 un filtro inválido: %j', (query, message) => {
    expectAppError(() => parseSaleListQuery(query), 400, message);
  });
});

describe('parseVoidReason', () => {
  it('exige un motivo de 3 a 200 caracteres y lo recorta', () => {
    expect(parseVoidReason({ reason: '  Cobré dos veces la misma venta  ' })).toBe('Cobré dos veces la misma venta');
    expectAppError(() => parseVoidReason({}), 400, /motivo/);
    expectAppError(() => parseVoidReason({ reason: 'no' }), 400, /motivo/);
    expectAppError(() => parseVoidReason({ reason: 'x'.repeat(201) }), 400, /200/);
  });
});
