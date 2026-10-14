import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const accountFindUniqueMock = vi.fn();

vi.mock('../lib/prisma', () => ({
  prisma: {
    account: {
      findUnique: (...args: unknown[]) => accountFindUniqueMock(...args),
    },
  },
}));

import webhooksRouter from './webhooks';
import { errorHandler } from '../middlewares/errorHandler';

function buildApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/webhooks', webhooksRouter);
  app.use(errorHandler);
  return app;
}

describe('POST /api/webhooks/supplier-prices', () => {
  beforeEach(() => {
    process.env.INTERNAL_WEBHOOK_SECRET = 'test-secret';
    accountFindUniqueMock.mockReset();
  });

  it('rechaza la solicitud si falta el secreto interno', async () => {
    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .send({
        accountSlug: 'panaderia-central',
        items: [{ code: 'SKU-1', price: 123.45 }],
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
    expect(accountFindUniqueMock).not.toHaveBeenCalled();
  });

  it('rechaza la solicitud si el secreto interno es incorrecto y no ejecuta procesamiento', async () => {
    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'secreto-incorrecto')
      .send({
        accountSlug: 'panaderia-central',
        items: [{ code: 'SKU-1', price: 123.45 }],
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
    expect(accountFindUniqueMock).not.toHaveBeenCalled();
  });

  it('devuelve 404 cuando no existe una cuenta activa para el slug indicado', async () => {
    accountFindUniqueMock.mockResolvedValue(null);

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'slug-inexistente',
        items: [{ code: 'SKU-1', price: 123.45 }],
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('No existe una cuenta activa para el slug indicado.');
  });

  it('rechaza un payload mayor a 5000 items con 400 Bad Request', async () => {
    const items = Array.from({ length: 5001 }, (_, index) => ({
      code: `SKU-${index + 1}`,
      description: `Producto ${index + 1}`,
      price: 15.5 + index,
    }));

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('5000');
    expect(accountFindUniqueMock).not.toHaveBeenCalled();
  });

  it('acepta un payload válido para una cuenta activa y confirma el lote', async () => {
    const account = { id: 'acc-123', slug: 'panaderia-central', isActive: true };
    accountFindUniqueMock.mockResolvedValue(account);

    const items = Array.from({ length: 100 }, (_, index) => ({
      code: `SKU-${index + 1}`,
      description: `Producto ${index + 1}`,
      price: 15.5 + index,
    }));

    const res = await request(buildApp())
      .post('/api/webhooks/supplier-prices')
      .set('x-margenx-webhook-secret', 'test-secret')
      .send({
        accountSlug: 'panaderia-central',
        items,
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Lote de precios recibido correctamente.');
    expect(res.body.accountId).toBe('acc-123');
    expect(res.body.processedItems).toBe(100);
    expect(accountFindUniqueMock).toHaveBeenCalledWith({
      where: { slug: 'panaderia-central' },
    });
  });
});
