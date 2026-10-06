import type { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

/**
 * Centralized error handling middleware
 * Prevents stack trace leaking in production
 */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Log error server-side (will be replaced with Winston logger in Phase 4)
  console.error('[Error Handler]', {
    message: err.message,
    stack: err.stack,
    code: err.code,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Generic error response for production
  if (isProduction) {
    res.status(statusCode).json({
      error: statusCode >= 500 
        ? 'Internal server error. Please try again later.'
        : err.message || 'An error occurred',
      code: err.code || 'INTERNAL_ERROR',
    });
    return;
  }

  // Detailed error for development
  res.status(statusCode).json({
    error: err.message || 'An error occurred',
    code: err.code || 'INTERNAL_ERROR',
    stack: err.stack,
    url: req.url,
    method: req.method,
  });
}

/**
 * 404 handler untuk routes yang tidak ditemukan
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Resource not found',
    code: 'NOT_FOUND',
    path: req.url,
  });
}

/**
 * Helper untuk create operational errors
 */
export function createError(
  message: string,
  statusCode: number = 500,
  code?: string
): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  error.isOperational = true;
  return error;
}
