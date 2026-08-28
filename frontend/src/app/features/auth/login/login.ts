import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, RouterLink],
  template: `
    <mat-card>
      <mat-card-title>Login</mat-card-title>
      <form (ngSubmit)="submit()">
        <mat-form-field appearance="outline">
          <mat-label>E-Mail</mat-label>
          <input matInput [formControl]="email" type="email" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Passwort</mat-label>
          <input matInput [formControl]="password" type="password" />
        </mat-form-field>
        @if (error()) {
          <p class="error-message">{{ error() }}</p>
        }
        <div class="actions">
          <a mat-button routerLink="/register">Registrieren</a>
          <button mat-raised-button color="primary" type="button" (click)="submit()" [disabled]="busy()">
            Anmelden
          </button>
        </div>
      </form>
    </mat-card>
  `,
  styles: [
    `
      mat-card { max-width: 420px; margin: 48px auto; }
      mat-form-field { width: 100%; }
      .actions { display: flex; justify-content: space-between; }
    `,
  ],
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = new FormControl('');
  password = new FormControl('');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  submit(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);

    this.auth
      .login(this.email.value ?? '', this.password.value ?? '')
      .then(() => this.router.navigate(['/tickets']))
      .catch(() => this.error.set('Ungültige E-Mail/Passwort-Kombination.'))
      .finally(() => this.busy.set(false));
  }
}