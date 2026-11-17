import { Router, type Request, type Response } from 'express';
import { internalWebhookAuthMiddleware } from '../middlewares/internalWebhookAuth';
import { AppError } from '../middlewares/errorHandler';
import {
  getActiveReportAccounts,
  getWeeklyMarginReportBySlug,
  type ReportDateRangeOptions,
} from '../services/reportService';

const router = Router();

router.use(internalWebhookAuthMiddleware);

export function parseReportRangeQuery(query: Record<string, unknown>): ReportDateRangeOptions {
  const parseOptionalDate = (raw: unknown, field: 'from' | 'to'): Date | undefined => {
    if (raw === undefined || raw === '') return undefined;
    if (typeof raw !== 'string') {
      throw new AppError(`El parámetro "${field}" debe ser una fecha ISO válida.`, 400);
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      throw new AppError(`El parámetro "${field}" debe ser una fecha ISO válida.`, 400);
    }
    return parsed;
  };

  return {
    from: parseOptionalDate(query.from, 'from'),
    to: parseOptionalDate(query.to, 'to'),
  };
}

router.get('/accounts', async (_req: Request, res: Response) => {
  const accounts = await getActiveReportAccounts();
  return res.status(200).json({ accounts });
});

router.get('/weekly/:slug', async (req: Request, res: Response) => {
  const rawSlug = req.params.slug;
  const slug = (Array.isArray(rawSlug) ? rawSlug[0] : rawSlug)?.trim() ?? '';

  if (!slug) {
    throw new AppError('El slug de la cuenta es obligatorio.', 400);
  }

  const range = parseReportRangeQuery(req.query as Record<string, unknown>);
  const report = await getWeeklyMarginReportBySlug(slug, range);
  return res.status(200).json(report);
});

export default router;
