import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthPayload } from '../models';
import { unauthorized } from '../utils/errors';

const JWT_SECRET = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
};

export interface AuthedRequest extends Request {
  auth?: AuthPayload;
}

export function signToken(user: { id: number; role: 'user' | 'admin' }): string {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET(), { expiresIn: '24h' });
}

export function authenticate(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(unauthorized());
  }
  try {
    const raw = jwt.verify(header.slice('Bearer '.length), JWT_SECRET()) as { sub?: unknown; role?: unknown };
    const sub = Number(raw.sub);
    if (!Number.isInteger(sub) || (raw.role !== 'user' && raw.role !== 'admin')) {
      throw new Error('invalid payload');
    }
    req.auth = { sub, role: raw.role, iat: 0, exp: 0 };
    next();
  } catch {
    next(unauthorized('Invalid or expired token'));
  }
}
