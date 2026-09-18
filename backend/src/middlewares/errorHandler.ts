import { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Error de dominio propio, para lanzar desde cualquier controlador con un
 * status HTTP y mensaje específicos, dejando que el middleware global
 * se encargue de formatear la respuesta.
 *
 * Ejemplo de uso en una ruta:
 *   throw new AppError('El insumo no existe.', 404);
 */
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Middleware global de manejo de errores. Debe registrarse en index.ts
 * DESPUÉS de todas las rutas de la API (Express lo reconoce como error
 * handler por tener 4 parámetros, aunque `next` no se use explícitamente).
 */
export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  // 1) JSON malformado en el body — lo lanza express.json() antes de
  //    llegar a cualquier ruta (body-parser marca el error con `.type`).
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'El cuerpo de la solicitud contiene JSON inválido.' });
  }

  // 2) Errores de dominio lanzados explícitamente con `throw new AppError(...)`.
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // 3) Errores conocidos de Prisma.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2025': // Registro no encontrado (ej. update/delete sobre un id inexistente)
        return res.status(404).json({ error: 'Recurso no encontrado.' });
      case 'P2002': // Violación de restricción única
        return res.status(409).json({ error: 'Ya existe un registro con esos datos únicos.' });
      case 'P2003': // Violación de clave foránea (ej. borrar algo referenciado)
        return res
          .status(409)
          .json({ error: 'La operación viola una relación existente con otro recurso.' });
      default:
        break; // cualquier otro código de Prisma cae al catch-all de abajo
    }
  }

  // 4) Cualquier excepción no controlada: se loguea completa en el servidor,
  //    pero nunca se expone el detalle interno al cliente.
  console.error('[errorHandler] Excepción no controlada:', err);

  const isProduction = process.env.NODE_ENV === 'production';
  return res.status(500).json({
    error: isProduction
      ? 'Error interno del servidor.'
      : err instanceof Error
        ? err.message
        : 'Error interno del servidor.',
  });
};