// src/routes/suppliers.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

import type { AuthenticatedRequest } from '../middlewares/auth';
import type { Response, NextFunction } from 'express';

vi.mock('../middlewares/auth', () => ({
  authMiddleware: (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    req.user = { id: 'user-1', accountId: 'account-1', email: 'a@a.com', role: 'ADMIN' };
    next();
  },
}));

const findManyMock = vi.fn();
const findFirstMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();

vi.mock('../lib/prisma', () => ({
  prisma: {
    supplier: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      findFirst: (...args: unknown[]) => findFirstMock(...args),
      create: (...args: unknown[]) => createMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
      delete: (...args: unknown[]) => deleteMock(...args),
    },
  },
}));

import suppliersRouter from './suppliers';
import { errorHandler } from '../middlewares/errorHandler';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/suppliers', suppliersRouter);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  findManyMock.mockReset();
  findFirstMock.mockReset();
  createMock.mockReset();
  updateMock.mockReset();
  deleteMock.mockReset();
});

describe('GET /api/suppliers', () => {
  it('lista solo los proveedores de la cuenta ordenados por name asc', async () => {
    const suppliers = [
      { id: 's-1', accountId: 'account-1', name: 'Acuario' },
      { id: 's-2', accountId: 'account-1', name: 'Bodega' },
    ];
    findManyMock.mockResolvedValue(suppliers);

    const res = await request(buildApp()).get('/api/suppliers');

    expect(res.status).toBe(200);
    expect(res.body.suppliers).toEqual(suppliers);
    expect(findManyMock).toHaveBeenCalledWith({
      where: { accountId: 'account-1' },
      orderBy: { name: 'asc' },
    });
  });

  it('devuelve array vacío si no hay proveedores', async () => {
    findManyMock.mockResolvedValue([]);

    const res = await request(buildApp()).get('/api/suppliers');

    expect(res.status).toBe(200);
    expect(res.body.suppliers).toEqual([]);
  });
});

