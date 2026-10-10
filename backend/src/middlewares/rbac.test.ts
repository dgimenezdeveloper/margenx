import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Prisma } from '@prisma/client';

import type { AuthenticatedRequest } from './auth';
import type { Response, NextFunction } from 'express';

const productFindManyMock = vi.fn();
const productCountMock = vi.fn();
const findManyIngredientMock = vi.fn();
const countIngredientMock = vi.fn();
const supplierFindManyMock = vi.fn();
const ingredientFindFirstMock = vi.fn();
const accountUpdateMock = vi.fn();

const authMiddlewareMock = vi.fn((req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  const role = (req.headers['x-role'] as string | undefined) === 'COLLABORATOR' ? 'COLLABORATOR' : 'ADMIN';
  req.user = { id: 'user-1', accountId: 'account-1', email: 'a@a.com', role };
  next();
});

vi.mock('../middlewares/auth', () => ({
  authMiddleware: (...args: Parameters<typeof authMiddlewareMock>) => authMiddlewareMock(...args),
}));

vi.mock('../lib/prisma', () => ({
  prisma: {
    product: {
      findMany: (...args: unknown[]) => productFindManyMock(...args),
      count: (...args: unknown[]) => productCountMock(...args),
    },
    ingredient: {
      findMany: (...args: unknown[]) => findManyIngredientMock(...args),
      count: (...args: unknown[]) => countIngredientMock(...args),
      findFirst: (...args: unknown[]) => ingredientFindFirstMock(...args),
    },
    supplier: {
      findMany: (...args: unknown[]) => supplierFindManyMock(...args),
    },
    priceHistory: {
      findMany: vi.fn(),
    },
    account: {
      update: (...args: unknown[]) => accountUpdateMock(...args),
    },
  },
}));

import productsRouter from '../routes/products';
import ingredientsRouter from '../routes/ingredients';
import suppliersRouter from '../routes/suppliers';
import { errorHandler } from './errorHandler';
import { requireRole, sanitizeFinancialData } from './rbac';
import authRoutes from '../routes/auth';

function buildApp(path: string, router: express.Router) {
  const app = express();
  app.use(express.json());
  app.use(path, router);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  productFindManyMock.mockReset();
  productCountMock.mockReset();
  findManyIngredientMock.mockReset();
  countIngredientMock.mockReset();
  supplierFindManyMock.mockReset();
  ingredientFindFirstMock.mockReset();
  accountUpdateMock.mockReset();
});

