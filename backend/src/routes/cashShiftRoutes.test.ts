import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { errorHandler } from '../middlewares/errorHandler';

const D = (v: string | number) => new Prisma.Decimal(v);

/* Prisma simulado: la transacción interactiva recibe el mismo cliente. */
const db = vi.hoisted(() => {
  const client = {
    account: { findUnique: vi.fn() },
    cashShift: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    sale: { groupBy: vi.fn() },
    $transaction: vi.fn(),
  };
  client.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === 'function' ? (arg as (tx: typeof client) => unknown)(client) : Promise.all(arg as unknown[])
  );
  return client;
});
vi.mock('../lib/prisma', () => ({ prisma: db }));

type TestUser = { id: string; accountId: string; email: string; role: 'ADMIN' | 'COLLABORATOR' };
let currentUser: TestUser | undefined;
vi.mock('../middlewares/auth', () => ({
  authMiddleware: (req: { user?: TestUser }, _res: unknown, next: () => void) => {
    req.user = currentUser;
    next();
  },
}));

import { cashShiftsRouter } from './salesModule';

const ACCOUNT = 'acc-panaderia-central';
const ADMIN: TestUser = { id: 'u-admin-panaderia', accountId: ACCOUNT, email: 'admin.panaderia@seed.example.test', role: 'ADMIN' };
const CAJERA: TestUser = { id: 'u-cajera-panaderia', accountId: ACCOUNT, email: 'cajera.panaderia@seed.example.test', role: 'COLLABORATOR' };
const SHIFT_ID = '7a1b2c3d-0000-4000-8000-000000000001';
const OTHER_SHIFT_ID = '7a1b2c3d-0000-4000-8000-000000000002';

function turno(overrides: Record<string, unknown> = {}) {
  return {
    id: SHIFT_ID,
    accountId: ACCOUNT,
    status: 'OPEN',
    openedById: CAJERA.id,
    openedAt: new Date('2026-11-24T10:00:00.000Z'),
    openingAmount: D('10000'),
    closedById: null,
    closedAt: null,
    expectedCash: null,
    expectedTransfer: null,
    expectedMercadoPago: null,
    countedCash: null,
    countedTransfer: null,
    countedMercadoPago: null,
    difference: null,
    openedBy: { email: CAJERA.email },
    closedBy: null,
    ...overrides,
  };
}

/* $25.000 en efectivo (9 ventas), una anulada de $3.000 y una transferencia de $8.400. */
const ventasDelTurno = [
  { cashShiftId: SHIFT_ID, paymentMethod: 'CASH', status: 'COMPLETED', _sum: { total: D('25000') }, _count: { _all: 9 } },
  { cashShiftId: SHIFT_ID, paymentMethod: 'CASH', status: 'VOIDED', _sum: { total: D('3000') }, _count: { _all: 1 } },
  { cashShiftId: SHIFT_ID, paymentMethod: 'TRANSFER', status: 'COMPLETED', _sum: { total: D('8400') }, _count: { _all: 2 } },
];

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/cash-shifts', cashShiftsRouter);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = CAJERA;
  db.account.findUnique.mockImplementation(({ select }: { select: Record<string, unknown> }) =>
    Promise.resolve(
      select.businessName
        ? { businessName: 'Panadería Central' }
        : { subscriptionPlan: 'FREE', features: [{ feature: 'sales', enabled: true }] }
    )
  );
  db.sale.groupBy.mockResolvedValue(ventasDelTurno);
});

describe('POST /api/cash-shifts/open', () => {
  it('el colaborador abre el turno con el monto inicial, en la cuenta de la sesión', async () => {
    db.cashShift.findFirst.mockResolvedValue(null);
    db.cashShift.create.mockResolvedValue(turno());

    const res = await request(buildApp())
      .post('/api/cash-shifts/open')
      .send({ openingAmount: 10000, accountId: 'acc-quimica-gyj' });

    expect(res.status).toBe(201);
    expect(res.headers['cache-control']).toBe('private, no-store');
    expect(res.body).toMatchObject({ status: 'OPEN', openingAmount: '10000.00', openedBy: CAJERA.email, salesCount: 0, expectedTotal: '10000.00' });
    const { data } = db.cashShift.create.mock.calls[0]![0];
    expect(data).toMatchObject({ accountId: ACCOUNT, openedById: CAJERA.id });
    expect(data.openingAmount.toFixed(2)).toBe('10000.00');
  });

  it('Escenario "Un turno por vez": con un turno abierto responde 409', async () => {
    db.cashShift.findFirst.mockResolvedValue({ id: SHIFT_ID });

    const res = await request(buildApp()).post('/api/cash-shifts/open').send({ openingAmount: 5000 });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Ya hay un turno de caja abierto/);
    expect(db.cashShift.create).not.toHaveBeenCalled();
  });

  it('si dos personas abren a la vez, el índice único deja pasar una y la otra recibe 409', async () => {
    db.cashShift.findFirst.mockResolvedValue(null);
    db.cashShift.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test', meta: {} })
    );

    expect((await request(buildApp()).post('/api/cash-shifts/open').send({ openingAmount: 5000 })).status).toBe(409);
  });

  it('un monto inicial inválido responde 400', async () => {
    const res = await request(buildApp()).post('/api/cash-shifts/open').send({ openingAmount: -100 });
    expect(res.status).toBe(400);
    expect(db.cashShift.findFirst).not.toHaveBeenCalled();
  });
});

