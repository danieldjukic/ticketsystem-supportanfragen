import { Response } from 'express';
import { AuthedRequest } from '../middleware/authenticate';
import { ticketService } from '../services/ticketService';
import { badRequest } from '../utils/errors';

export const ticketController = {
  async list(req: AuthedRequest, res: Response): Promise<void> {
    const tickets = await ticketService.list(req.auth!, req.query as { status?: string; priority?: string });
    res.json(tickets);
  },

  async create(req: AuthedRequest, res: Response): Promise<void> {
    const ticket = await ticketService.create(req.auth!, req.body ?? {});
    res.status(201).json(ticket);
  },

  async getOne(req: AuthedRequest, res: Response): Promise<void> {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw badRequest('Ungültige Ticket-ID');
    const ticket = await ticketService.getOne(req.auth!, id);
    res.json(ticket);
  },

  async patch(req: AuthedRequest, res: Response): Promise<void> {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw badRequest('Ungültige Ticket-ID');
    const ticket = await ticketService.patch(req.auth!, id, req.body ?? {});
    res.json(ticket);
  },

  async close(req: AuthedRequest, res: Response): Promise<void> {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw badRequest('Ungültige Ticket-ID');
    const ticket = await ticketService.close(req.auth!, id);
    res.json(ticket);
  },
};
