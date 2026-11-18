import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/** Valida el secreto interno con comparación en tiempo constante y cierre seguro. */
export function hasValidInternalWebhookSecret(req: Request): boolean {
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

export function internalWebhookAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!hasValidInternalWebhookSecret(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
