import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler } from '../middlewares/errorHandler';

const db = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock('../lib/prisma', () => ({ prisma: { account: { findUnique: db.findUnique } } }));

const MODULE_OFF = { subscriptionPlan: 'FREE', features: [] };
const MODULE_ON = { subscriptionPlan: 'FREE', features: [{ feature: 'sales', enabled: true }] };
const accountQuery = (accountId: string) => expect.objectContaining({ where: { id: accountId } });

type TestUser = { id: string; accountId: string; email: string; role: 'ADMIN' | 'COLLABORATOR' };
let currentUser: TestUser | undefined;
vi.mock('../middlewares/auth', () => ({
  authMiddleware: (req: { user?: TestUser }, res: { status: (n: number) => { json: (b: unknown) => void } }, next: () => void) => {
    if (!currentUser) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }
    req.user = currentUser;
    next();
  },
}));

import { salesRouter, cashShiftsRouter } from './salesModule';

const PANADERIA: TestUser = {
  id: 'u-admin-panaderia',
  accountId: 'acc-panaderia-central',
  email: 'admin.panaderia@seed.example.test',
  role: 'ADMIN',
};
const CAJERA_PANADERIA: TestUser = {
  id: 'u-cajera-panaderia',
  accountId: 'acc-panaderia-central',
  email: 'cajera.panaderia@seed.example.test',
  role: 'COLLABORATOR',
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/sales', salesRouter);
  app.use('/api/cash-shifts', cashShiftsRouter);
  app.use(errorHandler);
  return app;
}

describe('Módulo de ventas apagado (ADR-010)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = PANADERIA;
    db.findUnique.mockResolvedValue(MODULE_OFF);
  });

  it.each([
    ['GET', '/api/sales'],
    ['GET', '/api/sales/9f1c2a3b-0000-4000-8000-000000000001'],
    ['POST', '/api/sales'],
    ['POST', '/api/sales/9f1c2a3b-0000-4000-8000-000000000001/void'],
    ['GET', '/api/cash-shifts/current'],
    ['POST', '/api/cash-shifts/open'],
    ['POST', '/api/cash-shifts/9f1c2a3b-0000-4000-8000-000000000002/close'],
  ])('%s %s responde 404 si la cuenta no tiene el módulo', async (method, path) => {
    const app = buildApp();
    const res = method === 'GET' ? await request(app).get(path) : await request(app).post(path).send({});

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Recurso no encontrado.' });
    expect(db.findUnique).toHaveBeenCalledWith(accountQuery('acc-panaderia-central'));
  });

  it('también responde 404 al colaborador de una cuenta sin el módulo', async () => {
    currentUser = CAJERA_PANADERIA;

    const res = await request(buildApp()).get('/api/sales');

    expect(res.status).toBe(404);
  });

  it('exige sesión antes de consultar el módulo', async () => {
    currentUser = undefined;

    const res = await request(buildApp()).get('/api/cash-shifts/current');

    expect(res.status).toBe(401);
    expect(db.findUnique).not.toHaveBeenCalled();
  });
});

describe('Módulo de ventas prendido', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = PANADERIA;
    db.findUnique.mockResolvedValue(MODULE_ON);
  });

  it('pasa la compuerta del módulo: las rutas llegan con la venta y la caja', async () => {
    const res = await request(buildApp()).get('/api/sales');

    // Sin rutas todavía: Express responde su 404 por defecto, no el de la compuerta.
    expect(res.status).toBe(404);
    expect(res.body).not.toEqual({ error: 'Recurso no encontrado.' });
    expect(db.findUnique).toHaveBeenCalledWith(accountQuery('acc-panaderia-central'));
  });
});
