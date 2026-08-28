import { ticketRepository, TicketWithUsers } from '../repositories/ticketRepository';
import { userRepository } from '../repositories/userRepository';
import {
  ALLOWED_TRANSITIONS,
  AuthPayload,
  TicketDto,
  TicketPriority,
  TicketStatus,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from '../models';
import { badRequest, forbidden, notFound } from '../utils/errors';

export const toTicketDto = (t: TicketWithUsers): TicketDto => ({
  id: t.id,
  title: t.title,
  description: t.description,
  status: t.status,
  priority: t.priority,
  created_by: { id: t.creator_id, name: t.creator_name },
  assigned_to: t.assignee_id != null ? { id: t.assignee_id, name: t.assignee_name! } : null,
  created_at: t.created_at,
  updated_at: t.updated_at,
  closed_at: t.closed_at,
});

const loadTicketOr404 = async (id: number): Promise<TicketWithUsers> => {
  const t = await ticketRepository.findById(id);
  if (!t) throw notFound('Ticket nicht gefunden');
  return t;
};

export const ticketService = {
  async list(auth: AuthPayload, query: { status?: string; priority?: string }): Promise<TicketDto[]> {
    let status: TicketStatus | undefined;
    let priority: TicketPriority | undefined;

    if (query.status !== undefined) {
      if (!TICKET_STATUSES.includes(query.status as TicketStatus)) {
        throw badRequest('Ungültiger status-Filterwert', [
          { field: 'status', message: `must be one of: ${TICKET_STATUSES.join(', ')}` },
        ]);
      }
      status = query.status as TicketStatus;
    }
    if (query.priority !== undefined) {
      if (!TICKET_PRIORITIES.includes(query.priority as TicketPriority)) {
        throw badRequest('Ungültiger priority-Filterwert', [
          { field: 'priority', message: `must be one of: ${TICKET_PRIORITIES.join(', ')}` },
        ]);
      }
      priority = query.priority as TicketPriority;
    }

    const created_by = auth.role === 'admin' ? undefined : auth.sub;
    const assigned_to = auth.role === 'admin' ? undefined : auth.sub;
    const rows = await ticketRepository.findAll({ status, priority, created_by, assigned_to });
    return rows.map(toTicketDto);
  },

  async create(
    auth: AuthPayload,
    body: { title?: string; description?: string; priority?: string; status?: string },
  ): Promise<TicketDto> {
    const details: { field: string; message: string }[] = [];

    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (title.length < 1 || title.length > 200) {
      details.push({ field: 'title', message: 'must be 1-200 characters' });
    }

    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (description.length < 1) {
      details.push({ field: 'description', message: 'must not be empty' });
    }

    let priority: TicketPriority = 'medium';
    if (body.priority !== undefined) {
      if (typeof body.priority !== 'string' || !TICKET_PRIORITIES.includes(body.priority as TicketPriority)) {
        details.push({ field: 'priority', message: `must be one of: ${TICKET_PRIORITIES.join(', ')}` });
      } else {
        priority = body.priority as TicketPriority;
      }
    }

    if (details.length) {
      throw badRequest('Validation failed', details);
    }

    const row = await ticketRepository.create({ title, description, priority, created_by: auth.sub });
    return toTicketDto(row);
  },

  async getOne(auth: AuthPayload, id: number): Promise<TicketDto> {
    const t = await loadTicketOr404(id);
    if (auth.role === 'user' && t.created_by !== auth.sub && t.assignee_id !== auth.sub) {
      throw forbidden();
    }
    return toTicketDto(t);
  },

  async patch(auth: AuthPayload, id: number, body: Record<string, unknown>): Promise<TicketDto> {
    const t = await loadTicketOr404(id);
    const isAdmin = auth.role === 'admin';

    if (!isAdmin) {
      if (t.created_by !== auth.sub) throw forbidden();
      if (body.status !== undefined || body.assigned_to !== undefined) {
        throw forbidden('User darf nur description/priority ändern');
      }
      if (t.status === 'closed') {
        throw badRequest('Ticket ist geschlossen und kann nicht mehr bearbeitet werden');
      }
    } else {
      if (body.description !== undefined || body.priority !== undefined) {
        throw forbidden('Admin ändert nur status/assigned_to');
      }
    }

    const fields: Parameters<typeof ticketRepository.update>[1] = {};
    let statusChanged = false;

    if (!isAdmin) {
      if (body.description !== undefined) {
        const description = typeof body.description === 'string' ? body.description.trim() : '';
        if (!description) throw badRequest('Validation failed', [{ field: 'description', message: 'must not be empty' }]);
        fields.description = description;
      }
      if (body.priority !== undefined) {
        if (typeof body.priority !== 'string' || !TICKET_PRIORITIES.includes(body.priority as TicketPriority)) {
          throw badRequest('Validation failed', [
            { field: 'priority', message: `must be one of: ${TICKET_PRIORITIES.join(', ')}` },
          ]);
        }
        fields.priority = body.priority as TicketPriority;
      }
    } else {
      if (body.assigned_to !== undefined) {
        if (body.assigned_to === null) {
          fields.assigned_to = null;
        } else {
          const uid = typeof body.assigned_to === 'number' ? body.assigned_to : Number(body.assigned_to);
          if (!Number.isInteger(uid)) {
            throw badRequest('Validation failed', [{ field: 'assigned_to', message: 'must be a user id or null' }]);
          }
          const user = await userRepository.findById(uid);
          if (!user) throw badRequest('Validation failed', [{ field: 'assigned_to', message: 'must reference an existing user' }]);
          fields.assigned_to = uid;
        }
      }
      if (body.status !== undefined) {
        if (typeof body.status !== 'string' || !TICKET_STATUSES.includes(body.status as TicketStatus)) {
          throw badRequest('Validation failed', [
            { field: 'status', message: `must be one of: ${TICKET_STATUSES.join(', ')}` },
          ]);
        }
        const next = body.status as TicketStatus;
        if (!ALLOWED_TRANSITIONS[t.status].includes(next)) {
          throw badRequest(`Ungültiger Statusübergang: ${t.status} → ${next}`);
        }
        fields.status = next;
        statusChanged = next !== t.status;
      }
    }

    if (fields.status === 'closed') {
      fields.set_closed_at = true;
    }

    const updated = await ticketRepository.update(id, {
      ...fields,
      set_closed_at: fields.set_closed_at ?? (statusChanged && false),
    });
    return toTicketDto(updated!);
  },

  async close(auth: AuthPayload, id: number): Promise<TicketDto> {
    const t = await loadTicketOr404(id);
    if (auth.role === 'user' && t.created_by !== auth.sub) {
      throw forbidden();
    }
    if (t.status === 'closed') {
      throw badRequest('Ticket ist bereits geschlossen');
    }
    const updated = await ticketRepository.update(id, { status: 'closed', set_closed_at: true });
    return toTicketDto(updated!);
  },
};
