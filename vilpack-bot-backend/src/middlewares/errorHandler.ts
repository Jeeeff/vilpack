import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('❌ Error caught by global handler:', error);

  // Zod Validation Errors
  if (error instanceof ZodError) {
    const formattedErrors = error.issues.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    return res.status(400).json({
      status: 'error',
      type: 'VALIDATION_ERROR',
      message: 'Erro de validação nos dados enviados.',
      details: formattedErrors,
    });
  }

  // Prisma Errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: Unique constraint failed
    if (error.code === 'P2002') {
      return res.status(409).json({
        status: 'error',
        type: 'CONFLICT_ERROR',
        message: 'Já existe um registro com esses dados.',
      });
    }
    // P2025: Record not found
    if (error.code === 'P2025') {
      return res.status(404).json({
        status: 'error',
        type: 'NOT_FOUND',
        message: 'Registro não encontrado.',
      });
    }
  }

  // Google Generative AI Errors (often have status or specific message)
  if (error?.status === 429) {
    return res.status(429).json({
      status: 'error',
      type: 'RATE_LIMIT_ERROR',
      message: 'Muitas requisições. Tente novamente em alguns instantes.',
    });
  }
  
  if (error?.message?.includes('404') || error?.status === 404) {
      // Could be model not found or endpoint not found
      return res.status(503).json({
          status: 'error',
          type: 'SERVICE_UNAVAILABLE',
          message: 'Serviço de IA temporariamente indisponível (Modelo não encontrado ou erro de API).',
      });
  }

  // Default Error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Erro interno do servidor';

  return res.status(statusCode).json({
    status: 'error',
    type: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'Erro interno do servidor' : message,
    // Include stack trace only in development
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });
};
