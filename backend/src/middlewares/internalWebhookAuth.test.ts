import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import {
  hasValidInternalWebhookSecret,
  internalWebhookAuthMiddleware,
} from './internalWebhookAuth';

function buildMocks(headerSecret?: string) {
  const req = {
    get: vi.fn((name: string) =>
      name.toLowerCase() === 'x-margenx-webhook-secret' ? headerSecret : undefined
    ),
  } as unknown as Request;
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const res = { status } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next, status, json };
}

describe('internalWebhookAuthMiddleware', () => {
  beforeEach(() => {
    process.env.INTERNAL_WEBHOOK_SECRET = 'secreto-interno-de-prueba';
  });

  afterEach(() => {
    delete process.env.INTERNAL_WEBHOOK_SECRET;
  });

  it('responde 401 si falta la cabecera secreta', () => {
    const { req, res, next, status, json } = buildMocks(undefined);

    internalWebhookAuthMiddleware(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('responde 401 si el secreto no está configurado', () => {
    delete process.env.INTERNAL_WEBHOOK_SECRET;
    const { req, res, next, status } = buildMocks('secreto-interno-de-prueba');

    internalWebhookAuthMiddleware(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rechaza secretos de longitud distinta o con contenido distinto', () => {
    const short = buildMocks('corto');
    internalWebhookAuthMiddleware(short.req, short.res, short.next);
    expect(short.status).toHaveBeenCalledWith(401);

    const sameLengthWrong = buildMocks('Xecreto-interno-de-prueba');
    internalWebhookAuthMiddleware(sameLengthWrong.req, sameLengthWrong.res, sameLengthWrong.next);
    expect(sameLengthWrong.status).toHaveBeenCalledWith(401);
  });

  it('acepta el secreto exacto y continúa el middleware', () => {
    const { req, res, next, status } = buildMocks('secreto-interno-de-prueba');

    expect(hasValidInternalWebhookSecret(req)).toBe(true);
    internalWebhookAuthMiddleware(req, res, next);

    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
