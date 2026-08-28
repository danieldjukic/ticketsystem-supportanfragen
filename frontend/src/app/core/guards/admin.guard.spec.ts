import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { adminGuard } from './admin.guard';
import { AuthService } from '../services/auth.service';

const route = { params: {} } as never;
const state = {} as never;

const mockRouter = {
  createUrlTree: (tree: unknown) => ({
    toString: () => (Array.isArray(tree) ? tree.join('/') : String(tree)),
  }),
};

describe('adminGuard', () => {
  it('denies access for a normal user and redirects to /tickets', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isLoggedIn: () => true, isAdmin: () => false } },
        { provide: Router, useValue: mockRouter },
      ],
    });
    const result = TestBed.runInInjectionContext(() => adminGuard(route, state));
    expect(result).not.toBe(true);
    expect((result as { toString: () => string }).toString()).toBe('/tickets');
  });

  it('allows access for an admin', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isLoggedIn: () => true, isAdmin: () => true } },
        { provide: Router, useValue: mockRouter },
      ],
    });
    const result = TestBed.runInInjectionContext(() => adminGuard(route, state));
    expect(result).toBe(true);
  });
});
