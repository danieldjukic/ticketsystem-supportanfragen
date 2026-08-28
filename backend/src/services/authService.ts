import bcrypt from 'bcrypt';
import { userRepository } from '../repositories/userRepository';
import { UserDto, UserRow } from '../models';
import { badRequest, conflict, unauthorized } from '../utils/errors';
import { signToken } from '../middleware/authenticate';

const BCRYPT_COST = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const toUserDto = (row: UserRow): UserDto => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
});

export const authService = {
  async register(body: { name?: string; email?: string; password?: string }): Promise<UserDto> {
    const details: { field: string; message: string }[] = [];

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (name.length < 1 || name.length > 100) {
      details.push({ field: 'name', message: 'must be 1-100 characters' });
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!EMAIL_RE.test(email)) {
      details.push({ field: 'email', message: 'must be a valid email address' });
    }

    const password = body.password ?? '';
    if (password.length < 8) {
      details.push({ field: 'password', message: 'must be at least 8 characters' });
    }

    if (details.length) {
      throw badRequest('Validation failed', details);
    }

    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw conflict('E-Mail ist bereits registriert');
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_COST);
    const row = await userRepository.create({ name, email, password_hash });
    return toUserDto(row);
  },

  async login(body: { email?: string; password?: string }): Promise<{ token: string; user: UserDto }> {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = body.password ?? '';

    const row = email ? await userRepository.findByEmail(email) : null;
    const passwordMatches = row
      ? await bcrypt.compare(password, row.password_hash).catch(() => false)
      : false;
    if (!row || !passwordMatches) {
      throw unauthorized('Ungültige E-Mail/Passwort-Kombination');
    }

    return { token: signToken({ id: row.id, role: row.role }), user: toUserDto(row) };
  },
};