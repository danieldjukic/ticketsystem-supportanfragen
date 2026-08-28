import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, RouterLink],
  template: `
    <mat-card>
      <mat-card-title>Registrieren</mat-card-title>
      <form (ngSubmit)="submit()">
        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <input matInput [formControl]="name" maxlength="100" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>E-Mail</mat-label>
          <input matInput [formControl]="email" type="email" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Passwort (mind. 8 Zeichen)</mat-label>
          <input matInput [formControl]="password" type="password" />
        </mat-form-field>
        @if (error()) {
          <p class="error-message">{{ error() }}</p>
        }
        <div class="actions">
          <a mat-button routerLink="/login">Login</a>
          <button mat-raised-button color="primary" type="button" (click)="submit()" [disabled]="busy()">
            Registrieren
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
export class Register {
  private auth = inject(AuthService);
  private router = inject(Router);

  name = new FormControl('');
  email = new FormControl('');
  password = new FormControl('');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  submit(): void {
    if (this.busy()) return;
    const name = this.name.value ?? '';
    const email = this.email.value ?? '';
    const password = this.password.value ?? '';

    if (name.trim().length < 1 || name.length > 100) return this.error.set('Name muss 1–100 Zeichen haben.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return this.error.set('Gültige E-Mail-Adresse eingeben.');
    if (password.length < 8) return this.error.set('Passwort muss mind. 8 Zeichen haben.');

    this.busy.set(true);
    this.error.set(null);
    this.auth
      .register(name, email, password)
      .then(() => this.router.navigate(['/login']))
      .catch((err) => {
        const msg =
          err?.error?.error === 'Conflict'
            ? 'Diese E-Mail ist bereits registriert.'
            : 'Registrierung fehlgeschlagen, bitte Angaben prüfen.';
        this.error.set(msg);
      })
      .finally(() => this.busy.set(false));
  }
}
