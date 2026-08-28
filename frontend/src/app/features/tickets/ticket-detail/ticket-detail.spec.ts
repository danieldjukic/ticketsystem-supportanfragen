import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { TicketDetail } from './ticket-detail';
import { TicketService } from '../../../core/services/ticket.service';
import { AuthService } from '../../../core/services/auth.service';
import { TicketDto } from '../../../core/models';

interface Scenario {
  isAdmin: boolean;
  myId: number;
  creatorId: number;
  status: TicketDto['status'];
}

function setup({ isAdmin, myId, creatorId, status }: Scenario) {
  const ticket: TicketDto = {
    id: 1,
    title: 'Test',
    description: 'Beschreibung',
    priority: 'medium',
    status,
    created_by: { id: creatorId, name: 'Creator' },
    assigned_to: creatorId !== myId ? { id: myId, name: 'Assignee' } : null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    closed_at: status === 'closed' ? '2026-01-02T00:00:00Z' : null,
  };
  const listUsers = vi.fn(() => of([]));
  TestBed.configureTestingModule({
    providers: [
      {
        provide: TicketService,
        useValue: {
          get: vi.fn(() => of(ticket)),
          listUsers,
          patch: vi.fn(() => of(ticket)),
          close: vi.fn(() => of(ticket)),
        },
      },
      {
        provide: AuthService,
        useValue: {
          isAdmin: () => isAdmin,
          user: () => ({ id: myId, name: 'Me', email: 'me@example.com', role: isAdmin ? 'admin' : 'user' }),
        },
      },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: { get: () => '1' } } },
      },
      { provide: Router, useValue: { navigate: vi.fn(() => Promise.resolve(true)) } },
    ],
  });
  const detail = TestBed.runInInjectionContext(() => new TicketDetail());
  return { detail, listUsers, ticket };
}

describe('TicketDetail role behavior', () => {
  it('admin sees administration controls but no content editing; users are loaded', () => {
    const { detail, listUsers } = setup({ isAdmin: true, myId: 9, creatorId: 1, status: 'open' });
    expect(detail.ticket()).not.toBeNull();
    expect(detail.canAdminister()).toBe(true);
    expect(detail.canEditContent()).toBe(false);
    expect(detail.canClose()).toBe(true);
    expect(listUsers).toHaveBeenCalled();
  });

  it('creator (normal user) sees content editing, no administration; users are not loaded', () => {
    const { detail, listUsers } = setup({ isAdmin: false, myId: 1, creatorId: 1, status: 'open' });
    expect(detail.ticket()).not.toBeNull();
    expect(detail.canAdminister()).toBe(false);
    expect(detail.canEditContent()).toBe(true);
    expect(detail.canClose()).toBe(true);
    expect(listUsers).not.toHaveBeenCalled();
  });

  it('assigned-only user can view but neither edit content nor close; users are not loaded', () => {
    const { detail, listUsers } = setup({ isAdmin: false, myId: 2, creatorId: 1, status: 'open' });
    expect(detail.ticket()).not.toBeNull();
    expect(detail.canAdminister()).toBe(false);
    expect(detail.canEditContent()).toBe(false);
    expect(detail.canClose()).toBe(false);
    expect(listUsers).not.toHaveBeenCalled();
  });

  it('closed tickets offer no editing and no closing, even for admin', () => {
    const { detail } = setup({ isAdmin: true, myId: 9, creatorId: 1, status: 'closed' });
    expect(detail.canAdminister()).toBe(false);
    expect(detail.canEditContent()).toBe(false);
    expect(detail.canClose()).toBe(false);
  });
});
