import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Request logging middleware dengan correlation ID
 * Memudahkan tracing request flow di logs
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Generate unique correlation ID untuk setiap request
  const correlationId = randomUUID();
  (req as any).correlationId = correlationId;
  
  // Add correlation ID to response headers
  res.setHeader('X-Correlation-ID', correlationId);

  // Log request start
  const startTime = Date.now();
  const { method, url, ip } = req;
  const userAgent = req.headers['user-agent'] || 'Unknown';

  console.log('[Request]', {
    correlationId,
    method,
    url,
    ip,
    userAgent,
    timestamp: new Date().toISOString(),
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { statusCode } = res;

    console.log('[Response]', {
      correlationId,
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  });

  next();
}
