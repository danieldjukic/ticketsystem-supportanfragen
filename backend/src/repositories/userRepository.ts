import { pool } from '../db';
import { UserRow } from '../models';

export type UserListItem = Pick<UserRow, 'id' | 'name' | 'email' | 'role'>;

export const userRepository = {
  async findByEmail(email: string): Promise<UserRow | null> {
    const { rows } = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] ?? null;
  },

  async findById(id: number): Promise<UserRow | null> {
    const { rows } = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] ?? null;
  },

  async create(data: { name: string; email: string; password_hash: string }): Promise<UserRow> {
    const { rows } = await pool.query<UserRow>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.name, data.email, data.password_hash],
    );
    return rows[0];
  },

  async listAll(): Promise<UserListItem[]> {
    const { rows } = await pool.query<UserListItem>(
      'SELECT id, name, email, role FROM users ORDER BY id ASC',
    );
    return rows;
  },
};
