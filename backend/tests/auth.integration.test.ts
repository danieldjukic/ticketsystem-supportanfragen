import request from 'supertest';
import { createApp } from '../src/app';
import { ticketRepository } from '../src/repositories/ticketRepository';
import { userRepository } from '../src/repositories/userRepository';

jest.mock('../src/repositories/ticketRepository', () => ({
  ticketRepository: {
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../src/repositories/userRepository', () => ({
  userRepository: {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn().mockResolvedValue({
      id: 1, name: 'Max Muster', email: 'max@example.com',
      password_hash: 'hash', role: 'user', created_at: new Date(),
    }),
    listAll: jest.fn().mockResolvedValue([]),
  },
}));

const app = createApp();
const USER = {
  id: 1, name: 'Max Muster', email: 'max@example.com',
  password_hash: '$2b$12$fakehashfakehashfakehashfakehashfakehashfakehashfak', role: 'user', created_at: new Date(),
};
// bcrypt.compare('Secret123!', USER.password_hash) => false ist für 401-Cases ausreichend,
// für den erfolgreichen Login simulieren wir einen gültigen Hash-Lookup direkt im Mock.

beforeEach(() => jest.clearAllMocks());

describe('POST /api/auth/register', () => {
  it('201 bei gültigem Request (role immer user)', async () => {
    (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Max Muster', email: 'max@example.com', password: 'Secret123!' });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('user');
    expect(res.body).not.toHaveProperty('password_hash');
  });

  it('400 mit details bei ungültiger E-Mail und zu kurzem Passwort', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'bogus', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Bad Request');
    expect(res.body.details.map((d: { field: string }) => d.field)).toEqual(
      expect.arrayContaining(['name', 'email', 'password']),
    );
  });

  it('409 wenn E-Mail bereits existiert', async () => {
    (userRepository.findByEmail as jest.Mock).mockResolvedValue(USER);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Max', email: 'max@example.com', password: 'Secret123!' });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  it('401 bei falschem Passwort (keine Unterscheidung existiert/nicht)', async () => {
    (userRepository.findByEmail as jest.Mock).mockResolvedValue(USER);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'max@example.com', password: 'falsch' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('401 wenn E-Mail nicht existiert', async () => {
    (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Secret123!' });
    expect(res.status).toBe(401);
  });
});

describe('Auth-Middleware & Rollen', () => {
  it('GET /api/tickets ohne Token → 401', async () => {
    const res = await request(app).get('/api/tickets');
    expect(res.status).toBe(401);
  });

  it('GET /api/users mit User-Token → 403, mit Admin-Token → 200', async () => {
    process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';
    const jwt = await import('jsonwebtoken');
    const userToken = jwt.sign({ sub: 1, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const adminToken = jwt.sign({ sub: 2, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const resUser = await request(app).get('/api/users').set('Authorization', `Bearer ${userToken}`);
    expect(resUser.status).toBe(403);

    const resAdmin = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
    expect(resAdmin.status).toBe(200);
  });
});