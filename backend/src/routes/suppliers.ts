import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';

const router = Router();
router.use(authMiddleware);

function getIdParam(rawId: string | string[] | undefined): string {
  if (Array.isArray(rawId)) {
    return rawId[0] ?? '';
  }
  return rawId ?? '';
}

interface SupplierInputDTO {
  name?: unknown;
  contactPhone?: unknown;
  email?: unknown;
  address?: unknown;
  isActive?: unknown;
}

function normalizeOptionalText(value: unknown, field: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim() || null;
  }

  throw new AppError(`El campo "${field}" debe ser un texto.`, 400);
}

function parseSupplierInput(body: SupplierInputDTO) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    throw new AppError('El campo "name" es obligatorio.', 400);
  }

  const contactPhone = normalizeOptionalText(body.contactPhone, 'contactPhone');

  const email = normalizeOptionalText(body.email, 'email');
  if (email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError('El campo "email" debe tener un formato válido.', 400);
  }

  const address = normalizeOptionalText(body.address, 'address');

  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
    throw new AppError('El campo "isActive" debe ser booleano.', 400);
  }

  const isActive = body.isActive === undefined ? true : body.isActive;

  return {
    name,
    contactPhone,
    email,
    address,
    isActive,
  };
}

/* ------------------------------------------------------------------ */
/* GET /api/suppliers                                                   */
/* Lista los proveedores de la cuenta autenticada.                     */
/* 200 OK | 401 No autenticado | 500                                     */
/* ------------------------------------------------------------------ */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;

  const suppliers = await prisma.supplier.findMany({
    where: { accountId },
    orderBy: { name: 'asc' },
  });

  return res.status(200).json({ suppliers });
});

/* ------------------------------------------------------------------ */
/* POST /api/suppliers                                                  */
/* Crea un proveedor asignando accountId automáticamente.             */
/* 201 Created | 400 Validación fallida | 401 No autenticado | 409 Duplicado | 500 */
/* ------------------------------------------------------------------ */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const payload = req.body && typeof req.body === 'object' ? (req.body as SupplierInputDTO) : {};
  const data = parseSupplierInput(payload);

  const existing = await prisma.supplier.findFirst({
    where: { accountId, name: { equals: data.name, mode: 'insensitive' } },
  });

  if (existing) {
    throw new AppError('Ya existe un proveedor con ese nombre.', 409);
  }

  const supplier = await prisma.supplier.create({
    data: {
      ...data,
      accountId,
    },
  });

  return res.status(201).json({ supplier });
});

/* ------------------------------------------------------------------ */
/* GET /api/suppliers/:id                                              */
/* Detalle de un proveedor, filtrado por cuenta.                       */
/* 200 OK | 401 No autenticado | 404 No encontrado/ajeno | 500         */
/* ------------------------------------------------------------------ */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const id = getIdParam(req.params.id);
  if (!id) {
    throw new AppError('Proveedor no encontrado.', 404);
  }

  const supplier = await prisma.supplier.findFirst({
    where: { id, accountId },
  });

  if (!supplier) {
    throw new AppError('Proveedor no encontrado.', 404);
  }

  return res.status(200).json({ supplier });
});

/* ------------------------------------------------------------------ */
/* PUT /api/suppliers/:id                                              */
/* Actualiza un proveedor, filtrado por cuenta y mergeando campos.      */
/* 200 OK | 400 Validación fallida | 401 No autenticado | 404 No encontrado/ajeno | 500 */
/* ------------------------------------------------------------------ */
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.is('application/json')) {
    throw new AppError('El header Content-Type debe ser application/json.', 400);
  }

  const accountId = req.user!.accountId;
  const id = getIdParam(req.params.id);
  if (!id) {
    throw new AppError('Proveedor no encontrado.', 404);
  }

  const existing = await prisma.supplier.findFirst({
    where: { id, accountId },
  });

  if (!existing) {
    throw new AppError('Proveedor no encontrado.', 404);
  }

  const payload = req.body && typeof req.body === 'object' ? (req.body as SupplierInputDTO) : {};
  const merged = {
    name: existing.name,
    contactPhone: existing.contactPhone,
    email: existing.email,
    address: existing.address,
    isActive: existing.isActive,
    ...payload,
  };
  const data = parseSupplierInput(merged);

  if (data.name.toLowerCase() !== existing.name.toLowerCase()) {
    const duplicate = await prisma.supplier.findFirst({
      where: { accountId, name: { equals: data.name, mode: 'insensitive' } },
    });

    if (duplicate) {
      throw new AppError('Ya existe un proveedor con ese nombre.', 409);
    }
  }

  const supplier = await prisma.supplier.update({
    where: { id },
    data,
  });

  return res.status(200).json({ supplier });
});

/* ------------------------------------------------------------------ */
/* DELETE /api/suppliers/:id                                            */
/* Elimina un proveedor. SupplierIngredient se elimina en cascada (onDelete: Cascade) pero los insumos NO. */
/* 200 OK | 401 No autenticado | 404 No encontrado/ajeno | 500         */
/* ------------------------------------------------------------------ */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const accountId = req.user!.accountId;
  const id = getIdParam(req.params.id);
  if (!id) {
    throw new AppError('Proveedor no encontrado.', 404);
  }

  const existing = await prisma.supplier.findFirst({
    where: { id, accountId },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError('Proveedor no encontrado.', 404);
  }

  await prisma.supplier.delete({ where: { id } });

  return res.status(200).json({ message: 'Proveedor eliminado correctamente.' });
});

export default router;
