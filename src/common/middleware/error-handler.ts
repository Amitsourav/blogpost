import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';
import { logger } from '../../config/logger';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    logger.warn(err.message, { statusCode: err.statusCode });
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    error: 'Internal server error',
  });
}
