import type { NextFunction, Response } from 'express';
import { prisma } from './prisma';
import { AppError } from '../middlewares/errorHandler';
import type { AuthenticatedRequest } from '../middlewares/auth';

/**
 * Control de módulos por plan y por cuenta (ADR-010).
 *
 * Un módulo está prendido para una cuenta si tiene una excepción en `AccountFeature`
 * que lo prende, o si no tiene excepción y su plan lo trae. Las excepciones
 * mandan sobre el plan, en los dos sentidos.
 */
export const FEATURES = ['sales'] as const;
export type Feature = (typeof FEATURES)[number];
export type FeatureFlags = Record<Feature, boolean>;

/**
 * Módulos que trae cada plan, sobre `Account.subscriptionPlan`.
 * Hoy ningún plan trae módulos: qué plan incluye cada uno se decide en la v1.2,
 * con los planes pagos (propuesta abierta en ADR-010). Mientras tanto, los módulos
 * se prenden por cuenta con `AccountFeature`.
 */
export const PLAN_FEATURES: Readonly<Record<string, readonly Feature[]>> = {
  FREE: [],
  BASIC: [],
  PRO: [],
  BUSINESS: [],
};

export interface FeatureSource {
  subscriptionPlan: string;
  exceptions: ReadonlyArray<{ feature: string; enabled: boolean }>;
}

function isFeature(value: string): value is Feature {
  return (FEATURES as readonly string[]).includes(value);
}

export function hasFeature(
  source: FeatureSource,
  feature: Feature,
  planFeatures: Readonly<Record<string, readonly Feature[]>> = PLAN_FEATURES
): boolean {
  const exception = source.exceptions.find((row) => row.feature === feature);
  if (exception) {
    return exception.enabled;
  }
  // Un plan desconocido no trae módulos.
  return (planFeatures[source.subscriptionPlan] ?? []).includes(feature);
}

export function resolveFeatures(
  source: FeatureSource,
  planFeatures: Readonly<Record<string, readonly Feature[]>> = PLAN_FEATURES
): FeatureFlags {
  const exceptions = source.exceptions.filter((row) => isFeature(row.feature));
  return Object.fromEntries(
    FEATURES.map((feature) => [feature, hasFeature({ ...source, exceptions }, feature, planFeatures)])
  ) as FeatureFlags;
}

const NO_FEATURES: FeatureSource = { subscriptionPlan: '', exceptions: [] };

/** Módulos de la cuenta, con una sola consulta acotada por su id. */
export async function getAccountFeatures(accountId: string): Promise<FeatureFlags> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { subscriptionPlan: true, features: { select: { feature: true, enabled: true } } },
  });

  if (!account) {
    return resolveFeatures(NO_FEATURES);
  }

  return resolveFeatures({ subscriptionPlan: account.subscriptionPlan, exceptions: account.features });
}

/**
 * Con el módulo apagado, la ruta responde 404, como si no existiera (ADR-010).
 * Va después de `authMiddleware`: la cuenta sale de `req.user`, nunca del cliente.
 */
export function requireFeature(feature: Feature) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('No autorizado', 401));
    }

    const features = await getAccountFeatures(req.user.accountId);
    if (!features[feature]) {
      return next(new AppError('Recurso no encontrado.', 404));
    }

    return next();
  };
}
