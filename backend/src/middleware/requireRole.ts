import { Response, NextFunction } from 'express';
import { AuthedRequest } from './authenticate';
import { forbidden } from '../utils/errors';
import { UserRole } from '../models';

export function requireRole(...roles: UserRole[]) {
  return (req: AuthedRequest, _res: Response, next: NextFunction): void => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return next(forbidden());
    }
    next();
  };
}
