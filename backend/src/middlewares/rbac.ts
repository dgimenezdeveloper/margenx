import { AppError } from './errorHandler';
import type { Role } from '@prisma/client';
import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from './auth';

export const FINANCIAL_FIELDS = new Set([
  'cost',
  'marginAmount',
  'marginPercent',
  'minMarginPercent',
  'defaultMinMarginPercent',
  'currentCost',
  'oldCost',
  'newCost',
  'packagePrice',
  'packageSize',
  'unitCost',
  'suppliers',
]);

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function stripFinancialFields(body: unknown): unknown {
  if (body === undefined) {
    return body;
  }

  return JSON.parse(
    JSON.stringify(body, (key, value) => (FINANCIAL_FIELDS.has(key) ? undefined : value))
  );
}

function formatRequiredRoles(allowedRoles: Role[]): string {
  if (allowedRoles.length === 0) {
    return 'un rol válido';
  }

  if (allowedRoles.length === 1) {
    return allowedRoles[0]!;
  }

  return `${allowedRoles.slice(0, -1).join(', ')} o ${allowedRoles[allowedRoles.length - 1]}`;
}

export function requireRole(allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('No autorizado', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(`Acceso denegado. Se requiere rol ${formatRequiredRoles(allowedRoles)}.`, 403));
    }

    return next();
  };
}

export function blockCollaboratorMutations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError('No autorizado', 401));
  }

  if (req.user.role === 'ADMIN' || SAFE_METHODS.has(req.method)) {
    return next();
  }

  return requireRole(['ADMIN'])(req, res, next);
}

export function sanitizeFinancialData(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'COLLABORATOR') {
    return next();
  }

  res.setHeader('Cache-Control', 'private, no-store');

  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => originalJson(stripFinancialFields(body))) as typeof res.json;

  return next();
}
