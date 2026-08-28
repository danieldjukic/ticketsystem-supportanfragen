import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { pool } from '../../src/db';
import { createApp } from '../../src/app';

const app = createApp();

const randomSuffix = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

async function migrate(): Promise<void> {
  const sql = readFileSync(resolve(__dirname, '../../migrations/001_init.sql'), 'utf8');
  for (const statement of sql.split(';')) {
    if (!statement.trim()) continue;
    try {
      await pool.query(statement);
    } catch {
      // table may already exist
    }
  }
}

async function createUser(): Promise<{ email: string; password: string; token: string }> {
  const email = `user.${randomSuffix()}@example.com`;
  const password = 'Passw0rt!';
  const name = `User ${randomSuffix()}`;
  const reg = await request(app).post('/api/auth/register').send({ name, email, password });
  if (reg.status !== 201) throw new Error(`register failed: ${reg.status}`);
  const login = await request(app).post('/api/auth/login').send({ email, password });
  if (login.status !== 200) throw new Error(`login failed: ${login.status}`);
  return { email, password, token: login.body.token };
}

async function createAdmin(): Promise<{ email: string; token: string }> {
  const email = `admin.${randomSuffix()}@example.com`;
  const password = 'Passw0rt!';
  const hash = await bcrypt.hash(password, 4);
  await pool.query('INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)', [
    `Admin ${randomSuffix()}`,
    email,
    hash,
    'admin',
  ]);
  const login = await request(app).post('/api/auth/login').send({ email, password });
  if (login.status !== 200) throw new Error(`admin login failed: ${login.status}`);
  return { email, token: login.body.token };
}