describe('GET /api/cash-shifts/current', () => {
  it('devuelve el turno abierto con lo esperado hasta ahora, sin contar las anuladas', async () => {
    db.cashShift.findFirst.mockResolvedValue(turno());

    const res = await request(buildApp()).get('/api/cash-shifts/current');

    expect(res.status).toBe(200);
    expect(res.body.shift).toMatchObject({ id: SHIFT_ID, salesCount: 11, voidedCount: 1, salesTotal: '33400.00', expectedTotal: '43400.00', difference: null });
    expect(res.body.shift.methods).toEqual([
      { paymentMethod: 'CASH', salesTotal: '25000.00', expected: '35000.00', counted: null, difference: null },
      { paymentMethod: 'TRANSFER', salesTotal: '8400.00', expected: '8400.00', counted: null, difference: null },
      { paymentMethod: 'MERCADO_PAGO', salesTotal: '0.00', expected: '0.00', counted: null, difference: null },
    ]);
    expect(db.cashShift.findFirst.mock.calls[0]![0].where).toEqual({ accountId: ACCOUNT, status: 'OPEN' });
    expect(db.sale.groupBy.mock.calls[0]![0].where).toEqual({ accountId: ACCOUNT, cashShiftId: SHIFT_ID });
  });

  it('sin turno abierto responde 200 con shift null (el 404 queda para el módulo apagado)', async () => {
    db.cashShift.findFirst.mockResolvedValue(null);

    const res = await request(buildApp()).get('/api/cash-shifts/current');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ shift: null });
  });

  it('nunca expone costos ni márgenes', async () => {
    db.cashShift.findFirst.mockResolvedValue(turno());
    const res = await request(buildApp()).get('/api/cash-shifts/current');
    expect(JSON.stringify(res.body)).not.toMatch(/cost|margin/i);
  });
});

describe('POST /api/cash-shifts/:id/close', () => {
  const contado = { countedCash: 34500, countedTransfer: 8400, countedMercadoPago: 0 };

  beforeEach(() => {
    db.cashShift.findFirst.mockResolvedValue({ id: SHIFT_ID, status: 'OPEN', openingAmount: D('10000'), openedById: ADMIN.id, closedById: null });
    db.cashShift.updateMany.mockResolvedValue({ count: 1 });
    db.cashShift.update.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve(
        turno({ ...data, status: 'CLOSED', closedById: CAJERA.id, closedAt: new Date('2026-11-24T20:00:00.000Z'), closedBy: { email: CAJERA.email } })
      )
    );
  });

  it('Escenario "Arqueo con diferencia": esperado $35.000, contado $34.500 y diferencia −$500', async () => {
    const res = await request(buildApp()).post(`/api/cash-shifts/${SHIFT_ID}/close`).send(contado);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'CLOSED', closedBy: CAJERA.email, expectedTotal: '43400.00', countedTotal: '42900.00', difference: '-500.00' });
    expect(res.body.methods[0]).toEqual({ paymentMethod: 'CASH', salesTotal: '25000.00', expected: '35000.00', counted: '34500.00', difference: '-500.00' });

    const { data } = db.cashShift.update.mock.calls[0]![0];
    expect(data.expectedCash.toFixed(2)).toBe('35000.00');
    expect(data.countedCash.toFixed(2)).toBe('34500.00');
    expect(data.difference.toFixed(2)).toBe('-500.00');
  });

  it('Escenario "Las anuladas no cuentan en lo esperado": la venta anulada de $3.000 queda afuera y se informa', async () => {
    const res = await request(buildApp()).post(`/api/cash-shifts/${SHIFT_ID}/close`).send(contado);

    expect(res.body.voidedCount).toBe(1);
    expect(res.body.methods[0].expected).toBe('35000.00');
  });

  it('primero pasa el turno a CLOSED y recién después suma las ventas, todo en la cuenta de la sesión', async () => {
    await request(buildApp()).post(`/api/cash-shifts/${SHIFT_ID}/close`).send(contado);

    expect(db.cashShift.updateMany).toHaveBeenCalledWith({
      where: { id: SHIFT_ID, accountId: ACCOUNT, status: 'OPEN' },
      data: expect.objectContaining({ status: 'CLOSED', closedById: CAJERA.id }),
    });
    expect(db.cashShift.updateMany.mock.invocationCallOrder[0]!).toBeLessThan(db.sale.groupBy.mock.invocationCallOrder[0]!);
    expect(db.cashShift.findFirst.mock.calls[0]![0].where).toEqual({ id: SHIFT_ID, accountId: ACCOUNT });
  });

  it('un turno ya cerrado responde 409, también si otro lo cerró al mismo tiempo', async () => {
    currentUser = ADMIN;
    db.cashShift.findFirst.mockResolvedValueOnce({ id: SHIFT_ID, status: 'CLOSED', openingAmount: D('10000'), openedById: CAJERA.id, closedById: CAJERA.id });
    expect((await request(buildApp()).post(`/api/cash-shifts/${SHIFT_ID}/close`).send(contado)).status).toBe(409);

    db.cashShift.updateMany.mockResolvedValueOnce({ count: 0 });
    expect((await request(buildApp()).post(`/api/cash-shifts/${SHIFT_ID}/close`).send(contado)).status).toBe(409);
    expect(db.cashShift.update).not.toHaveBeenCalled();
  });

  it('al colaborador, un turno cerrado de otra persona le responde 404', async () => {
    db.cashShift.findFirst.mockResolvedValueOnce({ id: SHIFT_ID, status: 'CLOSED', openingAmount: D('10000'), openedById: ADMIN.id, closedById: ADMIN.id });
    expect((await request(buildApp()).post(`/api/cash-shifts/${SHIFT_ID}/close`).send(contado)).status).toBe(404);
  });

  it('sin lo contado de los tres medios responde 400; un turno inexistente o un id inválido, 404', async () => {
    expect((await request(buildApp()).post(`/api/cash-shifts/${SHIFT_ID}/close`).send({ countedCash: 34500 })).status).toBe(400);

    db.cashShift.findFirst.mockResolvedValueOnce(null);
    expect((await request(buildApp()).post(`/api/cash-shifts/${OTHER_SHIFT_ID}/close`).send(contado)).status).toBe(404);
    expect((await request(buildApp()).post('/api/cash-shifts/turno-1/close').send(contado)).status).toBe(404);
  });
});

