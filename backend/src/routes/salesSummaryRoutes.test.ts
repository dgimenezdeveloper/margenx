import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { errorHandler } from '../middlewares/errorHandler';

const D = (v: string | number) => new Prisma.Decimal(v);

const db = vi.hoisted(() => ({
  account: { findUnique: vi.fn() },
  sale: { count: vi.fn() },
  saleItem: { aggregate: vi.fn(), groupBy: vi.fn() },
}));
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

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/sales', salesRouter);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Martes 24/11/2026, 12:00 de Argentina.
  vi.useFakeTimers({ now: new Date('2026-11-24T15:00:00.000Z'), toFake: ['Date'] });
  currentUser = ADMIN;
  db.account.findUnique.mockResolvedValue({ subscriptionPlan: 'FREE', features: [{ feature: 'sales', enabled: true }] });
  // Período actual: $100.000 en 41 ventas con $62.000 de costo. Anterior: $80.000 con $52.000.
  db.sale.count.mockResolvedValueOnce(41).mockResolvedValueOnce(35);
  db.saleItem.aggregate
    .mockResolvedValueOnce({ _sum: { lineTotal: D('100000'), lineCost: D('62000') } })
    .mockResolvedValueOnce({ _sum: { lineTotal: D('80000'), lineCost: D('52000') } });
  db.saleItem.groupBy.mockResolvedValue([
    { productId: 'p-medialunas', productName: 'Medialunas de manteca — docena (12 unidades)', _sum: { quantity: 4, lineTotal: D('54000'), lineCost: D('30000') } },
    { productId: 'p-pan', productName: 'Pan flauta — 1 kg', _sum: { quantity: 10, lineTotal: D('46000'), lineCost: D('32000') } },
  ]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GET /api/sales/summary (ganancia real)', () => {
  it('Escenario "Margen ponderado": la semana con $100.000 y $62.000 de costo da $38.000 y 38,00 %, comparada con la anterior', async () => {
    const res = await request(buildApp()).get('/api/sales/summary?period=week');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('private, no-store');
    expect(res.body).toMatchObject({
      period: 'week',
      from: '2026-11-18',
      to: '2026-11-24',
      salesCount: 41,
      salesTotal: '100000.00',
      costTotal: '62000.00',
      profit: '38000.00',
      marginPercent: '38.00',
      previous: { from: '2026-11-11', to: '2026-11-17', salesTotal: '80000.00', profit: '28000.00', marginPercent: '35.00' },
      change: { salesTotal: '25.00', profit: '35.71' },
    });
    expect(res.body.topSold[0]).toMatchObject({ productName: 'Pan flauta — 1 kg', quantity: 10 });
    expect(res.body.topProfit[0]).toMatchObject({ productName: 'Medialunas de manteca — docena (12 unidades)', profit: '24000.00' });
  });

  it('Escenario "Anuladas fuera": solo cuenta las ventas completadas de la cuenta de la sesión, en el rango del período', async () => {
    await request(buildApp()).get('/api/sales/summary?period=day&accountId=acc-quimica-gyj');

    const actual = { accountId: ACCOUNT, status: 'COMPLETED', soldAt: { gte: new Date('2026-11-24T03:00:00.000Z'), lt: new Date('2026-11-25T03:00:00.000Z') } };
    const anterior = { accountId: ACCOUNT, status: 'COMPLETED', soldAt: { gte: new Date('2026-11-23T03:00:00.000Z'), lt: new Date('2026-11-24T03:00:00.000Z') } };
    expect(db.sale.count).toHaveBeenCalledWith({ where: actual });
    expect(db.sale.count).toHaveBeenCalledWith({ where: anterior });
    expect(db.saleItem.aggregate).toHaveBeenCalledWith({ where: { sale: actual }, _sum: { lineTotal: true, lineCost: true } });
    expect(db.saleItem.groupBy).toHaveBeenCalledWith(expect.objectContaining({ by: ['productId', 'productName'], where: { sale: actual } }));
  });

  it('Escenario "Colaborador sin ganancia": al colaborador le responde 403 y no consulta nada', async () => {
    currentUser = CAJERA;

    const res = await request(buildApp()).get('/api/sales/summary');

    expect(res.status).toBe(403);
    expect(db.sale.count).not.toHaveBeenCalled();
    expect(db.saleItem.aggregate).not.toHaveBeenCalled();
  });

  it('un período inválido responde 400; sin período, usa la semana', async () => {
    expect((await request(buildApp()).get('/api/sales/summary?period=year')).status).toBe(400);
    const res = await request(buildApp()).get('/api/sales/summary');
    expect(res.body.period).toBe('week');
  });

  it('sin ventas en el período anterior, la variación va en null (no divide por cero)', async () => {
    db.sale.count.mockReset().mockResolvedValueOnce(41).mockResolvedValueOnce(0);
    db.saleItem.aggregate
      .mockReset()
      .mockResolvedValueOnce({ _sum: { lineTotal: D('100000'), lineCost: D('62000') } })
      .mockResolvedValueOnce({ _sum: { lineTotal: null, lineCost: null } });

    const res = await request(buildApp()).get('/api/sales/summary?period=week');

    expect(res.body.previous).toMatchObject({ salesCount: 0, salesTotal: '0.00', marginPercent: null });
    expect(res.body.change).toEqual({ salesTotal: null, profit: null });
  });

  it('con el módulo apagado responde 404, como el resto del módulo', async () => {
    db.account.findUnique.mockResolvedValue({ subscriptionPlan: 'FREE', features: [] });
    expect((await request(buildApp()).get('/api/sales/summary')).status).toBe(404);
  });
});
