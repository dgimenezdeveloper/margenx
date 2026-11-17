import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { AppError, errorHandler } from '../middlewares/errorHandler';

const getActiveReportAccountsMock = vi.fn();
const getWeeklyMarginReportBySlugMock = vi.fn();

vi.mock('../services/reportService', () => ({
  getActiveReportAccounts: (...args: unknown[]) => getActiveReportAccountsMock(...args),
  getWeeklyMarginReportBySlug: (...args: unknown[]) =>
    getWeeklyMarginReportBySlugMock(...args),
}));

import internalReportsRouter from './internalReports';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/internal/reports', internalReportsRouter);
  app.use(errorHandler);
  return app;
}

describe('rutas internas de reportes', () => {
  beforeEach(() => {
    process.env.INTERNAL_WEBHOOK_SECRET = 'internal-test-secret';
    getActiveReportAccountsMock.mockReset();
    getWeeklyMarginReportBySlugMock.mockReset();
  });

  afterEach(() => {
    delete process.env.INTERNAL_WEBHOOK_SECRET;
  });

  it('rechaza solicitudes sin secreto o con secreto inválido', async () => {
    const app = buildApp();
    const noSecret = await request(app).get('/api/internal/reports/accounts');
    const badSecret = await request(app)
      .get('/api/internal/reports/weekly/panaderia-central')
      .set('x-margenx-webhook-secret', 'malo');

    expect(noSecret.status).toBe(401);
    expect(noSecret.body.error).toBe('Unauthorized');
    expect(badSecret.status).toBe(401);
    expect(getActiveReportAccountsMock).not.toHaveBeenCalled();
    expect(getWeeklyMarginReportBySlugMock).not.toHaveBeenCalled();
  });

  it('lista las cuentas activas', async () => {
    const accounts = [{
      id: 'acc-1',
      slug: 'panaderia-central',
      businessName: 'Panadería Central',
      ownerEmail: 'admin.panaderia@seed.example.test',
    }];
    getActiveReportAccountsMock.mockResolvedValue(accounts);

    const response = await request(buildApp())
      .get('/api/internal/reports/accounts')
      .set('x-margenx-webhook-secret', 'internal-test-secret');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ accounts });
  });

  it('propaga 404 para un slug inexistente o una cuenta inactiva', async () => {
    getWeeklyMarginReportBySlugMock.mockRejectedValue(
      new AppError('No existe una cuenta activa para el slug indicado.', 404)
    );

    const response = await request(buildApp())
      .get('/api/internal/reports/weekly/slug-inexistente')
      .set('x-margenx-webhook-secret', 'internal-test-secret');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('No existe una cuenta activa para el slug indicado.');
  });

  it('rechaza fechas inválidas y entrega el reporte por slug válido', async () => {
    const app = buildApp();
    const headers = { 'x-margenx-webhook-secret': 'internal-test-secret' };
    const invalid = await request(app)
      .get('/api/internal/reports/weekly/panaderia-central?from=no-fecha')
      .set(headers);
    expect(invalid.status).toBe(400);
    expect(getWeeklyMarginReportBySlugMock).not.toHaveBeenCalled();

    const report = { account: { slug: 'panaderia-central' }, catalogHealth: { totalProducts: 10 } };
    getWeeklyMarginReportBySlugMock.mockResolvedValue(report);
    const valid = await request(app)
      .get('/api/internal/reports/weekly/panaderia-central')
      .set(headers);

    expect(valid.status).toBe(200);
    expect(valid.body).toEqual(report);
    expect(getWeeklyMarginReportBySlugMock).toHaveBeenCalledWith('panaderia-central', {
      from: undefined,
      to: undefined,
    });
  });

  it('rechaza un parámetro de fecha repetido', async () => {
    const response = await request(buildApp())
      .get('/api/internal/reports/weekly/panaderia-central?from=2026-11-10&from=2026-11-11')
      .set('x-margenx-webhook-secret', 'internal-test-secret');

    expect(response.status).toBe(400);
  });
});