describe('GET /api/cash-shifts y GET /api/cash-shifts/:id', () => {
  const cerrado = turno({
    status: 'CLOSED',
    openedById: ADMIN.id,
    openedBy: { email: ADMIN.email },
    closedById: ADMIN.id,
    closedBy: { email: ADMIN.email },
    closedAt: new Date('2026-11-24T20:00:00.000Z'),
    expectedCash: D('35000'),
    expectedTransfer: D('8400'),
    expectedMercadoPago: D('0'),
    countedCash: D('34500'),
    countedTransfer: D('8400'),
    countedMercadoPago: D('0'),
    difference: D('-500'),
  });

  it('el ADMIN ve el historial de la cuenta, con el arqueo guardado de cada turno', async () => {
    currentUser = ADMIN;
    db.cashShift.count.mockResolvedValue(1);
    db.cashShift.findMany.mockResolvedValue([cerrado]);

    const res = await request(buildApp()).get('/api/cash-shifts?page=1&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ total: 1, page: 1, limit: 10, totalPages: 1 });
    expect(res.body.data[0]).toMatchObject({ id: SHIFT_ID, status: 'CLOSED', difference: '-500.00', salesCount: 11, closedBy: ADMIN.email });
    expect(db.cashShift.findMany.mock.calls[0]![0]).toMatchObject({ where: { accountId: ACCOUNT }, orderBy: { openedAt: 'desc' }, skip: 0, take: 10 });
    expect(db.sale.groupBy.mock.calls[0]![0].where).toEqual({ accountId: ACCOUNT, cashShiftId: { in: [SHIFT_ID] } });
  });

  it('el colaborador ve el turno abierto y los que abrió o cerró', async () => {
    db.cashShift.count.mockResolvedValue(0);
    db.cashShift.findMany.mockResolvedValue([]);

    const res = await request(buildApp()).get('/api/cash-shifts');

    expect(res.body).toEqual({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
    expect(db.cashShift.findMany.mock.calls[0]![0].where).toEqual({
      accountId: ACCOUNT,
      OR: [{ status: 'OPEN' }, { openedById: CAJERA.id }, { closedById: CAJERA.id }],
    });
    expect(db.sale.groupBy).not.toHaveBeenCalled();
  });

  it('el resumen de un turno cerrado usa lo guardado al cierre y lleva el nombre del comercio para imprimirlo', async () => {
    currentUser = ADMIN;
    db.cashShift.findFirst.mockResolvedValue(cerrado);

    const res = await request(buildApp()).get(`/api/cash-shifts/${SHIFT_ID}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ businessName: 'Panadería Central', expectedTotal: '43400.00', countedTotal: '42900.00', difference: '-500.00' });
    expect(db.account.findUnique).toHaveBeenCalledWith({ where: { id: ACCOUNT }, select: { businessName: true } });
    expect(db.cashShift.findFirst.mock.calls[0]![0].where).toEqual({ id: SHIFT_ID, accountId: ACCOUNT });
  });

  it('un turno que no existe, ajeno o con id inválido responde 404', async () => {
    db.cashShift.findFirst.mockResolvedValue(null);

    expect((await request(buildApp()).get(`/api/cash-shifts/${OTHER_SHIFT_ID}`)).status).toBe(404);
    expect(db.cashShift.findFirst.mock.calls[0]![0].where).toMatchObject({ id: OTHER_SHIFT_ID, accountId: ACCOUNT });
    expect((await request(buildApp()).get('/api/cash-shifts/turno-1')).status).toBe(404);
  });
});
