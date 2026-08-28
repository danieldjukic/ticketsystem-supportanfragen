import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

const route = { params: {} } as never;
const state = {} as never;

const mockRouter = {
  createUrlTree: (tree: unknown) => ({
    toString: () => (Array.isArray(tree) ? tree.join('/') : String(tree)),
  }),
};

describe('authGuard', () => {
  it('redirects to /login when not logged in', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isLoggedIn: () => false, isAdmin: () => false } },
        { provide: Router, useValue: mockRouter },
      ],
    });
    const result = TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result).not.toBe(true);
    expect((result as { toString: () => string }).toString()).toBe('/login');
  });

  it('allows access when logged in', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isLoggedIn: () => true, isAdmin: () => false } },
        { provide: Router, useValue: mockRouter },
      ],
    });
    const result = TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result).toBe(true);
  });
});