describe('rbac middleware', () => {
  it('requireRole: sin usuario responde 401', () => {
    const next = vi.fn();
    const noUserReq = { user: undefined } as unknown as AuthenticatedRequest;
    const res = {} as Response;

    requireRole(['ADMIN'])(noUserReq, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'No autorizado', statusCode: 401 }));
  });

  it('requireRole: con rol no permitido responde 403 con el rol requerido', () => {
    const next = vi.fn();
    const req = {
      user: { id: 'u1', accountId: 'a1', email: 'a@a.com', role: 'COLLABORATOR' },
    } as unknown as AuthenticatedRequest;

    requireRole(['ADMIN'])(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Acceso denegado. Se requiere rol ADMIN.', statusCode: 403 }));

    const multiRoleNext = vi.fn();
    const multiRoleReq = {
      user: { id: 'u1', accountId: 'a1', email: 'a@a.com', role: 'OTHER' as any },
    } as unknown as AuthenticatedRequest;
    requireRole(['ADMIN', 'COLLABORATOR'])(multiRoleReq, {} as Response, multiRoleNext);
    expect(multiRoleNext).toHaveBeenCalledWith(expect.objectContaining({ message: 'Acceso denegado. Se requiere rol ADMIN o COLLABORATOR.', statusCode: 403 }));

    const emptyRoleNext = vi.fn();
    const emptyRoleReq = {
      user: { id: 'u1', accountId: 'a1', email: 'a@a.com', role: 'OTHER' as any },
    } as unknown as AuthenticatedRequest;
    requireRole([])(emptyRoleReq, {} as Response, emptyRoleNext);
    expect(emptyRoleNext).toHaveBeenCalledWith(expect.objectContaining({ message: 'Acceso denegado. Se requiere rol un rol válido.', statusCode: 403 }));
  });

  it('requireRole: con rol permitido llama next()', () => {
    const next = vi.fn();
    const req = {
      user: { id: 'u1', accountId: 'a1', email: 'a@a.com', role: 'COLLABORATOR' },
    } as unknown as AuthenticatedRequest;

    requireRole(['COLLABORATOR'])(req, {} as Response, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('sanitizeFinancialData: elimina defaultMinMarginPercent y otros campos financieros en objetos anidados', () => {
    const next = vi.fn();
    const req = { user: { role: 'COLLABORATOR' } } as AuthenticatedRequest;
    const payload = {
      account: {
        defaultMinMarginPercent: 15,
        businessName: 'Panadería',
      },
      product: {
        salePrice: 250,
        packagePrice: 200,
        currentCost: 150,
        ingredients: [{ unitCost: 10, quantity: 2 }],
      },
      nested: [{ marginPercent: 40 }, { oldCost: 50 }],
    };

    const originalJson = vi.fn();
    const res = {
      json: originalJson,
      setHeader: vi.fn(),
    } as unknown as Response;

    sanitizeFinancialData(req, res, next);
    (res as unknown as { json: (body: unknown) => unknown }).json(payload);
    const returned = originalJson.mock.calls[0]?.[0] as Record<string, unknown> | undefined;

    expect(returned).toBeDefined();
    expect(returned!.account).toEqual({ businessName: 'Panadería' });
    expect(returned!.product).toEqual({ salePrice: 250, ingredients: [{ quantity: 2 }] });
    expect(returned!.nested).toEqual([{}, {}]);
    expect(JSON.stringify(returned!)).not.toMatch(/defaultMinMarginPercent|marginPercent|oldCost|packagePrice|unitCost|currentCost/i);
  });

  it('sanitizeFinancialData: no-op para ADMIN y no muta el objeto original', () => {
    const next = vi.fn();
    const req = { user: { role: 'ADMIN' } } as AuthenticatedRequest;
    const payload = { cost: 100, marginPercent: 25 };
    const res = { json: vi.fn(), setHeader: vi.fn() } as unknown as Response;

    sanitizeFinancialData(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(payload).toEqual({ cost: 100, marginPercent: 25 });
  });

  it('COLABORADOR: conserva Decimal y Date y elimina campos financieros de la respuesta real', async () => {
    productFindManyMock.mockResolvedValue([
      {
        id: 'p1',
        name: 'Pan',
        salePrice: new Prisma.Decimal('250.00'),
        cost: new Prisma.Decimal('150.00'),
        marginAmount: new Prisma.Decimal('100.00'),
        marginPercent: new Prisma.Decimal('40.00'),
        minMarginPercent: new Prisma.Decimal('30.00'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        ingredients: [{ ingredientId: 'i1', quantity: new Prisma.Decimal('2.00') }],
      },
    ]);
    productCountMock.mockResolvedValue(1);

    const res = await request(buildApp('/api/products', productsRouter))
      .get('/api/products')
      .set('x-role', 'COLLABORATOR');

    expect(res.status).toBe(200);
    expect(res.body.data[0].salePrice).toBe('250');
    expect(res.body.data[0].updatedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(res.body.data[0]).not.toHaveProperty('cost');
    expect(res.body.data[0]).not.toHaveProperty('marginAmount');
    expect(res.body.data[0]).not.toHaveProperty('marginPercent');
    expect(res.body.data[0]).not.toHaveProperty('minMarginPercent');
    expect(JSON.stringify(res.body)).not.toMatch(/cost|margin/i);
  });

  it('COLABORADOR: bloquea POST, PUT y DELETE en productos e ingredientes', async () => {
    const productRes = await request(buildApp('/api/products', productsRouter))
      .post('/api/products')
      .send({ name: 'Pan', salePrice: 150, minMarginPercent: 20, ingredients: [] })
      .set('x-role', 'COLLABORATOR');

    expect(productRes.status).toBe(403);
    expect(productRes.body.error).toBe('Acceso denegado. Se requiere rol ADMIN.');

    const putRes = await request(buildApp('/api/products', productsRouter))
      .put('/api/products/p1')
      .send({ name: 'Pan' })
      .set('x-role', 'COLLABORATOR');

    expect(putRes.status).toBe(403);
    expect(putRes.body.error).toBe('Acceso denegado. Se requiere rol ADMIN.');

    const deleteProductRes = await request(buildApp('/api/products', productsRouter))
      .delete('/api/products/p1')
      .set('x-role', 'COLLABORATOR');
    expect(deleteProductRes.status).toBe(403);
    expect(deleteProductRes.body.error).toBe('Acceso denegado. Se requiere rol ADMIN.');

    const ingredientPostRes = await request(buildApp('/api/ingredients', ingredientsRouter))
      .post('/api/ingredients')
      .send({ name: 'Harina', unit: 'kg', currentCost: '10' })
      .set('x-role', 'COLLABORATOR');

    expect(ingredientPostRes.status).toBe(403);
    expect(ingredientPostRes.body.error).toBe('Acceso denegado. Se requiere rol ADMIN.');

    const ingredientPutRes = await request(buildApp('/api/ingredients', ingredientsRouter))
      .put('/api/ingredients/i1')
      .send({ name: 'Harina', unit: 'kg', currentCost: '12' })
      .set('x-role', 'COLLABORATOR');

    expect(ingredientPutRes.status).toBe(403);
    expect(ingredientPutRes.body.error).toBe('Acceso denegado. Se requiere rol ADMIN.');

    const ingredientDeleteRes = await request(buildApp('/api/ingredients', ingredientsRouter))
      .delete('/api/ingredients/i1')
      .set('x-role', 'COLLABORATOR');

    expect(ingredientDeleteRes.status).toBe(403);
    expect(ingredientDeleteRes.body.error).toBe('Acceso denegado. Se requiere rol ADMIN.');
  });

  it('COLABORADOR: no puede abrir historial de costos ni consultar proveedores', async () => {
    ingredientFindFirstMock.mockResolvedValue({ id: 'i1' });

    const historyRes = await request(buildApp('/api/ingredients', ingredientsRouter))
      .get('/api/ingredients/i1/history')
      .set('x-role', 'COLLABORATOR');

    expect(historyRes.status).toBe(403);
    expect(historyRes.body.error).toBe('Acceso denegado. Se requiere rol ADMIN.');

    const suppliersRes = await request(buildApp('/api/suppliers', suppliersRouter))
      .get('/api/suppliers')
      .set('x-role', 'COLLABORATOR');

    expect(suppliersRes.status).toBe(403);
    expect(suppliersRes.body.error).toBe('Acceso denegado. Se requiere rol ADMIN.');
  });

  it('ADMIN: conserva los datos financieros y puede consultar rutas protegidas', async () => {
    productFindManyMock.mockResolvedValue([
      {
        id: 'p1',
        name: 'Pan',
        salePrice: new Prisma.Decimal('250.00'),
        cost: new Prisma.Decimal('150.00'),
        marginAmount: new Prisma.Decimal('100.00'),
        marginPercent: new Prisma.Decimal('40.00'),
        minMarginPercent: new Prisma.Decimal('30.00'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        ingredients: [{ ingredientId: 'i1', quantity: new Prisma.Decimal('2.00') }],
      },
    ]);
    productCountMock.mockResolvedValue(1);

    const res = await request(buildApp('/api/products', productsRouter)).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body.data[0].cost).toBe('150');
    expect(res.body.data[0].marginPercent).toBe('40');
    expect(res.body.data[0].minMarginPercent).toBe('30');
  });

  it('GET /api/auth/me filtra defaultMinMarginPercent para COLLABORATOR y lo expone para ADMIN', async () => {
    const adminUser: NonNullable<AuthenticatedRequest['user']> = {
      id: 'user-1',
      accountId: 'account-1',
      email: 'a@a.com',
      role: 'ADMIN',
      account: {
        id: 'account-1',
        businessName: 'Panadería Central',
        defaultMinMarginPercent: new Prisma.Decimal('15.5'),
      },
    };

    authMiddlewareMock.mockImplementationOnce((req, _res, next) => {
      req.user = { ...adminUser };
      next();
    });

    const adminRes = await request(buildApp('/api/auth', authRoutes)).get('/api/auth/me');
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.user.account.defaultMinMarginPercent.toString()).toBe('15.5');

    authMiddlewareMock.mockImplementationOnce((req, _res, next) => {
      req.user = {
        ...adminUser,
        role: 'COLLABORATOR',
      };
      next();
    });

    const collaboratorRes = await request(buildApp('/api/auth', authRoutes)).get('/api/auth/me');
    expect(collaboratorRes.status).toBe(200);
    expect(collaboratorRes.body.user.account).toEqual({ id: 'account-1', businessName: 'Panadería Central' });
    expect(collaboratorRes.body.user.account).not.toHaveProperty('defaultMinMarginPercent');
  });

  it('PATCH /api/auth/account/margin rechaza COLLABORATOR y no invoca Prisma', async () => {
    authMiddlewareMock.mockImplementationOnce((req, _res, next) => {
      req.user = {
        id: 'user-1',
        accountId: 'account-1',
        email: 'a@a.com',
        role: 'COLLABORATOR',
        account: {
          id: 'account-1',
          businessName: 'Panadería Central',
          defaultMinMarginPercent: new Prisma.Decimal('15.5'),
        },
      };
      next();
    });

    const collaboratorRes = await request(buildApp('/api/auth', authRoutes))
      .patch('/api/auth/account/margin')
      .send({ defaultMinMarginPercent: 20 })
      .set('Content-Type', 'application/json');

    expect(collaboratorRes.status).toBe(403);
    expect(collaboratorRes.body.error).toBe('Acceso denegado. Se requiere rol ADMIN.');
    expect(accountUpdateMock).not.toHaveBeenCalled();
  });
});
