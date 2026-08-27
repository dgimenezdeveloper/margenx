import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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