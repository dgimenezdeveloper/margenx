import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { type Response } from 'express';
import request from 'supertest';
import { errorHandler } from '../middlewares/errorHandler';
import type { AuthenticatedRequest } from '../middlewares/auth';

const db = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock('./prisma', () => ({ prisma: { account: { findUnique: db.findUnique } } }));

import {
  FEATURES,
  PLAN_FEATURES,
  getAccountFeatures,
  hasFeature,
  requireFeature,
  resolveFeatures,
} from './features';

const DEMO_ID = '31a00000-0000-4000-8000-000000000001';
const PANADERIA_ID = 'acc-panaderia-central';

describe('features: resolución por plan y por cuenta (ADR-010)', () => {
  it('hoy ningún plan trae módulos: la asignación por plan se decide en la v1.2', () => {
    for (const plan of Object.keys(PLAN_FEATURES)) {
      expect(PLAN_FEATURES[plan]).toEqual([]);
    }
    expect(Object.keys(PLAN_FEATURES).sort()).toEqual(['BASIC', 'BUSINESS', 'FREE', 'PRO']);
  });

  it('la excepción de la cuenta prende el módulo aunque el plan no lo traiga', () => {
    expect(hasFeature({ subscriptionPlan: 'FREE', exceptions: [{ feature: 'sales', enabled: true }] }, 'sales')).toBe(true);
  });

  it('la excepción de la cuenta apaga el módulo aunque el plan lo traiga', () => {
    const planFeatures = { PRO: ['sales' as const] };
    expect(
      hasFeature({ subscriptionPlan: 'PRO', exceptions: [{ feature: 'sales', enabled: false }] }, 'sales', planFeatures)
    ).toBe(false);
  });

  it('sin excepción manda el plan', () => {
    const planFeatures = { PRO: ['sales' as const] };
    expect(hasFeature({ subscriptionPlan: 'PRO', exceptions: [] }, 'sales', planFeatures)).toBe(true);
    expect(hasFeature({ subscriptionPlan: 'FREE', exceptions: [] }, 'sales', planFeatures)).toBe(false);
  });

  it('un plan desconocido no trae módulos', () => {
    expect(hasFeature({ subscriptionPlan: 'LEGADO', exceptions: [] }, 'sales')).toBe(false);
  });

  it('ignora excepciones de módulos que no existen', () => {
    expect(resolveFeatures({ subscriptionPlan: 'FREE', exceptions: [{ feature: 'stock', enabled: true }] })).toEqual({ sales: false });
  });

  it('resolveFeatures devuelve un valor por cada módulo conocido', () => {
    expect(Object.keys(resolveFeatures({ subscriptionPlan: 'FREE', exceptions: [] }))).toEqual([...FEATURES]);
  });
});

describe('getAccountFeatures', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lee el plan y las excepciones de la cuenta en una sola consulta acotada por id', async () => {
    db.findUnique.mockResolvedValue({ subscriptionPlan: 'FREE', features: [{ feature: 'sales', enabled: true }] });

    await expect(getAccountFeatures(DEMO_ID)).resolves.toEqual({ sales: true });
    expect(db.findUnique).toHaveBeenCalledWith({
      where: { id: DEMO_ID },
      select: { subscriptionPlan: true, features: { select: { feature: true, enabled: true } } },
    });
  });

  it('una cuenta inexistente no tiene módulos', async () => {
    db.findUnique.mockResolvedValue(null);
    await expect(getAccountFeatures('acc-inexistente')).resolves.toEqual({ sales: false });
  });
});

describe('requireFeature (middleware)', () => {
  let currentUser: AuthenticatedRequest['user'];

  function buildApp() {
    const app = express();
    app.use((req: AuthenticatedRequest, _res, next) => {
      req.user = currentUser;
      next();
    });
    app.get('/api/sales', requireFeature('sales'), (_req, res: Response) => {
      res.status(200).json({ ok: true });
    });
    app.use(errorHandler);
    return app;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = { id: 'u-admin-panaderia', accountId: PANADERIA_ID, email: 'admin.panaderia@seed.example.test', role: 'ADMIN' };
  });

  it('responde 404 si el módulo está apagado para la cuenta', async () => {
    db.findUnique.mockResolvedValue({ subscriptionPlan: 'FREE', features: [] });

    const res = await request(buildApp()).get('/api/sales');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Recurso no encontrado.' });
    expect(db.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: PANADERIA_ID } }));
  });

  it('deja pasar si la cuenta tiene el módulo', async () => {
    currentUser = { id: 'u-demo-admin', accountId: DEMO_ID, email: 'demo-admin@margenx.tech', role: 'ADMIN' };
    db.findUnique.mockResolvedValue({ subscriptionPlan: 'FREE', features: [{ feature: 'sales', enabled: true }] });

    const res = await request(buildApp()).get('/api/sales');

    expect(res.status).toBe(200);
  });

  it('responde 401 sin usuario autenticado y no consulta la base', async () => {
    currentUser = undefined;

    const res = await request(buildApp()).get('/api/sales');

    expect(res.status).toBe(401);
    expect(db.findUnique).not.toHaveBeenCalled();
  });
});
