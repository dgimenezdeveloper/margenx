import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth';
import { errorHandler } from '../middlewares/errorHandler';

const authState = vi.hoisted(() => ({
  authenticated: true,
  role: 'ADMIN' as 'ADMIN' | 'COLLABORATOR',
  accountId: 'acc-panaderia',
}));

vi.mock('../middlewares/auth', () => ({
  authMiddleware: (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!authState.authenticated) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }
    req.user = {
      id: 'user-1',
      accountId: authState.accountId,
      email: 'admin.panaderia@seed.example.test',
      role: authState.role,
    };
    next();
  },
}));

const buildWeeklyMarginReportMock = vi.fn();
vi.mock('../services/reportService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/reportService')>();
  return {
    ...actual,
    buildWeeklyMarginReport: (...args: unknown[]) => buildWeeklyMarginReportMock(...args),
  };
});

import reportsRouter from './reports';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/reports', reportsRouter);
  app.use(errorHandler);
  return app;
}

const SAMPLE_REPORT = {
  account: {
    id: 'acc-panaderia',
    businessName: 'Panadería Central',
    slug: 'panaderia-central',
    defaultMinMarginPercent: '30.00',
  },
  period: {
    from: '2026-11-10T03:00:00.000Z',
    to: '2026-11-17T03:00:00.000Z',
    timezone: 'America/Argentina/Buenos_Aires',
    fromFormatted: '10/11/2026',
    toFormatted: '17/11/2026',
  },
  generatedAt: '2026-11-17T15:00:00.000Z',
  catalogHealth: {
    totalProducts: 10,
    activeIngredientsCount: 10,
    criticalProductsCount: 1,
    healthyProductsCount: 9,
    averageMarginPercent: 60.5,
    lossCount: 0,
    riskCount: 1,
    targetCount: 4,
    surplusCount: 5,
    draftCount: 0,
  },
  belowMinimumProducts: { totalCount: 1, items: [] },
  weeklyCostChanges: { totalCount: 0, items: [] },
  quarantine: { totalCount: 0, items: [] },
  purchasingSavings: { totalCount: 0, items: [] },
  staleCosts: { totalCount: 0, thresholdDays: 30, items: [] },
};

