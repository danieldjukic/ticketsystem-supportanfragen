import { ticketService } from '../src/services/ticketService';
import { ticketRepository, TicketWithUsers } from '../src/repositories/ticketRepository';
import { userRepository } from '../src/repositories/userRepository';

jest.mock('../src/repositories/ticketRepository', () => ({
  ticketRepository: {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../src/repositories/userRepository', () => ({
  userRepository: {
    findById: jest.fn(),
  },
}));

const mkTicket = (over: Partial<TicketWithUsers> = {}): TicketWithUsers => ({
  id: 12,
  title: 'T',
  description: 'D',
  status: 'open',
  priority: 'medium',
  created_by: 1,
  assigned_to: null,
  created_at: new Date(),
  updated_at: new Date(),
  closed_at: null,
  creator_id: 1,
  creator_name: 'Creator',
  assignee_id: null,
  assignee_name: null,
  ...over,
});

const USER = { sub: 1, role: 'user' as const, iat: 0, exp: 0 };
const ADMIN = { sub: 2, role: 'admin' as const, iat: 0, exp: 0 };

const httpStatus = (e: unknown) => (e as { status?: number }).status;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ticketService.list', () => {
  it('filtert bei role=user nach created_by = eigene id', async () => {
    (ticketRepository.findAll as jest.Mock).mockResolvedValue([]);
    await ticketService.list(USER, { status: 'open', priority: 'high' });
    expect(ticketRepository.findAll).toHaveBeenCalledWith({
      status: 'open',
      priority: 'high',
      created_by: 1,
      assigned_to: 1,
    });
  });

  it('liefert auch Tickets die dem User zugewiesen sind', async () => {
    (ticketRepository.findAll as jest.Mock).mockResolvedValue([]);
    await ticketService.list(USER, {});
    expect(ticketRepository.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ created_by: 1, assigned_to: 1 }),
    );
  });

  it('liefert bei role=admin alle Tickets (created_by undefined)', async () => {
    (ticketRepository.findAll as jest.Mock).mockResolvedValue([]);
    await ticketService.list(ADMIN, {});
    expect(ticketRepository.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ created_by: undefined }),
    );
  });

  it('verwirft ungültige Filterwerte mit 400', async () => {
    await expect(ticketService.list(USER, { status: 'bogus' })).rejects.toMatchObject({ status: 400 });
    await expect(ticketService.list(USER, { priority: 'bogus' })).rejects.toMatchObject({ status: 400 });
  });
});

describe('ticketService.create', () => {
  it('validiert title/description und defaultet priority auf medium', async () => {
    (ticketRepository.create as jest.Mock).mockResolvedValue(mkTicket());
    await ticketService.create(USER, { title: '  Titel ', description: 'Text' });
    expect(ticketRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Titel', description: 'Text', priority: 'medium', created_by: 1 }),
    );
  });

  it('verwirft leeren title/description und ungültige priority mit 400', async () => {
    await expect(ticketService.create(USER, { title: '', description: 'x' })).rejects.toMatchObject({ status: 400 });
    await expect(ticketService.create(USER, { title: 'x', description: '' })).rejects.toMatchObject({ status: 400 });
    await expect(ticketService.create(USER, { title: 'x', description: 'y', priority: 'bogus' })).rejects.toMatchObject({
      status: 400,
    });
  });
});

