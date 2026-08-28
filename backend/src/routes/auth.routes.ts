import { NextFunction, Request, Response, Router } from 'express';
import { authService } from '../services/authService';

export const authRoutes = Router();

type AsyncHandler = (req: Request, res: Response) => Promise<unknown>;

const wrap =
  (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

authRoutes.post('/register', wrap(async (req, res) => {
  const user = await authService.register(req.body ?? {});
  res.status(201).json(user);
}));

authRoutes.post('/login', wrap(async (req, res) => {
  const result = await authService.login(req.body ?? {});
  res.json(result);
}));