describe('POST /api/suppliers', () => {
  it('crea asignando accountId del token, con trim del name y opcionales en null', async () => {
    const created = {
      id: 's-1',
      accountId: 'account-1',
      name: 'Madero',
      contactPhone: null,
      email: null,
      address: null,
      isActive: true,
    };
    createMock.mockResolvedValue(created);

    const res = await request(buildApp())
      .post('/api/suppliers')
      .send({
        name: '  Madero  ',
        contactPhone: null,
        email: null,
        address: null,
        isActive: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.supplier).toEqual(created);
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Madero',
        accountId: 'account-1',
        contactPhone: null,
        email: null,
        address: null,
        isActive: true,
      }),
    });
  });

  it('ignora el accountId enviado en el body', async () => {
    createMock.mockResolvedValue({ id: 's-1' });

    await request(buildApp())
      .post('/api/suppliers')
      .send({ name: 'Proveedor', accountId: 'account-ajena' });

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ accountId: 'account-1' }),
    });
  });

  it('convierte un contactPhone numérico a string', async () => {
    createMock.mockResolvedValue({ id: 's-1' });

    await request(buildApp())
      .post('/api/suppliers')
      .send({ name: 'Proveedor', contactPhone: 1234567 });

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ contactPhone: '1234567' }),
    });
  });

  it('devuelve 400 si falta name', async () => {
    const res = await request(buildApp())
      .post('/api/suppliers')
      .send({ contactPhone: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El campo "name" es obligatorio.');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('devuelve 400 si name es solo espacios', async () => {
    const res = await request(buildApp())
      .post('/api/suppliers')
      .send({ name: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El campo "name" es obligatorio.');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('devuelve 400 si name no es string', async () => {
    const res = await request(buildApp())
      .post('/api/suppliers')
      .send({ name: 123 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El campo "name" es obligatorio.');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('devuelve 400 (no 500) si no se envía body', async () => {
    const res = await request(buildApp()).post('/api/suppliers');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El campo "name" es obligatorio.');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('devuelve 400 si isActive no es boolean', async () => {
    const res = await request(buildApp())
      .post('/api/suppliers')
      .send({ name: 'Proveedor', isActive: 'false' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El campo "isActive" debe ser booleano.');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('devuelve 400 si email no tiene formato válido', async () => {
    const res = await request(buildApp())
      .post('/api/suppliers')
      .send({ name: 'Proveedor', email: 'correo-invalido' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El campo "email" debe tener un formato válido.');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('devuelve 400 si contactPhone es un objeto', async () => {
    const res = await request(buildApp())
      .post('/api/suppliers')
      .send({ name: 'Proveedor', contactPhone: { value: 123 } });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El campo "contactPhone" debe ser un texto.');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('devuelve 409 con "Ya existe un proveedor con ese nombre." si el nombre existe', async () => {
    findFirstMock.mockResolvedValue({ id: 's-1', accountId: 'account-1', name: 'Proveedor' });

    const res = await request(buildApp())
      .post('/api/suppliers')
      .send({ name: 'Proveedor' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Ya existe un proveedor con ese nombre.');
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { accountId: 'account-1', name: { equals: 'Proveedor', mode: 'insensitive' } },
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('no guarda el nombre en minúsculas', async () => {
    createMock.mockResolvedValue({ id: 's-1' });

    await request(buildApp())
      .post('/api/suppliers')
      .send({ name: '  PANADERIA  ' });

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'PANADERIA' }),
    });
  });
});

describe('GET /api/suppliers/:id', () => {
  it('devuelve 200 con el proveedor y where: { id, accountId }', async () => {
    const supplier = { id: 's-1', accountId: 'account-1', name: 'Proveedor' };
    findFirstMock.mockResolvedValue(supplier);

    const res = await request(buildApp()).get('/api/suppliers/s-1');

    expect(res.status).toBe(200);
    expect(res.body.supplier).toEqual(supplier);
    expect(findFirstMock).toHaveBeenCalledWith({ where: { id: 's-1', accountId: 'account-1' } });
  });

  it('devuelve 404 si no existe o es de otra cuenta', async () => {
    findFirstMock.mockResolvedValue(null);

    const res = await request(buildApp()).get('/api/suppliers/s-ajeno');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Proveedor no encontrado.' });
  });
});

describe('PUT /api/suppliers/:id', () => {
  it('devuelve 400 si el Content-Type no es application/json', async () => {
    const res = await request(buildApp())
      .put('/api/suppliers/s-1')
      .set('Content-Type', 'text/plain')
      .send('esto no es json');

    expect(res.status).toBe(400);
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it('devuelve 404 si no existe o es de otra cuenta, sin llamar a update', async () => {
    findFirstMock.mockResolvedValue(null);

    const res = await request(buildApp())
      .put('/api/suppliers/s-ajeno')
      .send({ name: 'Proveedor' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Proveedor no encontrado.' });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('un update parcial conserva los campos no enviados', async () => {
    const existing = {
      id: 's-1',
      accountId: 'account-1',
      name: 'Original',
      contactPhone: '123456',
      email: 'viejo@correo.com',
      address: 'Calle Falsa 123',
      isActive: true,
    };
    findFirstMock
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(null);
    updateMock.mockResolvedValue({ ...existing, name: 'Nuevo' });

    const res = await request(buildApp())
      .put('/api/suppliers/s-1')
      .send({ name: 'Nuevo' });

    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 's-1' },
      data: {
        name: 'Nuevo',
        contactPhone: '123456',
        email: 'viejo@correo.com',
        address: 'Calle Falsa 123',
        isActive: true,
      },
    });
  });

  it('contactPhone: "" limpia el campo (queda null)', async () => {
    const existing = { id: 's-1', accountId: 'account-1', name: 'Original', contactPhone: '111', email: null, address: null, isActive: true };
    findFirstMock.mockResolvedValue(existing);
    updateMock.mockResolvedValue({ ...existing, contactPhone: null });

    const res = await request(buildApp())
      .put('/api/suppliers/s-1')
      .send({ contactPhone: '' });

    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 's-1' },
      data: expect.objectContaining({ contactPhone: null }),
    });
  });

  it('contactPhone: null limpia el campo (queda null)', async () => {
    const existing = { id: 's-1', accountId: 'account-1', name: 'Original', contactPhone: '111', email: null, address: null, isActive: true };
    findFirstMock.mockResolvedValue(existing);
    updateMock.mockResolvedValue({ ...existing, contactPhone: null });

    const res = await request(buildApp())
      .put('/api/suppliers/s-1')
      .send({ contactPhone: null });

    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 's-1' },
      data: expect.objectContaining({ contactPhone: null }),
    });
  });

  it('isActive: false se respeta', async () => {
    const existing = { id: 's-1', accountId: 'account-1', name: 'Original', contactPhone: null, email: null, address: null, isActive: true };
    findFirstMock.mockResolvedValue(existing);
    updateMock.mockResolvedValue({ ...existing, isActive: false });

    const res = await request(buildApp())
      .put('/api/suppliers/s-1')
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 's-1' },
      data: expect.objectContaining({ isActive: false }),
    });
  });

  it('isActive: "false" devuelve 400', async () => {
    const existing = { id: 's-1', accountId: 'account-1', name: 'Original', contactPhone: null, email: null, address: null, isActive: true };
    findFirstMock.mockResolvedValue(existing);

    const res = await request(buildApp())
      .put('/api/suppliers/s-1')
      .send({ isActive: 'false' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El campo "isActive" debe ser booleano.');
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('devuelve 409 si el nuevo nombre ya existe en la cuenta', async () => {
    const existing = { id: 's-1', accountId: 'account-1', name: 'Original', contactPhone: null, email: null, address: null, isActive: true };
    findFirstMock
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce({ id: 's-2', accountId: 'account-1', name: 'Nuevo' });

    const res = await request(buildApp())
      .put('/api/suppliers/s-1')
      .send({ name: 'Nuevo' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Ya existe un proveedor con ese nombre.');
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('no chequea duplicado si el nombre no cambia aunque cambien mayúsculas', async () => {
    const existing = { id: 's-1', accountId: 'account-1', name: 'Original', contactPhone: null, email: null, address: null, isActive: true };
    findFirstMock.mockResolvedValue(existing);
    updateMock.mockResolvedValue({ ...existing, name: 'original' });

    const res = await request(buildApp())
      .put('/api/suppliers/s-1')
      .send({ name: 'original' });

    expect(res.status).toBe(200);
    expect(findFirstMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 's-1' },
      data: expect.objectContaining({ name: 'original' }),
    });
  });
});

describe('DELETE /api/suppliers/:id', () => {
  it('devuelve 404 si no pertenece a la cuenta, sin llamar a delete', async () => {
    findFirstMock.mockResolvedValue(null);

    const res = await request(buildApp()).delete('/api/suppliers/s-ajeno');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Proveedor no encontrado.' });
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('elimina y responde { message: "Proveedor eliminado correctamente." }', async () => {
    findFirstMock.mockResolvedValue({ id: 's-1', accountId: 'account-1' });
    deleteMock.mockResolvedValue({ id: 's-1' });

    const res = await request(buildApp()).delete('/api/suppliers/s-1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Proveedor eliminado correctamente.' });
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: 's-1' } });
  });
});