async function seedTicket(
  created_by: number,
  opts: { status?: string; priority?: string; assigned_to?: number | null } = {},
): Promise<number> {
  const { rows } = await pool.query(
    `INSERT INTO tickets (title, description, priority, status, created_by, assigned_to)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      `Ticket ${randomSuffix()}`,
      'Testbeschreibung',
      opts.priority ?? 'medium',
      opts.status ?? 'open',
      created_by,
      opts.assigned_to ?? null,
    ],
  );
  return rows[0].id as number;
}

beforeAll(async () => {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error(
      'TEST_DATABASE_URL fehlt: Die Integrationstests benötigen eine eigene Testdatenbank und greifen niemals auf DATABASE_URL zurück. ' +
        'Setze TEST_DATABASE_URL, z. B. TEST_DATABASE_URL=postgres://user:pass@localhost:5432/ticketing_test',
    );
  }
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    throw new Error(
      `Testdatenbank nicht erreichbar unter TEST_DATABASE_URL (${process.env.TEST_DATABASE_URL}): ${(err as Error).message}`,
    );
  }
  await migrate();
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await pool.query('TRUNCATE users, tickets RESTART IDENTITY CASCADE');
});

describe('api integration (real postgres)', () => {
  it('register returns 201 with role user and no password_hash', async () => {
    const email = `user.${randomSuffix()}@example.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Neuer User', email, password: 'Passw0rt!' });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('user');
    expect(res.body).not.toHaveProperty('password_hash');
  });

  it('login returns 200 with jwt and user data', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user?.email ?? res.body.email).toBe(user.email);
  });

  it('login with wrong password returns 401', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'FalschesPassw0rt!' });
    expect(res.status).toBe(401);
  });

  it('protected endpoint without token returns 401', async () => {
    const res = await request(app).get('/api/tickets');
    expect(res.status).toBe(401);
  });

  it('create ticket returns 201 with open status, medium priority, persisted row', async () => {
    const user = await createUser();
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ title: 'Integration Ticket', description: 'Beschreibung' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('open');
    expect(res.body.priority).toBe('medium');
    const { rows } = await pool.query('SELECT * FROM tickets WHERE id = $1', [res.body.id]);
    expect(rows.length).toBe(1);
  });

  it('own ticket can be edited, updated_at changes', async () => {
    const user = await createUser();
    const created = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ title: 'Edit me', description: 'alt' });
    const before = created.body.updated_at;
    const res = await request(app)
      .patch(`/api/tickets/${created.body.id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ description: 'neu', priority: 'high' });
    expect(res.status).toBe(200);
    expect(res.body.description).toBe('neu');
    expect(res.body.priority).toBe('high');
    expect(new Date(res.body.updated_at).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
  });

  it('foreign ticket cannot be edited by user, returns 403', async () => {
    const owner = await createUser();
    const other = await createUser();
    const ticket = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Fremd', description: 'x' });
    const res = await request(app)
      .patch(`/api/tickets/${ticket.body.id}`)
      .set('Authorization', `Bearer ${other.token}`)
      .send({ description: 'hacked' });
    expect(res.status).toBe(403);
  });

  it('assigned-only ticket can be read (200)', async () => {
    const creator = await createUser();
    const viewer = await createUser();
    const admin = await createAdmin();
    const created = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${creator.token}`)
      .send({ title: 'Assigned', description: 'x' });
    await request(app)
      .patch(`/api/tickets/${created.body.id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ assigned_to: await viewerId(viewer) });
    const res = await request(app)
      .get(`/api/tickets/${created.body.id}`)
      .set('Authorization', `Bearer ${viewer.token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
  });

  async function viewerId(_u: { email: string }): Promise<number> {
    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [_u.email]);
    return rows[0].id as number;
  }

  it('assigned-only ticket cannot be edited, returns 403', async () => {
    const creator = await createUser();
    const viewer = await createUser();
    const admin = await createAdmin();
    const created = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${creator.token}`)
      .send({ title: 'Assigned2', description: 'x' });
    await request(app)
      .patch(`/api/tickets/${created.body.id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ assigned_to: await viewerId(viewer) });
    const res = await request(app)
      .patch(`/api/tickets/${created.body.id}`)
      .set('Authorization', `Bearer ${viewer.token}`)
      .send({ description: 'nope' });
    expect(res.status).toBe(403);
  });

  it('admin can assign ticket, assigned_to persisted', async () => {
    const creator = await createUser();
    const assignee = await createUser();
    const admin = await createAdmin();
    const created = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${creator.token}`)
      .send({ title: 'Assign', description: 'x' });
    const res = await request(app)
      .patch(`/api/tickets/${created.body.id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ assigned_to: await viewerId(assignee) });
    expect(res.status).toBe(200);
    expect(res.body.assigned_to?.id).toBe(await viewerId(assignee));
    const { rows } = await pool.query('SELECT assigned_to FROM tickets WHERE id = $1', [created.body.id]);
    expect(rows[0].assigned_to).toBe(await viewerId(assignee));
  });

  it('valid status transition open -> in_progress returns 200', async () => {
    const creator = await createUser();
    const admin = await createAdmin();
    const created = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${creator.token}`)
      .send({ title: 'Transition', description: 'x' });
    const res = await request(app)
      .patch(`/api/tickets/${created.body.id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'in_progress' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in_progress');
  });

  it('invalid status transition open -> resolved returns 400', async () => {
    const creator = await createUser();
    const admin = await createAdmin();
    const created = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${creator.token}`)
      .send({ title: 'BadTransition', description: 'x' });
    const res = await request(app)
      .patch(`/api/tickets/${created.body.id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'resolved' });
    expect(res.status).toBe(400);
  });

  it('close ticket sets status closed and closed_at', async () => {
    const user = await createUser();
    const created = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ title: 'Closable', description: 'x' });
    const res = await request(app)
      .post(`/api/tickets/${created.body.id}/close`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('closed');
    expect(res.body.closed_at).toBeTruthy();
  });

  it('invalid ticket id returns 400, not 500', async () => {
    const user = await createUser();
    const res = await request(app)
      .get('/api/tickets/abc')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(400);
  });

  it(
    'combined filter respects visibility: user a sees only own open/high and assigned open/high',
    async () => {
      const a = await createUser();
      const b = await createUser();
      const admin = await createAdmin();
      const [aId, bEmail] = [await viewerId(a), b.email];
      const { rows: bRows } = await pool.query('SELECT id FROM users WHERE email = $1', [bEmail]);
      const bId = bRows[0].id as number;
      const t1 = await seedTicket(aId, { status: 'open', priority: 'high' });
      const t2 = await seedTicket(bId, { status: 'closed', priority: 'low', assigned_to: aId });
      const t3 = await seedTicket(bId, { status: 'open', priority: 'high', assigned_to: aId });
      await request(app)
        .patch(`/api/tickets/${t1}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({});
      const res = await request(app)
        .get('/api/tickets?status=open&priority=high')
        .set('Authorization', `Bearer ${a.token}`);
      expect(res.status).toBe(200);
      const ids = res.body.map((t: { id: number }) => t.id);
      expect(ids).toContain(t1);
      expect(ids).toContain(t3);
      expect(ids).not.toContain(t2);
    },
  );
});
