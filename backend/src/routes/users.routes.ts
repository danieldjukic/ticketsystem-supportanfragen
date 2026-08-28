import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthedRequest } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { usersService } from '../services/usersService';

export const userRoutes = Router();

const asyncHandler =
  (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req as AuthedRequest, res).catch(next);

userRoutes.get('/', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  res.json(await usersService.listAll());
}));
