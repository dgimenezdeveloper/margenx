import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { ClerkAPIResponseError } from '@clerk/backend/errors';
import { errorHandler } from '../middlewares/errorHandler';

const QUIMICA_ID = 'acc-quimica';
const PANADERIA_ID = 'acc-panaderia';

const clerk = vi.hoisted(() => ({
  createInvitation: vi.fn(),
  getInvitationList: vi.fn(),
  revokeInvitation: vi.fn(),
  deleteUser: vi.fn(),
}));
vi.mock('../lib/clerk', () => ({
  getClerkClient: () => ({
    invitations: {
      createInvitation: clerk.createInvitation,
      getInvitationList: clerk.getInvitationList,
      revokeInvitation: clerk.revokeInvitation,
    },
    users: { deleteUser: clerk.deleteUser },
  }),
}));

const db = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  deleteMany: vi.fn(),
}));
vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: db.findUnique,
      findFirst: db.findFirst,
      findMany: db.findMany,
      deleteMany: db.deleteMany,
    },
  },
}));

type TestUser = { id: string; accountId: string; email: string; role: 'ADMIN' | 'COLLABORATOR' };
let currentUser: TestUser;
vi.mock('../middlewares/auth', () => ({
  authMiddleware: (req: { user?: TestUser }, _res: unknown, next: () => void) => {
    req.user = currentUser;
    next();
  },
}));

import collaboratorsRouter from './collaborators';

const ADMIN_QUIMICA: TestUser = {
  id: 'u-admin-quimica',
  accountId: QUIMICA_ID,
  email: 'gustavo@quimicagyj.com.ar',
  role: 'ADMIN',
};
const COLLAB_QUIMICA: TestUser = {
  id: 'u-repositor-quimica',
  accountId: QUIMICA_ID,
  email: 'repositor.quimica@gmail.com',
  role: 'COLLABORATOR',
};

function invitation(id: string, email: string, accountId: string, createdAt = Date.UTC(2026, 10, 16, 12)) {
  return { id, emailAddress: email, publicMetadata: { accountId, role: 'COLLABORATOR' }, createdAt, status: 'pending' };
}

function clerkError(status: number, code: string) {
  return new ClerkAPIResponseError('Clerk error', {
    status,
    data: [{ code, message: code, long_message: code, meta: {} }],
  });
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', collaboratorsRouter);
  app.use(errorHandler);
  return app;
}

