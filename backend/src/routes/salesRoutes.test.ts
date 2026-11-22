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
    cashShift: { findFirst: vi.fn() },
    product: { findMany: vi.fn() },
    sale: {
      aggregate: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
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

import { salesRouter } from './salesModule';

const ACCOUNT = 'acc-panaderia-central';
const ADMIN: TestUser = { id: 'u-admin-panaderia', accountId: ACCOUNT, email: 'admin.panaderia@seed.example.test', role: 'ADMIN' };
const CAJERA: TestUser = { id: 'u-cajera-panaderia', accountId: ACCOUNT, email: 'cajera.panaderia@seed.example.test', role: 'COLLABORATOR' };
const MEDIALUNA_ID = '6f1d2c3b-0000-4000-8000-00000000a001';
const CAFE_ID = '6f1d2c3b-0000-4000-8000-00000000a002';
const SALE_ID = '9f1c2a3b-0000-4000-8000-000000000001';
const SHIFT_ID = '7a1b2c3d-0000-4000-8000-000000000001';

const productos = [
  { id: MEDIALUNA_ID, name: 'Medialuna de manteca', salePrice: D('900'), cost: D('301.35'), _count: { ingredients: 4 } },
  { id: CAFE_ID, name: 'Café con leche', salePrice: D('1500'), cost: D('412.5'), _count: { ingredients: 2 } },
];

function ventaGuardada(overrides: Record<string, unknown> = {}) {
  return {
    id: SALE_ID,
    accountId: ACCOUNT,
    cashShiftId: SHIFT_ID,
    soldById: CAJERA.id,
    ticketNumber: 8,
    soldAt: new Date('2026-11-24T12:30:00.000Z'),
    paymentMethod: 'CASH',
    total: D('3300'),
    status: 'COMPLETED',
    voidedAt: null,
    voidedById: null,
    voidReason: null,
    account: { businessName: 'Panadería Central' },
    items: [
      { id: 'i1', saleId: SALE_ID, productId: CAFE_ID, productName: 'Café con leche', quantity: 1, unitPrice: D('1500'), unitCost: D('412.5'), marginPercent: D('72.5'), lineTotal: D('1500'), lineCost: D('412.5') },
      { id: 'i2', saleId: SALE_ID, productId: MEDIALUNA_ID, productName: 'Medialuna de manteca', quantity: 2, unitPrice: D('900'), unitCost: D('301.35'), marginPercent: D('66.52'), lineTotal: D('1800'), lineCost: D('602.7') },
    ],
    ...overrides,
  };
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/sales', salesRouter);
  app.use(errorHandler);
  return app;
}

const ventaDeMostrador = {
  paymentMethod: 'CASH',
  items: [
    { productId: MEDIALUNA_ID, quantity: 2 },
    { productId: CAFE_ID, quantity: 1 },
  ],
};

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
  db.cashShift.findFirst.mockResolvedValue({ id: SHIFT_ID });
  db.product.findMany.mockResolvedValue(productos);
  db.sale.aggregate.mockResolvedValue({ _max: { ticketNumber: 7 } });
  db.sale.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve(ventaGuardada({ ...data, items: ventaGuardada().items }))
  );
});

