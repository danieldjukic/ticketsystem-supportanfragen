import { pool } from '../db';
import { TicketRow, TicketStatus, TicketPriority } from '../models';

const SELECT_WITH_USERS = `
  SELECT t.*,
         cu.id   AS creator_id,
         cu.name AS creator_name,
         au.id   AS assignee_id,
         au.name AS assignee_name
  FROM tickets t
  JOIN users cu ON cu.id = t.created_by
  LEFT JOIN users au ON au.id = t.assigned_to
`;

export type TicketWithUsers = TicketRow & {
  creator_id: number;
  creator_name: string;
  assignee_id: number | null;
  assignee_name: string | null;
};

export const ticketRepository = {
  async findAll(filter?: { status?: TicketStatus; priority?: TicketPriority; created_by?: number; assigned_to?: number }): Promise<TicketWithUsers[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (filter?.status) {
      params.push(filter.status);
      conditions.push(`t.status = $${params.length}`);
    }
    if (filter?.priority) {
      params.push(filter.priority);
      conditions.push(`t.priority = $${params.length}`);
    }

    if (filter?.created_by !== undefined && filter?.assigned_to !== undefined) {
      params.push(filter.created_by, filter.assigned_to);
      conditions.push(`(t.created_by = $${params.length - 1} OR t.assigned_to = $${params.length})`);
    } else {
      if (filter?.created_by !== undefined) {
        params.push(filter.created_by);
        conditions.push(`t.created_by = $${params.length}`);
      }
      if (filter?.assigned_to !== undefined) {
        params.push(filter.assigned_to);
        conditions.push(`(t.assigned_to = $${params.length} OR t.assigned_to IS NULL)`);
      }
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query<TicketWithUsers>(`${SELECT_WITH_USERS} ${where} ORDER BY t.created_at DESC`, params);
    return rows;
  },

  async findById(id: number): Promise<TicketWithUsers | null> {
    const { rows } = await pool.query<TicketWithUsers>(`${SELECT_WITH_USERS} WHERE t.id = $1`, [id]);
    return rows[0] ?? null;
  },

  async create(data: {
    title: string;
    description: string;
    priority: TicketPriority;
    created_by: number;
  }): Promise<TicketWithUsers> {
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO tickets (title, description, priority, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [data.title, data.description, data.priority, data.created_by],
    );
    const created = await this.findById(rows[0].id);
    return created!;
  },

  async update(
    id: number,
    fields: {
      description?: string;
      priority?: TicketPriority;
      status?: TicketStatus;
      assigned_to?: number | null;
      set_closed_at?: boolean;
    },
  ): Promise<TicketWithUsers | null> {
    const sets: string[] = ['updated_at = now()'];
    const params: unknown[] = [];

    if (fields.description !== undefined) {
      params.push(fields.description);
      sets.push(`description = $${params.length}`);
    }
    if (fields.priority !== undefined) {
      params.push(fields.priority);
      sets.push(`priority = $${params.length}`);
    }
    if (fields.status !== undefined) {
      params.push(fields.status);
      sets.push(`status = $${params.length}`);
    }
    if (fields.assigned_to !== undefined) {
      params.push(fields.assigned_to);
      sets.push(`assigned_to = $${params.length}`);
    }
    if (fields.status === 'closed' && fields.set_closed_at) {
      sets.push('closed_at = now()');
    }

    params.push(id);
    const { rows } = await pool.query<TicketWithUsers>(
      `UPDATE tickets SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING id`,
      params,
    );
    if (!rows[0]) return null;
    return (await this.findById(rows[0].id))!;
  },
};
