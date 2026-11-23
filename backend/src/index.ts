import dotenv from 'dotenv';
import { createApp } from './app';

// Carga las variables de entorno desde el archivo .env.
dotenv.config();

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`⚡ [Backend] Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🩺 [Backend] Health check disponible en http://localhost:${PORT}/api/health`);
  console.log(`📘 [Backend] Documentación OpenAPI disponible en http://localhost:${PORT}/api/docs`);
});