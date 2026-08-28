import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { jwtInterceptor } from './jwt.interceptor';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

const apiUrl = environment.apiUrl;

type NextHandler = (req: HttpRequest<unknown>) => Observable<unknown>;

function setup(next: NextHandler) {
  const logout = vi.fn();
  const navigate = vi.fn(() => Promise.resolve(true));
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: { token: () => 'jwt-token', logout } },
    { provide: Router, useValue: { navigate } },
    ],
  });
  return {
    run: (url: string) =>
      TestBed.runInInjectionContext(
        () =>
          (jwtInterceptor(new HttpRequest('GET', url), next as never) as Observable<unknown>).subscribe({
            error: () => undefined,
          }),
      ),
    logout,
    navigate,
  };
}

describe('jwtInterceptor', () => {
  it('adds Authorization header to requests under the configured API url', () => {
    let seen: HttpRequest<unknown> | undefined;
    const ctx = setup((req) => {
      seen = req;
      return of(req);
    });
    ctx.run(`${apiUrl}/tickets`);
    expect(seen?.headers.get('Authorization')).toBe('Bearer jwt-token');
  });

  it('does not add Authorization header to requests outside the configured API url', () => {
    let seen: HttpRequest<unknown> | undefined;
    const ctx = setup((req) => {
      seen = req;
      return of(req);
    });
    ctx.run('https://external.example.com/data');
    expect(seen?.headers.get('Authorization')).toBeNull();
  });

  it('logs out on 401 from a protected API endpoint', () => {
    const ctx = setup(() =>
      throwError(
        () => new HttpErrorResponse({ error: '', status: 401, url: `${apiUrl}/tickets` }),
      ),
    );
    ctx.run(`${apiUrl}/tickets`);
    expect(ctx.logout).toHaveBeenCalledTimes(1);
    expect(ctx.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('does not log out on 401 from the auth login endpoint', () => {
    const ctx = setup(() =>
      of(new HttpErrorResponse({ error: '', status: 401, url: `${apiUrl}/auth/login` })),
    );
    ctx.run(`${apiUrl}/auth/login`);
    expect(ctx.logout).not.toHaveBeenCalled();
    expect(ctx.navigate).not.toHaveBeenCalled();
  });
});