describe('rutas de reportes para la app', () => {
  beforeEach(() => {
    authState.authenticated = true;
    authState.role = 'ADMIN';
    authState.accountId = 'acc-panaderia';
    process.env.N8N_REPORT_PDF_WEBHOOK_URL = 'https://n8n.example.test/webhook/report-pdf';
    process.env.INTERNAL_WEBHOOK_SECRET = 'secreto-pdf-test';
    buildWeeklyMarginReportMock.mockReset();
    buildWeeklyMarginReportMock.mockResolvedValue(SAMPLE_REPORT);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    delete process.env.N8N_REPORT_PDF_WEBHOOK_URL;
    delete process.env.INTERNAL_WEBHOOK_SECRET;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('requiere autenticación y rol ADMIN para JSON y PDF', async () => {
    authState.authenticated = false;
    const unauthenticatedApp = buildApp();
    expect((await request(unauthenticatedApp).get('/api/reports/weekly')).status).toBe(401);
    expect((await request(unauthenticatedApp).get('/api/reports/weekly.pdf')).status).toBe(401);

    authState.authenticated = true;
    authState.role = 'COLLABORATOR';
    const collaboratorApp = buildApp();
    const jsonResponse = await request(collaboratorApp).get('/api/reports/weekly');
    const pdfResponse = await request(collaboratorApp).get('/api/reports/weekly.pdf');
    expect(jsonResponse.status).toBe(403);
    expect(jsonResponse.body.error).toBe('Acceso denegado. Se requiere rol ADMIN.');
    expect(pdfResponse.status).toBe(403);
    expect(buildWeeklyMarginReportMock).not.toHaveBeenCalled();
  });

  it('devuelve el reporte JSON de la cuenta del usuario autenticado', async () => {
    const response = await request(buildApp()).get('/api/reports/weekly');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(SAMPLE_REPORT);
    expect(buildWeeklyMarginReportMock).toHaveBeenCalledWith('acc-panaderia', {
      from: undefined,
      to: undefined,
    });
  });

  it('devuelve PDF con encabezados de descarga y timeout de 20 segundos', async () => {
    const pdf = Buffer.from('%PDF-1.4\n%MargenX Panaderia Central\n%%EOF');
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () =>
        pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength),
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await request(buildApp()).get('/api/reports/weekly.pdf');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/pdf/);
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="margenx-reporte-2026-11-17.pdf"'
    );
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(Buffer.from(response.body).toString('utf8')).toContain('%PDF-1.4');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://n8n.example.test/webhook/report-pdf');
    expect(init).toMatchObject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-margenx-webhook-secret': 'secreto-pdf-test',
      },
    });
    expect(JSON.parse(init.body as string)).toEqual(SAMPLE_REPORT);
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(timeoutSpy).toHaveBeenCalledWith(20_000);
  });

  it('traduce fallos de red, respuestas de error y contenido vacío en 503 genérico', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('The operation timed out', 'TimeoutError'))
    );
    const timeoutResponse = await request(buildApp()).get('/api/reports/weekly.pdf');
    expect(timeoutResponse.status).toBe(503);
    expect(timeoutResponse.body.error).toBe(
      'No pudimos generar el reporte PDF en este momento. Probá de nuevo en unos minutos.'
    );
    expect(JSON.stringify(timeoutResponse.body)).not.toMatch(
      /TimeoutError|n8n\.example|secreto|ENOTFOUND/i
    );

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' })
    );
    const serverErrorResponse = await request(buildApp()).get('/api/reports/weekly.pdf');
    expect(serverErrorResponse.status).toBe(503);
    expect(serverErrorResponse.body.error).not.toMatch(/500|n8n|Internal Server Error/i);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: async () => new ArrayBuffer(0),
      })
    );
    expect((await request(buildApp()).get('/api/reports/weekly.pdf')).status).toBe(503);
  });

  it('rechaza con 503 genérico si n8n responde 200 con JSON, HTML o contenido sin firma PDF', async () => {
    const jsonPayload = Buffer.from('{"message":"Workflow was started"}');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        arrayBuffer: async () =>
          jsonPayload.buffer.slice(
            jsonPayload.byteOffset,
            jsonPayload.byteOffset + jsonPayload.byteLength
          ),
      })
    );
    const jsonResponse = await request(buildApp()).get('/api/reports/weekly.pdf');
    expect(jsonResponse.status).toBe(503);
    expect(jsonResponse.body.error).toBe(
      'No pudimos generar el reporte PDF en este momento. Probá de nuevo en unos minutos.'
    );
    expect(JSON.stringify(jsonResponse.body)).not.toMatch(/Workflow|json|n8n/i);

    const htmlPayload = Buffer.from('<html>Error de proxy</html>');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/pdf' }),
        arrayBuffer: async () =>
          htmlPayload.buffer.slice(
            htmlPayload.byteOffset,
            htmlPayload.byteOffset + htmlPayload.byteLength
          ),
      })
    );
    const htmlResponse = await request(buildApp()).get('/api/reports/weekly.pdf');
    expect(htmlResponse.status).toBe(503);
    expect(htmlResponse.body.error).toBe(
      'No pudimos generar el reporte PDF en este momento. Probá de nuevo en unos minutos.'
    );
  });

  it('falla en modo cerrado y no llama a n8n si falta URL o secreto', async () => {
    delete process.env.N8N_REPORT_PDF_WEBHOOK_URL;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const noUrl = await request(buildApp()).get('/api/reports/weekly.pdf');
    expect(noUrl.status).toBe(503);
    expect(noUrl.body.error).not.toMatch(/N8N_REPORT_PDF_WEBHOOK_URL/);
    expect(fetchMock).not.toHaveBeenCalled();

    process.env.N8N_REPORT_PDF_WEBHOOK_URL = 'https://n8n.example.test/webhook/report-pdf';
    delete process.env.INTERNAL_WEBHOOK_SECRET;
    const noSecret = await request(buildApp()).get('/api/reports/weekly.pdf');
    expect(noSecret.status).toBe(503);
    expect(noSecret.body.error).not.toMatch(/INTERNAL_WEBHOOK_SECRET/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
