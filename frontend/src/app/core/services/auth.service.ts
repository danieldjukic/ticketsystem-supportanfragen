import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { UserDto } from '../models';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'ticketing.token';
const USER_KEY = 'ticketing.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSignal = signal<UserDto | null>(this.readStoredUser());

  readonly user = this.userSignal.asReadonly();
  readonly isLoggedIn = computed(() => this.userSignal() !== null);
  readonly isAdmin = computed(() => this.userSignal()?.role === 'admin');

  constructor(private http: HttpClient, private router: Router) {}

  token(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  private readStoredUser(): UserDto | null {
    try {
      const raw = sessionStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as UserDto) : null;
    } catch {
      return null;
    }
  }

  async register(name: string, email: string, password: string): Promise<void> {
    await firstValueFrom(
      this.http.post<UserDto>(`${environment.apiUrl}/auth/register`, { name, email, password }),
    );
  }

  async login(email: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<{ token: string; user: UserDto }>(`${environment.apiUrl}/auth/login`, {
        email,
        password,
      }),
    );
    sessionStorage.setItem(TOKEN_KEY, res.token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.userSignal.set(res.user);
  }

  logout(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    this.userSignal.set(null);
    this.router.navigate(['/login']);
  }
}
