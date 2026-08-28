import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/errors';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const status = err instanceof HttpError ? err.status : 500;
  const message = err instanceof HttpError ? err.message : 'Internal Server Error';

  if (status >= 500) {
    console.error(err);
  }

  const body: { error: string; message: string; details?: { field: string; message: string }[] } = {
    error: STATUS_NAMES[status] ?? 'Error',
    message,
  };
  if (err instanceof HttpError && err.details?.length) {
    body.details = err.details;
  }

  res.status(status).json(body);
}

const STATUS_NAMES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error',
};
