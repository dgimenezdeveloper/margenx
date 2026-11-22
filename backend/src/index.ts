import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import authRoutes from './routes/auth';
import ingredientsRoutes from './routes/ingredients';
import productsRoutes from './routes/products';
import dashboardRoutes from './routes/dashboard';
import suppliersRoutes from './routes/suppliers';
import purchasingRoutes from './routes/purchasing';
import webhooksRoutes from './routes/webhooks';
import internalReportsRoutes from './routes/internalReports';
import reportsRoutes from './routes/reports';
import { salesRouter, cashShiftsRouter } from './routes/salesModule';
import { errorHandler } from './middlewares/errorHandler';

// Carga las variables de entorno desde el archivo .env.
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;  // Utiliza el puerto definido en .env o 3000 como valor por defecto.

app.use(helmet());
app.use(cors());  // Permite solicitudes desde otros orígenes.
app.use('/api/webhooks', express.json({ limit: '5mb' }));
app.use(express.json({ limit: '256kb' }));  // Límite general conservador para evitar cuerpos desmedidos en rutas no dedicadas a ingesta.
app.use('/api/auth', authRoutes); // Registra las rutas relacionadas con autenticación.
app.use('/api/ingredients', ingredientsRoutes); // Registra las rutas CRUD de insumos (protegidas por authMiddleware).
app.use('/api/products', productsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/purchasing', purchasingRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/internal/reports', internalReportsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/sales', salesRouter); // Módulo de ventas: 404 si la cuenta no lo tiene (ADR-010).
app.use('/api/cash-shifts', cashShiftsRouter);
/*
  Health check de la API.
  Permite comprobar rápidamente si el servidor
  está funcionando correctamente.
*/
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'MargenX API',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Middleware global de errores — SIEMPRE al final, después de todas las rutas.
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`⚡ [Backend] Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🩺 [Backend] Health check disponible en http://localhost:${PORT}/api/health`);
});