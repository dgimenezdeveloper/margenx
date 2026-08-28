import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';

const router = Router();

/*
  GET /api/auth/me
 
  Endpoint protegido que devuelve la información
  del usuario actualmente autenticado.
 
  El middleware authMiddleware se ejecuta antes de llegar
  a esta función y garantiza que req.user exista.
 */
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res) => {
  res.status(200).json({ user: req.user }); // Devuelve únicamente los datos necesarios del usuario.
});

export default router;