describe('Rutas de colaboradores (/api/auth)', () => {
  const app = buildApp();
  const originalBaseUrl = process.env.APP_BASE_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = ADMIN_QUIMICA;
    process.env.APP_BASE_URL = 'https://dev.margenx.tech';
    clerk.getInvitationList.mockResolvedValue({ data: [], totalCount: 0 });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    if (originalBaseUrl === undefined) delete process.env.APP_BASE_URL;
    else process.env.APP_BASE_URL = originalBaseUrl;
  });

  describe('RBAC: el colaborador no gestiona el equipo', () => {
    it.each([
      ['post', '/api/auth/invitations'],
      ['get', '/api/auth/invitations'],
      ['delete', '/api/auth/invitations/inv_1'],
      ['get', '/api/auth/users'],
      ['delete', '/api/auth/users/u-otro'],
    ] as const)('%s %s responde 403', async (method, path) => {
      currentUser = COLLAB_QUIMICA;
      const res = await request(app)[method](path).send({ email: 'cajera.quimica@gmail.com' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Se requiere rol ADMIN/);
      expect(clerk.createInvitation).not.toHaveBeenCalled();
      expect(clerk.revokeInvitation).not.toHaveBeenCalled();
      expect(clerk.deleteUser).not.toHaveBeenCalled();
      expect(db.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/invitations', () => {
    it('crea la invitación con la cuenta del ADMIN autenticado y responde 201', async () => {
      db.findUnique.mockResolvedValue(null);
      clerk.createInvitation.mockResolvedValue(
        invitation('inv_cajera', 'cajera.quimica@gmail.com', QUIMICA_ID)
      );

      const res = await request(app)
        .post('/api/auth/invitations')
        .send({ email: '  Cajera.Quimica@Gmail.com ' });

      expect(res.status).toBe(201);
      expect(res.body.invitation).toEqual({
        id: 'inv_cajera',
        email: 'cajera.quimica@gmail.com',
        createdAt: '2026-11-16T12:00:00.000Z',
      });
      expect(clerk.createInvitation).toHaveBeenCalledWith({
        emailAddress: 'cajera.quimica@gmail.com',
        publicMetadata: { accountId: QUIMICA_ID, role: 'COLLABORATOR' },
        redirectUrl: 'https://dev.margenx.tech/login',
        notify: true,
      });
    });

    it('sin APP_BASE_URL válida no manda redirectUrl (Clerk usa su portal)', async () => {
      process.env.APP_BASE_URL = 'dev.margenx.tech';
      db.findUnique.mockResolvedValue(null);
      clerk.createInvitation.mockResolvedValue(invitation('inv_1', 'cajera.quimica@gmail.com', QUIMICA_ID));

      await request(app).post('/api/auth/invitations').send({ email: 'cajera.quimica@gmail.com' });

      expect(clerk.createInvitation.mock.calls[0]?.[0]).not.toHaveProperty('redirectUrl');
    });

    it('quita la barra final de APP_BASE_URL', async () => {
      process.env.APP_BASE_URL = 'https://margenx.tech/';
      db.findUnique.mockResolvedValue(null);
      clerk.createInvitation.mockResolvedValue(invitation('inv_1', 'cajera.quimica@gmail.com', QUIMICA_ID));

      await request(app).post('/api/auth/invitations').send({ email: 'cajera.quimica@gmail.com' });

      expect(clerk.createInvitation.mock.calls[0]?.[0].redirectUrl).toBe('https://margenx.tech/login');
    });

    it.each([
      ['sin correo', {}],
      ['correo inválido', { email: 'cajera-quimica' }],
      ['correo no textual', { email: 42 }],
    ])('responde 400 con %s', async (_caso, body) => {
      const res = await request(app).post('/api/auth/invitations').send(body);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Ingresá un correo electrónico válido.');
      expect(clerk.createInvitation).not.toHaveBeenCalled();
    });

    it.each([
      ['accountId', { email: 'cajera.quimica@gmail.com', accountId: PANADERIA_ID }],
      ['role', { email: 'cajera.quimica@gmail.com', role: 'ADMIN' }],
    ])('responde 400 si el cliente manda %s (la cuenta y el rol los fija el servidor)', async (_campo, body) => {
      const res = await request(app).post('/api/auth/invitations').send(body);

      expect(res.status).toBe(400);
      expect(clerk.createInvitation).not.toHaveBeenCalled();
    });

    it('responde 409 si el correo ya tiene usuario en MargenX', async () => {
      db.findUnique.mockResolvedValue({ id: 'u-existente' });

      const res = await request(app)
        .post('/api/auth/invitations')
        .send({ email: 'repositor.quimica@gmail.com' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Ese correo ya tiene un usuario en MargenX.');
      expect(db.findUnique).toHaveBeenCalledWith({
        where: { email: 'repositor.quimica@gmail.com' },
        select: { id: true },
      });
      expect(clerk.createInvitation).not.toHaveBeenCalled();
    });

    it('responde 409 si ya hay una invitación pendiente para ese correo', async () => {
      db.findUnique.mockResolvedValue(null);
      clerk.getInvitationList.mockResolvedValue({
        data: [invitation('inv_previa', 'cajera.quimica@gmail.com', QUIMICA_ID)],
        totalCount: 1,
      });

      const res = await request(app)
        .post('/api/auth/invitations')
        .send({ email: 'cajera.quimica@gmail.com' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Ya hay una invitación pendiente para ese correo.');
      expect(clerk.getInvitationList).toHaveBeenCalledWith({
        status: 'pending',
        query: 'cajera.quimica@gmail.com',
        limit: 500,
        offset: 0,
      });
      expect(clerk.createInvitation).not.toHaveBeenCalled();
    });

    it('responde 409 si Clerk informa que el correo ya existe', async () => {
      db.findUnique.mockResolvedValue(null);
      clerk.createInvitation.mockRejectedValue(clerkError(422, 'form_identifier_exists'));

      const res = await request(app)
        .post('/api/auth/invitations')
        .send({ email: 'cajera.quimica@gmail.com' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Ese correo ya tiene una cuenta o una invitación pendiente.');
    });

    it('responde 502 si Clerk falla por otro motivo', async () => {
      db.findUnique.mockResolvedValue(null);
      clerk.createInvitation.mockRejectedValue(clerkError(500, 'internal_clerk_error'));

      const res = await request(app)
        .post('/api/auth/invitations')
        .send({ email: 'cajera.quimica@gmail.com' });

      expect(res.status).toBe(502);
      expect(res.body.error).toBe(
        'No pudimos comunicarnos con el servicio de cuentas. Probá de nuevo en unos minutos.'
      );
    });

    it('responde 500 ante un error que no es de Clerk', async () => {
      db.findUnique.mockRejectedValue(new Error('base caída'));

      const res = await request(app)
        .post('/api/auth/invitations')
        .send({ email: 'cajera.quimica@gmail.com' });

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/auth/invitations', () => {
    it('devuelve solo las invitaciones pendientes de la cuenta del ADMIN, recorriendo todas las páginas', async () => {
      const firstPage = [
        invitation('inv_cajera', 'cajera.quimica@gmail.com', QUIMICA_ID),
        invitation('inv_panaderia', 'mostrador@panaderiacentral.com.ar', PANADERIA_ID),
        ...Array.from({ length: 498 }, (_, i) => invitation(`inv_otra_${i}`, `otra${i}@ejemplo.com`, PANADERIA_ID)),
      ];
      const secondPage = [
        invitation('inv_repartidor', 'repartidor.quimica@gmail.com', QUIMICA_ID),
        { ...invitation('inv_sin_meta', 'suelto@ejemplo.com', QUIMICA_ID), publicMetadata: null },
      ];
      clerk.getInvitationList
        .mockResolvedValueOnce({ data: firstPage, totalCount: 502 })
        .mockResolvedValueOnce({ data: secondPage, totalCount: 502 });

      const res = await request(app).get('/api/auth/invitations');

      expect(res.status).toBe(200);
      expect(res.body.invitations.map((i: { id: string }) => i.id)).toEqual(['inv_cajera', 'inv_repartidor']);
      expect(clerk.getInvitationList).toHaveBeenNthCalledWith(1, { status: 'pending', limit: 500, offset: 0 });
      expect(clerk.getInvitationList).toHaveBeenNthCalledWith(2, { status: 'pending', limit: 500, offset: 500 });
    });

    it('responde 502 si Clerk no responde', async () => {
      clerk.getInvitationList.mockRejectedValue(clerkError(503, 'service_unavailable'));

      const res = await request(app).get('/api/auth/invitations');

      expect(res.status).toBe(502);
    });
  });

  describe('DELETE /api/auth/invitations/:id', () => {
    it('revoca una invitación pendiente de la propia cuenta', async () => {
      clerk.getInvitationList.mockResolvedValue({
        data: [invitation('inv_cajera', 'cajera.quimica@gmail.com', QUIMICA_ID)],
        totalCount: 1,
      });
      clerk.revokeInvitation.mockResolvedValue({});

      const res = await request(app).delete('/api/auth/invitations/inv_cajera');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Invitación revocada correctamente.');
      expect(clerk.getInvitationList).toHaveBeenCalledWith({
        status: 'pending',
        query: 'inv_cajera',
        limit: 500,
        offset: 0,
      });
      expect(clerk.revokeInvitation).toHaveBeenCalledWith('inv_cajera');
    });

    it('responde 404 si la invitación es de otra cuenta, sin revocarla', async () => {
      clerk.getInvitationList.mockResolvedValue({
        data: [invitation('inv_panaderia', 'mostrador@panaderiacentral.com.ar', PANADERIA_ID)],
        totalCount: 1,
      });

      const res = await request(app).delete('/api/auth/invitations/inv_panaderia');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('La invitación no existe o ya no está pendiente.');
      expect(clerk.revokeInvitation).not.toHaveBeenCalled();
    });

    it('responde 404 si la invitación no existe o ya no está pendiente', async () => {
      const res = await request(app).delete('/api/auth/invitations/inv_inexistente');

      expect(res.status).toBe(404);
      expect(clerk.revokeInvitation).not.toHaveBeenCalled();
    });

    it('responde 404 si Clerk ya no la encuentra al revocar', async () => {
      clerk.getInvitationList.mockResolvedValue({
        data: [invitation('inv_cajera', 'cajera.quimica@gmail.com', QUIMICA_ID)],
        totalCount: 1,
      });
      clerk.revokeInvitation.mockRejectedValue(clerkError(404, 'resource_not_found'));

      const res = await request(app).delete('/api/auth/invitations/inv_cajera');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/auth/users', () => {
    it('lista los usuarios de la cuenta del ADMIN', async () => {
      const users = [
        { id: ADMIN_QUIMICA.id, email: ADMIN_QUIMICA.email, role: 'ADMIN', createdAt: '2026-08-30T10:00:00.000Z' },
        { id: COLLAB_QUIMICA.id, email: COLLAB_QUIMICA.email, role: 'COLLABORATOR', createdAt: '2026-10-02T10:00:00.000Z' },
      ];
      db.findMany.mockResolvedValue(users);

      const res = await request(app).get('/api/auth/users');

      expect(res.status).toBe(200);
      expect(res.body.users).toEqual(users);
      expect(db.findMany).toHaveBeenCalledWith({
        where: { accountId: QUIMICA_ID },
        select: { id: true, email: true, role: true, createdAt: true },
        orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      });
    });
  });

  describe('DELETE /api/auth/users/:id', () => {
    const target = {
      id: COLLAB_QUIMICA.id,
      role: 'COLLABORATOR',
      authProviderId: 'user_repositor_quimica',
    };

    it('da de baja al colaborador en Clerk y en la base, acotado a la cuenta', async () => {
      db.findFirst.mockResolvedValue(target);
      clerk.deleteUser.mockResolvedValue({});
      db.deleteMany.mockResolvedValue({ count: 1 });

      const res = await request(app).delete(`/api/auth/users/${COLLAB_QUIMICA.id}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Colaborador dado de baja correctamente.');
      expect(db.findFirst).toHaveBeenCalledWith({
        where: { id: COLLAB_QUIMICA.id, accountId: QUIMICA_ID },
        select: { id: true, role: true, authProviderId: true },
      });
      expect(clerk.deleteUser).toHaveBeenCalledWith('user_repositor_quimica');
      expect(db.deleteMany).toHaveBeenCalledWith({ where: { id: COLLAB_QUIMICA.id, accountId: QUIMICA_ID } });
    });

    it('responde 422 si el ADMIN intenta darse de baja a sí mismo', async () => {
      const res = await request(app).delete(`/api/auth/users/${ADMIN_QUIMICA.id}`);

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('No podés darte de baja a vos mismo.');
      expect(db.findFirst).not.toHaveBeenCalled();
      expect(clerk.deleteUser).not.toHaveBeenCalled();
    });

    it('responde 404 si el usuario no existe o es de otra cuenta', async () => {
      db.findFirst.mockResolvedValue(null);

      const res = await request(app).delete('/api/auth/users/u-cajero-panaderia');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('El usuario no existe.');
      expect(clerk.deleteUser).not.toHaveBeenCalled();
      expect(db.deleteMany).not.toHaveBeenCalled();
    });

    it('responde 422 si el destino es otro ADMIN', async () => {
      db.findFirst.mockResolvedValue({ ...target, id: 'u-socio', role: 'ADMIN' });

      const res = await request(app).delete('/api/auth/users/u-socio');

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('Solo se pueden dar de baja colaboradores.');
      expect(clerk.deleteUser).not.toHaveBeenCalled();
    });

    it('si el usuario ya no existe en Clerk, igual lo borra de la base', async () => {
      db.findFirst.mockResolvedValue(target);
      clerk.deleteUser.mockRejectedValue(clerkError(404, 'resource_not_found'));
      db.deleteMany.mockResolvedValue({ count: 1 });

      const res = await request(app).delete(`/api/auth/users/${COLLAB_QUIMICA.id}`);

      expect(res.status).toBe(200);
      expect(db.deleteMany).toHaveBeenCalled();
    });

    it('si Clerk falla, responde 502 y no borra la fila (se puede reintentar)', async () => {
      db.findFirst.mockResolvedValue(target);
      clerk.deleteUser.mockRejectedValue(clerkError(500, 'internal_clerk_error'));

      const res = await request(app).delete(`/api/auth/users/${COLLAB_QUIMICA.id}`);

      expect(res.status).toBe(502);
      expect(db.deleteMany).not.toHaveBeenCalled();
    });
  });
});