describe('ticketService.getOne', () => {
  it('liefert 403 wenn user ein fremdes Ticket liest', async () => {
    (ticketRepository.findById as jest.Mock).mockResolvedValue(mkTicket({ created_by: 99 }));
    await expect(ticketService.getOne(USER, 12)).rejects.toMatchObject({ status: 403 });
  });

  it('liefert 404 wenn das Ticket nicht existiert', async () => {
    (ticketRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(ticketService.getOne(USER, 12)).rejects.toMatchObject({ status: 404 });
    await expect(ticketService.getOne(ADMIN, 12)).rejects.toMatchObject({ status: 404 });
  });
});

describe('ticketService.patch (Rollenregeln §6)', () => {
  it('user: status/assigned_to senden → 403', async () => {
    (ticketRepository.findById as jest.Mock).mockResolvedValue(mkTicket());
    await expect(ticketService.patch(USER, 12, { status: 'in_progress' })).rejects.toMatchObject({ status: 403 });
    await expect(ticketService.patch(USER, 12, { assigned_to: 3 })).rejects.toMatchObject({ status: 403 });
  });

  it('user: eigenes Ticket, closed → 400', async () => {
    (ticketRepository.findById as jest.Mock).mockResolvedValue(mkTicket({ status: 'closed' }));
    await expect(ticketService.patch(USER, 12, { description: 'x' })).rejects.toMatchObject({ status: 400 });
  });

  it('user: fremdes Ticket → 403', async () => {
    (ticketRepository.findById as jest.Mock).mockResolvedValue(mkTicket({ created_by: 99 }));
    await expect(ticketService.patch(USER, 12, { description: 'x' })).rejects.toMatchObject({ status: 403 });
  });

  it('user: description/priority erlaubt (eigenes, offenes Ticket)', async () => {
    (ticketRepository.findById as jest.Mock).mockResolvedValue(mkTicket());
    (ticketRepository.update as jest.Mock).mockResolvedValue(mkTicket({ description: 'neu' }));
    await ticketService.patch(USER, 12, { description: 'neu', priority: 'high' });
    expect(ticketRepository.update).toHaveBeenCalledWith(
      12,
      expect.objectContaining({ description: 'neu', priority: 'high' }),
    );
  });

  it('admin: description/priority ändern → 403', async () => {
    (ticketRepository.findById as jest.Mock).mockResolvedValue(mkTicket());
    await expect(ticketService.patch(ADMIN, 12, { description: 'x' })).rejects.toMatchObject({ status: 403 });
    await expect(ticketService.patch(ADMIN, 12, { priority: 'high' })).rejects.toMatchObject({ status: 403 });
  });

  it('admin: ungültiger Statusübergang → 400', async () => {
    (ticketRepository.findById as jest.Mock).mockResolvedValue(mkTicket({ status: 'open' }));
    await expect(ticketService.patch(ADMIN, 12, { status: 'resolved' })).rejects.toMatchObject({ status: 400 });
  });

  it('admin: gültiger Statusübergang + assigned_to auf existierenden User', async () => {
    (ticketRepository.findById as jest.Mock).mockResolvedValue(mkTicket({ status: 'open' }));
    (userRepository.findById as jest.Mock).mockResolvedValue({ id: 3, name: 'A', email: 'a@x.ch', role: 'admin' });
    (ticketRepository.update as jest.Mock).mockResolvedValue(mkTicket({ status: 'in_progress', assigned_to: 3 }));
    await ticketService.patch(ADMIN, 12, { status: 'in_progress', assigned_to: 3 });
    expect(ticketRepository.update).toHaveBeenCalledWith(
      12,
      expect.objectContaining({ status: 'in_progress', assigned_to: 3 }),
    );
  });

  it('admin: assigned_to auf nicht existierenden User → 400', async () => {
    (ticketRepository.findById as jest.Mock).mockResolvedValue(mkTicket());
    (userRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(ticketService.patch(ADMIN, 12, { assigned_to: 999 })).rejects.toMatchObject({ status: 400 });
  });
});

describe('ticketService.close', () => {
  it('ersetzt status=closed + closed_at beim Close (Ersteller)', async () => {
    (ticketRepository.findById as jest.Mock).mockResolvedValue(mkTicket({ status: 'resolved' }));
    (ticketRepository.update as jest.Mock).mockResolvedValue(mkTicket({ status: 'closed' }));
    await ticketService.close(USER, 12);
    expect(ticketRepository.update).toHaveBeenCalledWith(12, { status: 'closed', set_closed_at: true });
  });

  it('bereits closed → 400', async () => {
    (ticketRepository.findById as jest.Mock).mockResolvedValue(mkTicket({ status: 'closed' }));
    await expect(ticketService.close(USER, 12)).rejects.toMatchObject({ status: 400 });
  });

  it('user fremdes Ticket → 403', async () => {
    (ticketRepository.findById as jest.Mock).mockResolvedValue(mkTicket({ created_by: 99 }));
    await expect(ticketService.close(USER, 12)).rejects.toMatchObject({ status: 403 });
  });

  it('admin darf jedes Ticket schliessen', async () => {
    (ticketRepository.findById as jest.Mock).mockResolvedValue(mkTicket({ created_by: 99 }));
    (ticketRepository.update as jest.Mock).mockResolvedValue(mkTicket({ status: 'closed' }));
    await expect(ticketService.close(ADMIN, 12)).resolves.toMatchObject({ status: 'closed' });
  });
});
