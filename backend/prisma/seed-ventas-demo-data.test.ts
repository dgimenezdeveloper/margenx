import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { buildDemoSales, createRng, demoId, type DemoProduct } from './seed-ventas-demo-data';

const PRODUCTS: DemoProduct[] = [
  { id: '31f00001-0000-4000-8000-000000000001', name: 'Medialunas de manteca (docena) (demo)', salePrice: '9600.00', cost: '4380.50', marginPercent: '54.37' },
  { id: '31f00001-0000-4000-8000-000000000002', name: 'Torta de chocolate (demo)', salePrice: '18500.00', cost: '9120.00', marginPercent: '50.70' },
  { id: '31f00001-0000-4000-8000-000000000003', name: 'Alfajores de maicena (docena) (demo)', salePrice: '7200.00', cost: '3515.25', marginPercent: '51.18' },
];
const USERS = { admin: '31d00001-0000-4000-8000-000000000001', collaborator: '31d00001-0000-4000-8000-000000000002' };
// Lunes 02/11/2026 a domingo 22/11/2026 (21 días), fechas en UTC.
const FIRST_DAY = new Date(Date.UTC(2026, 10, 2));

function build(seed = 20261122) {
  return buildDemoSales({ products: PRODUCTS, users: USERS, firstDay: FIRST_DAY, days: 21, rng: createRng(seed) });
}

describe('createRng', () => {
  it('es determinista: la misma semilla da la misma secuencia', () => {
    const a = createRng(7);
    const b = createRng(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe('demoId', () => {
  it('arma IDs fijos con prefijo 33, distintos de los 30 (QA), 31 (Demo) y 32 (volumen)', () => {
    expect(demoId('shift', 1)).toBe('33a00000-0000-4000-8000-000000000001');
    expect(demoId('sale', 42)).toBe('33b00000-0000-4000-8000-000000000042');
    expect(demoId('item', 1234)).toBe('33c00000-0000-4000-8000-000000001234');
  });
});

describe('buildDemoSales', () => {
  it('es determinista: volver a correr da los mismos datos (seed idempotente)', () => {
    expect(build()).toEqual(build());
  });

  it('arma dos turnos por día y uno solo los domingos, todos cerrados', () => {
    const { shifts } = build();
    // 21 días: 3 domingos con un turno y 18 días con dos.
    expect(shifts).toHaveLength(3 * 1 + 18 * 2);
    expect(shifts.every((shift) => shift.status === 'CLOSED' && shift.closedAt !== null)).toBe(true);
  });

  it('numera los tickets de forma correlativa desde 1, en orden de venta', () => {
    const { sales } = build();
    expect(sales.map((sale) => sale.ticketNumber)).toEqual(sales.map((_, index) => index + 1));
    for (let i = 1; i < sales.length; i++) {
      expect(sales[i]!.soldAt.getTime()).toBeGreaterThan(sales[i - 1]!.soldAt.getTime());
    }
  });

  it('cada venta cae dentro de su turno', () => {
    const { shifts, sales } = build();
    const byId = new Map(shifts.map((shift) => [shift.id, shift]));
    for (const sale of sales) {
      const shift = byId.get(sale.cashShiftId)!;
      expect(sale.soldAt.getTime()).toBeGreaterThanOrEqual(shift.openedAt.getTime());
      expect(sale.soldAt.getTime()).toBeLessThan(shift.closedAt!.getTime());
    }
  });

  it('congela en cada renglón el precio, el costo y el margen del producto, y el total es la suma de los renglones', () => {
    const { sales, items } = build();
    const product = new Map(PRODUCTS.map((p) => [p.id, p]));
    for (const item of items) {
      const p = product.get(item.productId)!;
      expect(item.productName).toBe(p.name);
      expect(item.unitPrice.toFixed(2)).toBe(p.salePrice);
      expect(item.unitCost.toFixed(2)).toBe(p.cost);
      expect(item.marginPercent.toFixed(2)).toBe(p.marginPercent);
      expect(item.lineTotal.equals(item.unitPrice.mul(item.quantity))).toBe(true);
      expect(item.lineCost.equals(item.unitCost.mul(item.quantity))).toBe(true);
      expect(item.quantity).toBeGreaterThanOrEqual(1);
    }
    for (const sale of sales) {
      const total = items
        .filter((item) => item.saleId === sale.id)
        .reduce((sum, item) => sum.add(item.lineTotal), new Prisma.Decimal(0));
      expect(sale.total.equals(total)).toBe(true);
    }
  });

  it('el arqueo de cada turno sale de las ventas completadas, sin las anuladas', () => {
    const { shifts, sales } = build();
    for (const shift of shifts) {
      const completed = sales.filter((sale) => sale.cashShiftId === shift.id && sale.status === 'COMPLETED');
      const sum = (method: string) =>
        completed.filter((sale) => sale.paymentMethod === method).reduce((acc, sale) => acc.add(sale.total), new Prisma.Decimal(0));

      expect(shift.expectedCash!.equals(shift.openingAmount.add(sum('CASH')))).toBe(true);
      expect(shift.expectedTransfer!.equals(sum('TRANSFER'))).toBe(true);
      expect(shift.expectedMercadoPago!.equals(sum('MERCADO_PAGO'))).toBe(true);

      const expected = shift.expectedCash!.add(shift.expectedTransfer!).add(shift.expectedMercadoPago!);
      const counted = shift.countedCash!.add(shift.countedTransfer!).add(shift.countedMercadoPago!);
      expect(shift.difference!.equals(counted.sub(expected))).toBe(true);
    }
  });

  it('incluye pocas anuladas, con motivo, y algún turno con diferencia de caja', () => {
    const { shifts, sales } = build();
    const voided = sales.filter((sale) => sale.status === 'VOIDED');
    expect(voided.length).toBeGreaterThan(0);
    expect(voided.length / sales.length).toBeLessThan(0.05);
    expect(voided.every((sale) => sale.voidReason && sale.voidedAt && sale.voidedById)).toBe(true);
    expect(shifts.some((shift) => !shift.difference!.isZero())).toBe(true);
  });

  it('usa los tres medios de pago y los dos usuarios de la Demo', () => {
    const { shifts, sales } = build();
    expect(new Set(sales.map((sale) => sale.paymentMethod))).toEqual(new Set(['CASH', 'TRANSFER', 'MERCADO_PAGO']));
    expect(new Set(shifts.map((shift) => shift.openedById))).toEqual(new Set([USERS.admin, USERS.collaborator]));
  });

  it('sin colaborador, todos los turnos los abre el administrador', () => {
    const { shifts } = buildDemoSales({ products: PRODUCTS, users: { admin: USERS.admin, collaborator: null }, firstDay: FIRST_DAY, days: 2, rng: createRng(1) });
    expect(shifts.every((shift) => shift.openedById === USERS.admin)).toBe(true);
  });

  it('rechaza una lista de productos vacía', () => {
    expect(() => buildDemoSales({ products: [], users: USERS, firstDay: FIRST_DAY, days: 1, rng: createRng(1) })).toThrow(
      'La cuenta Demo no tiene productos con receta y precio para vender.'
    );
  });
});
