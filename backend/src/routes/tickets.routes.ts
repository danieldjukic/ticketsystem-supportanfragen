import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthedRequest } from '../middleware/authenticate';
import { ticketController } from '../controllers/ticketController';

export const ticketRoutes = Router();

const asyncHandler =
  (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req as AuthedRequest, res).catch(next);

ticketRoutes.use(authenticate);

ticketRoutes.get('/', asyncHandler(ticketController.list));
ticketRoutes.post('/', asyncHandler(ticketController.create));
ticketRoutes.get('/:id', asyncHandler(ticketController.getOne));
ticketRoutes.patch('/:id', asyncHandler(ticketController.patch));
ticketRoutes.post('/:id/close', asyncHandler(ticketController.close));