describe('POST /api/sales (Escenario "Venta con ticket")', () => {
  it('el colaborador vende 2 medialunas y 1 café en efectivo: ticket correlativo y sin costos en la respuesta', async () => {
    const res = await request(buildApp()).post('/api/sales').send(ventaDeMostrador);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ticketNumber: 8, total: '3300.00', paymentMethod: 'CASH', businessName: 'Panadería Central' });
    expect(JSON.stringify(res.body)).not.toMatch(/unitCost|lineCost|marginPercent|totalCost/);

    const data = db.sale.create.mock.calls[0]![0].data;
    expect(data).toMatchObject({ accountId: ACCOUNT, cashShiftId: SHIFT_ID, soldById: CAJERA.id, ticketNumber: 8, paymentMethod: 'CASH' });
    expect(data.total.toFixed(2)).toBe('3300.00');
    // Costo y margen congelados en cada renglón (Escenario "Costo congelado").
    const medialunas = data.items.create.find((l: { productId: string }) => l.productId === MEDIALUNA_ID);
    expect(medialunas.unitCost.toFixed(2)).toBe('301.35');
    expect(medialunas.marginPercent.toFixed(2)).toBe('66.52');
  });

  it('busca productos y turno solo en la cuenta de la sesión, aunque el cliente mande otra', async () => {
    await request(buildApp()).post('/api/sales').send({ ...ventaDeMostrador, accountId: 'acc-quimica-gyj' });

    expect(db.cashShift.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { accountId: ACCOUNT, status: 'OPEN' } }));
    expect(db.product.findMany.mock.calls[0]![0].where.accountId).toBe(ACCOUNT);
    expect(db.sale.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: { accountId: ACCOUNT } }));
  });

  it('la primera venta de la cuenta es el ticket 1', async () => {
    db.sale.aggregate.mockResolvedValue({ _max: { ticketNumber: null } });
    await request(buildApp()).post('/api/sales').send(ventaDeMostrador);
    expect(db.sale.create.mock.calls[0]![0].data.ticketNumber).toBe(1);
  });

  it('si otra venta tomó el mismo número a la vez, reintenta con el siguiente', async () => {
    const choque = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['accountId', 'ticketNumber'] },
    });
    db.sale.create.mockRejectedValueOnce(choque);
    db.sale.aggregate.mockResolvedValueOnce({ _max: { ticketNumber: 7 } }).mockResolvedValueOnce({ _max: { ticketNumber: 8 } });

    const res = await request(buildApp()).post('/api/sales').send(ventaDeMostrador);

    expect(res.status).toBe(201);
    expect(db.sale.create).toHaveBeenCalledTimes(2);
    expect(db.sale.create.mock.calls[1]![0].data.ticketNumber).toBe(9);
  });

  it('Escenario "Sin turno abierto": responde 409 y no registra nada', async () => {
    db.cashShift.findFirst.mockResolvedValue(null);

    const res = await request(buildApp()).post('/api/sales').send(ventaDeMostrador);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/turno de caja abierto/);
    expect(db.sale.create).not.toHaveBeenCalled();
  });

  it('un producto de otra cuenta responde 404 y uno en borrador 422', async () => {
    db.product.findMany.mockResolvedValueOnce([productos[0]]);
    let res = await request(buildApp()).post('/api/sales').send(ventaDeMostrador);
    expect(res.status).toBe(404);

    db.product.findMany.mockResolvedValueOnce([productos[0], { ...productos[1], _count: { ingredients: 0 } }]);
    res = await request(buildApp()).post('/api/sales').send(ventaDeMostrador);
    expect(res.status).toBe(422);
    expect(db.sale.create).not.toHaveBeenCalled();
  });

  it('valida el cuerpo antes de tocar la base: 400', async () => {
    const res = await request(buildApp()).post('/api/sales').send({ paymentMethod: 'CASH', items: [] });
    expect(res.status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('exige sesión: 401', async () => {
    currentUser = undefined;
    const res = await request(buildApp()).post('/api/sales').send(ventaDeMostrador);
    expect(res.status).toBe(401);
  });
});

describe('GET /api/sales', () => {
  beforeEach(() => {
    db.sale.count.mockResolvedValue(1);
    db.sale.findMany.mockResolvedValue([
      { id: SALE_ID, ticketNumber: 8, soldAt: new Date('2026-11-24T12:30:00.000Z'), paymentMethod: 'CASH', total: D('3300'), status: 'COMPLETED', cashShiftId: SHIFT_ID, _count: { items: 2 } },
    ]);
  });

  it('Escenario "Colaborador sin costos": recibe solo sus ventas, sin costos', async () => {
    const res = await request(buildApp()).get('/api/sales');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [{ id: SALE_ID, ticketNumber: 8, soldAt: '2026-11-24T12:30:00.000Z', paymentMethod: 'CASH', total: '3300.00', status: 'COMPLETED', cashShiftId: SHIFT_ID, itemsCount: 2 }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    expect(db.sale.findMany.mock.calls[0]![0].where).toEqual({ accountId: ACCOUNT, soldById: CAJERA.id });
    expect(res.headers['cache-control']).toBe('private, no-store');
  });

  it('el ADMIN ve las de toda la cuenta, filtradas por día de Argentina y por turno', async () => {
    currentUser = ADMIN;
    const res = await request(buildApp()).get(`/api/sales?date=2026-11-24&cashShiftId=${SHIFT_ID}&page=2&limit=10`);

    expect(res.status).toBe(200);
    expect(db.sale.findMany.mock.calls[0]![0]).toMatchObject({
      where: {
        accountId: ACCOUNT,
        cashShiftId: SHIFT_ID,
        soldAt: { gte: new Date('2026-11-24T03:00:00.000Z'), lt: new Date('2026-11-25T03:00:00.000Z') },
      },
      skip: 10,
      take: 10,
      orderBy: { soldAt: 'desc' },
    });
  });

  it('una fecha inválida responde 400', async () => {
    const res = await request(buildApp()).get('/api/sales?date=24-11-2026');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/sales/:id', () => {
  it('al ADMIN le devuelve el detalle con costo y margen congelados', async () => {
    currentUser = ADMIN;
    db.sale.findFirst.mockResolvedValue(ventaGuardada());

    const res = await request(buildApp()).get(`/api/sales/${SALE_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.totalCost).toBe('1015.20');
    expect(res.body.items[1]).toMatchObject({ productName: 'Medialuna de manteca', unitCost: '301.35', marginPercent: '66.52' });
    expect(db.sale.findFirst.mock.calls[0]![0].where).toEqual({ id: SALE_ID, accountId: ACCOUNT });
  });

  it('al colaborador le devuelve el ticket sin costos y solo si la venta es suya', async () => {
    db.sale.findFirst.mockResolvedValue(ventaGuardada());

    const res = await request(buildApp()).get(`/api/sales/${SALE_ID}`);

    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/unitCost|lineCost|marginPercent|totalCost/);
    expect(res.body.items[1]).toEqual({ productId: MEDIALUNA_ID, productName: 'Medialuna de manteca', quantity: 2, unitPrice: '900.00', lineTotal: '1800.00' });
    expect(db.sale.findFirst.mock.calls[0]![0].where).toEqual({ id: SALE_ID, accountId: ACCOUNT, soldById: CAJERA.id });
  });

  it('una venta que no existe, de otra cuenta o con id inválido responde 404', async () => {
    db.sale.findFirst.mockResolvedValue(null);
    expect((await request(buildApp()).get(`/api/sales/${SALE_ID}`)).status).toBe(404);
    expect((await request(buildApp()).get('/api/sales/ticket-8')).status).toBe(404);
  });
});

describe('POST /api/sales/:id/void', () => {
  const motivo = { reason: 'Cobré dos veces la misma venta' };

  beforeEach(() => {
    db.sale.findFirst.mockResolvedValue({ id: SALE_ID, status: 'COMPLETED', soldById: CAJERA.id, cashShift: { status: 'OPEN' } });
    db.sale.updateMany.mockResolvedValue({ count: 1 });
    db.sale.findFirstOrThrow.mockResolvedValue(
      ventaGuardada({ status: 'VOIDED', voidedAt: new Date('2026-11-24T13:00:00.000Z'), voidReason: motivo.reason })
    );
  });

  it('el colaborador anula su venta del turno abierto: queda VOIDED con el motivo, sin borrar nada', async () => {
    const res = await request(buildApp()).post(`/api/sales/${SALE_ID}/void`).send(motivo);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'VOIDED', voidReason: motivo.reason });
    expect(db.sale.updateMany).toHaveBeenCalledWith({
      where: { id: SALE_ID, accountId: ACCOUNT, status: 'COMPLETED' },
      data: expect.objectContaining({ status: 'VOIDED', voidedById: CAJERA.id, voidReason: motivo.reason }),
    });
    expect(JSON.stringify(res.body)).not.toMatch(/unitCost|marginPercent/);
  });

  it('el colaborador no anula la venta de otro (404) ni una de un turno cerrado (403)', async () => {
    db.sale.findFirst.mockResolvedValueOnce({ id: SALE_ID, status: 'COMPLETED', soldById: 'u-otro', cashShift: { status: 'OPEN' } });
    expect((await request(buildApp()).post(`/api/sales/${SALE_ID}/void`).send(motivo)).status).toBe(404);

    db.sale.findFirst.mockResolvedValueOnce({ id: SALE_ID, status: 'COMPLETED', soldById: CAJERA.id, cashShift: { status: 'CLOSED' } });
    const res = await request(buildApp()).post(`/api/sales/${SALE_ID}/void`).send(motivo);
    expect(res.status).toBe(403);
    expect(db.sale.updateMany).not.toHaveBeenCalled();
  });

  it('el ADMIN anula cualquier venta de la cuenta, también de un turno cerrado', async () => {
    currentUser = ADMIN;
    db.sale.findFirst.mockResolvedValueOnce({ id: SALE_ID, status: 'COMPLETED', soldById: CAJERA.id, cashShift: { status: 'CLOSED' } });

    const res = await request(buildApp()).post(`/api/sales/${SALE_ID}/void`).send(motivo);

    expect(res.status).toBe(200);
    expect(db.sale.findFirst.mock.calls[0]![0].where).toEqual({ id: SALE_ID, accountId: ACCOUNT });
  });

  it('una venta ya anulada responde 409, también si otro la anuló al mismo tiempo', async () => {
    db.sale.findFirst.mockResolvedValueOnce({ id: SALE_ID, status: 'VOIDED', soldById: CAJERA.id, cashShift: { status: 'OPEN' } });
    expect((await request(buildApp()).post(`/api/sales/${SALE_ID}/void`).send(motivo)).status).toBe(409);

    db.sale.updateMany.mockResolvedValueOnce({ count: 0 });
    expect((await request(buildApp()).post(`/api/sales/${SALE_ID}/void`).send(motivo)).status).toBe(409);
  });

  it('sin motivo responde 400, y con id inválido 404', async () => {
    expect((await request(buildApp()).post(`/api/sales/${SALE_ID}/void`).send({})).status).toBe(400);
    expect((await request(buildApp()).post('/api/sales/ticket-8/void').send(motivo)).status).toBe(404);
  });
});
