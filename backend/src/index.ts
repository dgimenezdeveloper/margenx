import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import ingredientsRoutes from './routes/ingredients';

// Carga las variables de entorno desde el archivo .env.
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;  // Utiliza el puerto definido en .env o 3000 como valor por defecto.

app.use(cors());  // Permite solicitudes desde otros orígenes.
app.use(express.json());  // Permite recibir y procesar JSON en el body de las peticiones.
app.use('/api/auth', authRoutes); // Registra las rutas relacionadas con autenticación.
app.use('/api/ingredients', ingredientsRoutes); // Registra las rutas CRUD de insumos (protegidas por authMiddleware).

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

app.listen(PORT, () => {
  console.log(`⚡ [Backend] Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🩺 [Backend] Health check disponible en http://localhost:${PORT}/api/health`);
});