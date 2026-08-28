import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { combineLatest, startWith, switchMap } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

import { TicketService } from '../../../core/services/ticket.service';
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TicketDto,
} from '../../../core/models';

@Component({
  selector: 'app-ticket-list',
  imports: [ReactiveFormsModule, RouterLink, MatCardModule, MatSelectModule, MatButtonModule],
  template: `
    <div class="header">
      <h1>Meine Tickets</h1>
      <a mat-raised-button color="primary" routerLink="/tickets/new">Neues Ticket</a>
    </div>

    <mat-card>
      <div class="filters">
        <mat-select [formControl]="statusFilter" placeholder="Status (alle)">
          <mat-option [value]="null">Alle</mat-option>
          @for (s of statuses; track s) {
            <mat-option [value]="s">{{ statusLabels[s] }}</mat-option>
          }
        </mat-select>
        <mat-select [formControl]="priorityFilter" placeholder="Priorität (alle)">
          <mat-option [value]="null">Alle</mat-option>
          @for (p of priorities; track p) {
            <mat-option [value]="p">{{ priorityLabels[p] }}</mat-option>
          }
        </mat-select>
      </div>

      @if (error()) {
        <p class="error-message">{{ error() }}</p>
      } @else if (tickets().length === 0) {
        <p>Keine Tickets gefunden.</p>
      } @else {
        <table class="ticket-table">
          <thead>
            <tr>
              <th>Titel</th><th>Status</th><th>Priorität</th><th>Erstellt von</th><th>Erstellt am</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (t of tickets(); track t.id) {
              <tr>
                <td><a [routerLink]="['/tickets', t.id]">{{ t.title }}</a></td>
                <td><span class="chip" [class]="'chip chip-status-' + t.status">{{ statusLabels[t.status] }}</span></td>
                <td><span class="chip" [class]="'chip chip-priority-' + t.priority">{{ priorityLabels[t.priority] }}</span></td>
                <td>{{ t.created_by.name }}</td>
                <td>{{ format(t.created_at) }}</td>
                <td class="actions"><button mat-button [routerLink]="['/tickets', t.id]">Öffnen</button></td>
              </tr>
            }
          </tbody>
        </table>
      }
    </mat-card>
  `,
  styles: [
    `
      .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
      h1 { margin: 0; font-size: 24px; font-weight: 500; }
      .filters { display: flex; gap: 12px; margin-bottom: 16px; }
      .ticket-table { width: 100%; border-collapse: collapse; }
      .ticket-table th, .ticket-table td { padding: 10px 8px; text-align: left; border-bottom: 1px solid #e0e0e0; }
      .actions { text-align: right; }
    `,
  ],
})
export class TicketList implements OnInit {
  private ticketService = inject(TicketService);

  readonly statuses = TICKET_STATUSES;
  readonly priorities = TICKET_PRIORITIES;
  readonly statusLabels = STATUS_LABELS;
  readonly priorityLabels = PRIORITY_LABELS;

  readonly statusFilter = new FormControl<string | null>(null);
  readonly priorityFilter = new FormControl<string | null>(null);
  readonly tickets = signal<TicketDto[]>([]);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    combineLatest([
      this.statusFilter.valueChanges.pipe(startWith(this.statusFilter.value)),
      this.priorityFilter.valueChanges.pipe(startWith(this.priorityFilter.value)),
    ])
      .pipe(
        switchMap(([status, priority]) =>
          this.ticketService.list({
            status: status ?? undefined,
            priority: priority ?? undefined,
          }),
        ),
      )
      .subscribe({
        next: (tickets) => {
          this.error.set(null);
          this.tickets.set(tickets);
        },
        error: () => this.error.set('Tickets konnten nicht geladen werden.'),
      });
  }

  format(iso: string): string {
    return new Date(iso).toLocaleString('de-CH');
  }
}