import cors from 'cors';
import express, { type Application, type Router } from 'express';
import helmet from 'helmet';
import { mountOpenApiDocs } from './docs/openapi';
import { registerRouterMount } from './docs/routeInspector';
import { errorHandler } from './middlewares/errorHandler';
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import ingredientsRoutes from './routes/ingredients';
import internalReportsRoutes from './routes/internalReports';
import productsRoutes from './routes/products';
import purchasingRoutes from './routes/purchasing';
import reportsRoutes from './routes/reports';
import { cashShiftsRouter, salesRouter } from './routes/salesModule';
import suppliersRoutes from './routes/suppliers';
import webhooksRoutes from './routes/webhooks';

function mountRouter(app: Application, prefix: string, router: Router): void {
  registerRouterMount(prefix, router);
  app.use(prefix, router);
}

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors()); // Permite solicitudes desde otros orígenes.
  app.use('/api/webhooks', express.json({ limit: '5mb' })); // Las listas de precios que manda n8n pueden ser grandes.
  app.use(express.json({ limit: '256kb' })); // Límite general conservador para evitar cuerpos desmedidos en rutas no dedicadas a ingesta.

  mountRouter(app, '/api/auth', authRoutes);
  mountRouter(app, '/api/ingredients', ingredientsRoutes);
  mountRouter(app, '/api/products', productsRoutes);
  mountRouter(app, '/api/dashboard', dashboardRoutes);
  mountRouter(app, '/api/suppliers', suppliersRoutes);
  mountRouter(app, '/api/purchasing', purchasingRoutes);
  mountRouter(app, '/api/webhooks', webhooksRoutes);
  mountRouter(app, '/api/internal/reports', internalReportsRoutes);
  mountRouter(app, '/api/reports', reportsRoutes);
  mountRouter(app, '/api/sales', salesRouter); // Módulo de ventas: 404 si la cuenta no lo tiene (ADR-010).
  mountRouter(app, '/api/cash-shifts', cashShiftsRouter);

  // Swagger UI en /api/docs y el contrato en /api/docs/openapi.json (público, sin datos de cuentas).
  mountOpenApiDocs(app);

  // Health check: permite comprobar rápidamente si el servidor está funcionando.
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      app: 'MargenX API',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });
  });

  // Middleware global de errores: SIEMPRE al final, después de todas las rutas.
  app.use(errorHandler);

  return app;
}