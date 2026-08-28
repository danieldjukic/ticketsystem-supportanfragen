import { userRepository } from '../repositories/userRepository';

export const usersService = {
  async listAll(): Promise<{ id: number; name: string; email: string; role: 'user' | 'admin' }[]> {
    const rows = await userRepository.listAll();
    return rows.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role }));
  },
};