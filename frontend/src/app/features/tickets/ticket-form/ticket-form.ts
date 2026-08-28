import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

import { TicketService } from '../../../core/services/ticket.service';
import { PRIORITY_LABELS, TICKET_PRIORITIES, TicketPriority } from '../../../core/models';

@Component({
  selector: 'app-ticket-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  template: `
    <mat-card>
      <mat-card-title>Neues Ticket</mat-card-title>
      <form (ngSubmit)="submit()">
        <mat-form-field appearance="outline">
          <mat-label>Titel</mat-label>
          <input matInput [formControl]="title" maxlength="200" required />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Beschreibung</mat-label>
          <textarea matInput [formControl]="description" rows="5" required></textarea>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Priorität</mat-label>
          <mat-select [formControl]="priority">
            @for (p of priorities; track p) {
              <mat-option [value]="p">{{ priorityLabels[p] }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        @if (error()) {
          <p class="error-message">{{ error() }}</p>
        }
        <div class="actions">
          <a mat-button routerLink="/tickets">Abbrechen</a>
          <button mat-raised-button color="primary" type="button" (click)="submit()" [disabled]="busy()">
            Ticket erstellen
          </button>
        </div>
      </form>
    </mat-card>
  `,
  styles: [
    `
      mat-card { max-width: 560px; margin: 24px auto; }
      mat-form-field { width: 100%; }
      .actions { display: flex; justify-content: flex-end; gap: 8px; }
    `,
  ],
})
export class TicketForm {
  private ticketService = inject(TicketService);
  private router = inject(Router);

  readonly priorities = TICKET_PRIORITIES;
  readonly priorityLabels = PRIORITY_LABELS;

  title = new FormControl('');
  description = new FormControl('');
  priority = new FormControl<TicketPriority>('medium');

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  submit(): void {
    if (this.busy()) return;
    const title = (this.title.value ?? '').trim();
    const description = (this.description.value ?? '').trim();
    if (!title || title.length > 200 || !description) {
      this.error.set('Titel (1–200 Zeichen) und Beschreibung sind Pflichtfelder.');
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    this.ticketService
      .create({ title, description, priority: this.priority.value ?? 'medium' })
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (ticket) => this.router.navigate(['/tickets', ticket.id]),
        error: () => this.error.set('Ticket konnte nicht erstellt werden.'),
      });
  }
}
