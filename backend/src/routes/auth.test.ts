import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import authRouter from './auth';
import { prisma } from '../lib/prisma';
import { errorHandler } from '../middlewares/errorHandler';

vi.mock('../lib/prisma', () => ({
  prisma: {
    account: {
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

const features = vi.hoisted(() => ({ getAccountFeatures: vi.fn() }));
vi.mock('../lib/features', () => ({ getAccountFeatures: features.getAccountFeatures }));

let mockUser: any = {
  id: 'user-1',
  accountId: 'acc-1',
  email: 'admin@test.com',
  role: 'ADMIN',
  account: {
    id: 'acc-1',
    businessName: 'Panadería Central',
    defaultMinMarginPercent: 30,
    slug: 'panaderia-central',
  },
};

vi.mock('../middlewares/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = mockUser;
    next();
  },
}));

describe('Routes: Auth (/api/auth)', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    features.getAccountFeatures.mockResolvedValue({ sales: false });
    mockUser = {
      id: 'user-1',
      accountId: 'acc-1',
      email: 'admin@test.com',
      role: 'ADMIN',
      account: {
        id: 'acc-1',
        businessName: 'Panadería Central',
        defaultMinMarginPercent: 30,
        slug: 'panaderia-central',
      },
    };

    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    app.use(errorHandler);
  });

  describe('GET /api/auth/me', () => {
    it('retorna el usuario completo para rol ADMIN', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('ADMIN');
      expect(res.body.user.account.defaultMinMarginPercent).toBe(30);
      expect(res.body.user.account.slug).toBe('panaderia-central');
    });

    it('sanitiza defaultMinMarginPercent para rol COLLABORATOR', async () => {
      mockUser = {
        id: 'user-2',
        accountId: 'acc-1',
        email: 'colab@test.com',
        role: 'COLLABORATOR',
        account: {
          id: 'acc-1',
          businessName: 'Panadería Central',
          defaultMinMarginPercent: 30,
          slug: 'panaderia-central',
        },
      };

      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('COLLABORATOR');
      expect(res.body.user.account.id).toBe('acc-1');
      expect(res.body.user.account.businessName).toBe('Panadería Central');
      expect(res.body.user.account.defaultMinMarginPercent).toBeUndefined();
      expect(res.body.user.account.slug).toBeUndefined();
      expect(res.body.user.features).toEqual({ sales: false });
    });

    it('informa features.sales = false para una cuenta sin el módulo de ventas (ADR-010)', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(200);
      expect(res.body.user.features).toEqual({ sales: false });
      expect(features.getAccountFeatures).toHaveBeenCalledWith('acc-1');
    });

    it('informa features.sales = true para la cuenta Demo con la excepción prendida', async () => {
      mockUser = {
        id: '31d00001-0000-4000-8000-000000000001',
        accountId: '31a00000-0000-4000-8000-000000000001',
        email: 'demo-admin@margenx.tech',
        role: 'ADMIN',
        account: {
          id: '31a00000-0000-4000-8000-000000000001',
          businessName: 'Demo MargenX',
          defaultMinMarginPercent: 30,
          slug: 'demo-margenx',
        },
      };
      features.getAccountFeatures.mockResolvedValue({ sales: true });

      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(200);
      expect(res.body.user.features).toEqual({ sales: true });
      expect(features.getAccountFeatures).toHaveBeenCalledWith('31a00000-0000-4000-8000-000000000001');
    });

    it('el colaborador recibe los módulos de su cuenta: vende aunque no vea costos', async () => {
      mockUser = { ...mockUser, id: 'user-2', role: 'COLLABORATOR', email: 'colab@test.com' };
      features.getAccountFeatures.mockResolvedValue({ sales: true });

      const res = await request(app).get('/api/auth/me');

      expect(res.body.user.features).toEqual({ sales: true });
      expect(res.body.user.account.defaultMinMarginPercent).toBeUndefined();
    });
  });

  describe('PATCH /api/auth/account/margin', () => {
    it('bloquea a usuarios con rol COLLABORATOR con status 403', async () => {
      mockUser.role = 'COLLABORATOR';
      const res = await request(app)
        .patch('/api/auth/account/margin')
        .send({ defaultMinMarginPercent: 40 });

      expect(res.status).toBe(403);
    });

    it('rechaza porcentaje no numérico o ausente con 400', async () => {
      const res1 = await request(app)
        .patch('/api/auth/account/margin')
        .send({});
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .patch('/api/auth/account/margin')
        .send({ defaultMinMarginPercent: 'invalid' });
      expect(res2.status).toBe(400);
    });

    it('rechaza porcentajes menores a 0 o mayores a 100 con 400', async () => {
      const resNeg = await request(app)
        .patch('/api/auth/account/margin')
        .send({ defaultMinMarginPercent: -5 });
      expect(resNeg.status).toBe(400);

      const resMax = await request(app)
        .patch('/api/auth/account/margin')
        .send({ defaultMinMarginPercent: 105 });
      expect(resMax.status).toBe(400);
    });

    it('actualiza el margen global de la cuenta exitosamente con 200', async () => {
      vi.mocked(prisma.account.update).mockResolvedValueOnce({
        id: 'acc-1',
        businessName: 'Panadería Central',
        defaultMinMarginPercent: 45 as any,
      } as any);

      const res = await request(app)
        .patch('/api/auth/account/margin')
        .send({ defaultMinMarginPercent: 45 });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Margen global actualizado correctamente');
      expect(res.body.account.defaultMinMarginPercent).toBe(45);
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { defaultMinMarginPercent: 45 },
        select: {
          id: true,
          businessName: true,
          defaultMinMarginPercent: true,
        },
      });
    });
  });

  describe('Equipo de la cuenta (routes/collaborators.ts)', () => {
    it('monta GET /api/auth/users bajo el router de autenticación', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValueOnce([]);

      const res = await request(app).get('/api/auth/users');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ users: [] });
    });
  });
});
