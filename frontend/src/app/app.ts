import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule],
  template: `
    <mat-toolbar color="primary">
      <a class="brand" routerLink="/tickets">Ticketing</a>
      <span class="spacer"></span>
      @if (auth.isLoggedIn()) {
        <a mat-button routerLink="/tickets" routerLinkActive="active">Tickets</a>
        @if (auth.isAdmin()) {
          <a mat-button routerLink="/admin" routerLinkActive="active">Admin</a>
        }
        <button mat-button (click)="auth.logout()">
          {{ auth.user()?.name }} · Abmelden
        </button>
      } @else {
        <a mat-button routerLink="/login">Login</a>
        <a mat-button routerLink="/register">Registrieren</a>
      }
    </mat-toolbar>
    <div class="container">
      <router-outlet />
    </div>
  `,
  styles: [
    `
      .brand {
        font-weight: 600;
        margin-right: 24px;
        text-decoration: none;
        color: inherit;
      }
      .spacer {
        flex: 1;
      }
      .container {
        max-width: 960px;
        margin: 24px auto 48px;
        padding: 0 16px;
      }
    `,
  ],
})
export class App {
  constructor(public auth: AuthService) {}
}
