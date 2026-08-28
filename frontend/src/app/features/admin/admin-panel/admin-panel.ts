import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

import { TicketService } from '../../../core/services/ticket.service';
import {
  ALLOWED_TRANSITIONS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TicketDto,
  TicketStatus,
  UserListItemDto,
} from '../../../core/models';

@Component({
  selector: 'app-admin-panel',
  imports: [MatCardModule, MatSelectModule, MatButtonModule],
  template: `
    <h1>Admin – Alle Tickets</h1>

    <mat-card>
      @if (error()) {
        <p class="error-message">{{ error() }}</p>
      } @if (tickets().length === 0) {
        <p>Keine Tickets vorhanden.</p>
      } @else {
        <table class="ticket-table">
          <thead>
            <tr>
              <th>#</th><th>Titel</th><th>Erstellt von</th><th>Status</th>
              <th>Priorität</th><th>Zuweisung</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (t of tickets(); track t.id) {
              <tr>
                <td>{{ t.id }}</td>
                <td>{{ t.title }}</td>
                <td>{{ t.created_by.name }}</td>
                <td><span class="chip" [class]="'chip chip-status-' + t.status">{{ statusLabels[t.status] }}</span></td>
                <td>{{ priorityLabels[t.priority] }}</td>
                <td>
                  <mat-select [value]="t.assigned_to?.id ?? null" placeholder="Nicht zugewiesen" (selectionChange)="assign(t, $event.value)" [disabled]="t.status === 'closed'">
                    <mat-option [value]="null">–</mat-option>
                    @for (u of users(); track u.id) {
                      <mat-option [value]="u.id">{{ u.name }}</mat-option>
                    }
                  </mat-select>
                </td>
                <td class="actions">
                  @for (s of transitions(t); track s) {
                    <button mat-button (click)="changeStatus(t, s)" [disabled]="busy()">{{ statusLabels[s] }}</button>
                  }
                  @if (t.status !== 'closed') {
                    <button mat-stroked-button color="warn" (click)="closeTicket(t)" [disabled]="busy()">Schliessen</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </mat-card>
  `,
  styles: [
    `
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 10px 8px; text-align: left; border-bottom: 1px solid #e0e0e0; }
      h1 { font-size: 24px; font-weight: 500; }
      .actions { white-space: nowrap; }
    `,
  ],
})
export class AdminPanel {
  private ticketService = inject(TicketService);

  readonly statusLabels = STATUS_LABELS;
  readonly priorityLabels = PRIORITY_LABELS;

  readonly tickets = signal<TicketDto[]>([]);
  readonly users = signal<UserListItemDto[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.ticketService.list({}).pipe(takeUntilDestroyed()).subscribe({
      next: (t) => this.tickets.set(t),
      error: () => this.error.set('Tickets konnten nicht geladen werden.'),
    });
    this.ticketService.listUsers().pipe(takeUntilDestroyed()).subscribe({
      next: (u) => this.users.set(u),
      error: () => this.error.set('Userliste konnte nicht geladen werden.'),
    });
  }

  transitions(t: TicketDto): TicketStatus[] {
    return ALLOWED_TRANSITIONS[t.status].filter((s) => s !== 'closed');
  }

  private refresh(t: TicketDto): void {
    this.tickets.update((all) => all.map((x) => (x.id === t.id ? t : x)));
  }

  changeStatus(t: TicketDto, status: TicketStatus): void {
    this.busy.set(true);
    this.ticketService
      .patch(t.id, { status })
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (updated) => this.refresh(updated),
        error: () => this.error.set('Statuswechsel fehlgeschlagen.'),
      });
  }

  assign(t: TicketDto, userId: number | null): void {
    this.busy.set(true);
    this.ticketService
      .patch(t.id, { assigned_to: userId })
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (updated) => this.refresh(updated),
        error: () => this.error.set('Zuweisung fehlgeschlagen.'),
      });
  }

  closeTicket(t: TicketDto): void {
    this.busy.set(true);
    this.ticketService
      .close(t.id)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (updated) => this.refresh(updated),
        error: () => this.error.set('Ticket konnte nicht geschlossen werden.'),
      });
  }
}
