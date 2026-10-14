import crypto from 'node:crypto';
import { Router, Request, Response } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';

const router = Router();

export const supplierPricesIngestSchema = z.object({
  accountSlug: z.string().trim().min(2),
  items: z.array(
    z.object({
      code: z.string().trim().min(1),
      description: z.string().optional(),
      price: z.coerce.number().positive(),
    })
  ).min(1).max(5000),
});

function hasValidInternalSecret(req: Request): boolean {
  const expectedSecret = process.env.INTERNAL_WEBHOOK_SECRET ?? '';
  const incomingSecret = req.get('x-margenx-webhook-secret') ?? '';

  if (!expectedSecret || !incomingSecret) {
    return false;
  }

  const expected = Buffer.from(expectedSecret);
  const actual = Buffer.from(incomingSecret);

  if (expected.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, actual);
}

router.post('/supplier-prices', async (req: Request, res: Response) => {
  if (!hasValidInternalSecret(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parsed = supplierPricesIngestSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return res.status(400).json({
      error: issue?.message ?? 'Payload inválido.',
    });
  }

  const { accountSlug, items } = parsed.data;

  const account = await prisma.account.findUnique({
    where: { slug: accountSlug },
  });

  if (!account || !account.isActive) {
    throw new AppError('No existe una cuenta activa para el slug indicado.', 404);
  }

  return res.status(200).json({
    message: 'Lote de precios recibido correctamente.',
    accountId: account.id,
    processedItems: items.length,
  });
});

export default router;
