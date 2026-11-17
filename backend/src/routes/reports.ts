import { Router, type Response } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { requireRole } from '../middlewares/rbac';
import { buildWeeklyMarginReport, formatArgentinaIsoDate } from '../services/reportService';
import { parseReportRangeQuery } from './internalReports';

const router = Router();

const PDF_WEBHOOK_TIMEOUT_MS = 20_000;
const PDF_SIGNATURE = '%PDF-';
const PDF_UNAVAILABLE_MSG =
  'No pudimos generar el reporte PDF en este momento. Probá de nuevo en unos minutos.';

router.use(authMiddleware);
router.use(requireRole(['ADMIN']));

router.get('/weekly', async (req: AuthenticatedRequest, res: Response) => {
  const range = parseReportRangeQuery(req.query as Record<string, unknown>);
  const report = await buildWeeklyMarginReport(req.user!.accountId, range);
  return res.status(200).json(report);
});

router.get('/weekly.pdf', async (req: AuthenticatedRequest, res: Response) => {
  const webhookUrl = process.env.N8N_REPORT_PDF_WEBHOOK_URL?.trim();
  const webhookSecret = process.env.INTERNAL_WEBHOOK_SECRET?.trim();

  if (!webhookUrl || !webhookSecret) {
    console.error(
      '[WeeklyReportPDF] Falta N8N_REPORT_PDF_WEBHOOK_URL o INTERNAL_WEBHOOK_SECRET: generación PDF deshabilitada.'
    );
    throw new AppError(PDF_UNAVAILABLE_MSG, 503);
  }

  const range = parseReportRangeQuery(req.query as Record<string, unknown>);
  const report = await buildWeeklyMarginReport(req.user!.accountId, range);

  let pdfBuffer: Buffer;
  let responseContentType = '';
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MargenX-Backend-Dispatcher/1.0',
        'x-margenx-webhook-secret': webhookSecret,
      },
      body: JSON.stringify(report),
      signal: AbortSignal.timeout(PDF_WEBHOOK_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(
        `[WeeklyReportPDF] n8n respondió HTTP ${response.status} al generar el PDF de la cuenta ${req.user!.accountId}.`
      );
      throw new AppError(PDF_UNAVAILABLE_MSG, 503);
    }

    responseContentType = response.headers?.get('content-type')?.toLowerCase() ?? '';
    pdfBuffer = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const reason = error instanceof Error ? error.name : 'desconocido';
    console.error(`[WeeklyReportPDF] Error al contactar a n8n (${reason}).`);
    throw new AppError(PDF_UNAVAILABLE_MSG, 503);
  }

  const hasUnexpectedContentType =
    responseContentType !== '' &&
    !responseContentType.includes('application/pdf') &&
    !responseContentType.includes('application/octet-stream');
  const hasPdfSignature =
    pdfBuffer.subarray(0, PDF_SIGNATURE.length).toString('ascii') === PDF_SIGNATURE;

  if (pdfBuffer.length === 0 || hasUnexpectedContentType || !hasPdfSignature) {
    console.error(
      `[WeeklyReportPDF] n8n devolvió una respuesta inválida (bytes=${pdfBuffer.length}, contentType="${responseContentType || 'ausente'}").`
    );
    throw new AppError(PDF_UNAVAILABLE_MSG, 503);
  }

  const dateTag = formatArgentinaIsoDate(new Date(report.generatedAt));
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="margenx-reporte-${dateTag}.pdf"`);
  res.setHeader('Cache-Control', 'private, no-store');

  return res.status(200).send(pdfBuffer);
});

export default router;
