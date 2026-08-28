import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';

import { TicketService } from '../../../core/services/ticket.service';
import { UserListItemDto } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import {
  ALLOWED_TRANSITIONS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_PRIORITIES,
  TicketDto,
  TicketPriority,
  TicketStatus,
} from '../../../core/models';

@Component({
  selector: 'app-ticket-detail',
  imports: [ReactiveFormsModule, RouterLink, MatCardModule, MatSelectModule, MatButtonModule, MatChipsModule, MatInputModule],
  template: `
    @if (ticket() === null) {
      <p class="error-message">Ticket konnte nicht geladen werden (existiert nicht oder kein Zugriff).</p>
    } @else {
      <a mat-button routerLink="/tickets">← Zurück zur Liste</a>

      <mat-card>
        <mat-card-title>{{ ticket()!.title }}</mat-card-title>

        <div class="meta">
          <mat-chip-set>
            <mat-chip selected>{{ statusLabels[ticket()!.status] }}</mat-chip>
            <mat-chip selected>{{ priorityLabels[ticket()!.priority] }}</mat-chip>
          </mat-chip-set>
          <span>Erstellt von {{ ticket()!.created_by.name }} am {{ format(ticket()!.created_at) }}</span>
          @if (ticket()!.assigned_to) {
            <span> · Bearbeitet von {{ ticket()!.assigned_to!.name }}</span>
          }
          @if (ticket()!.closed_at) {
            <span> · Geschlossen am {{ format(ticket()!.closed_at!) }}</span>
          }
        </div>

        <p class="description">{{ ticket()!.description }}</p>

        @if (error()) {
          <p class="error-message">{{ error() }}</p>
        }
        @if (success()) {
          <p class="success-message">{{ success() }}</p>
        }

        @if (canAdminister() || canEditContent()) {
          <mat-card class="edit-card">
            <mat-card-title>Bearbeiten</mat-card-title>
            @if (canAdminister()) {
              <div class="edit-row">
                <mat-select [formControl]="assigneeControl" placeholder="Bearbeiter zuweisen" (selectionChange)="changeAssignee($event.value)">
                  <mat-option [value]="null">Nicht zugewiesen</mat-option>
                  @for (u of assignees(); track u.id) {
                    <mat-option [value]="u.id">{{ u.name }} ({{ u.email }})</mat-option>
                  }
                </mat-select>
              </div>
              <div class="edit-row">
                <mat-select [formControl]="statusControl" placeholder="Status" (selectionChange)="changeStatus($event.value)">
                  @for (s of statusTransitions(); track s) {
                    <mat-option [value]="s">{{ statusLabels[s] }}</mat-option>
                  }
                </mat-select>
              </div>
            }
            @if (canEditContent()) {
              <div class="edit-row">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Beschreibung</mat-label>
                  <textarea matInput [formControl]="descriptionControl" rows="4"></textarea>
                </mat-form-field>
                <button mat-stroked-button color="primary" (click)="saveDescription()" [disabled]="busy() || !descriptionControl.valid">
                  Speichern
                </button>
              </div>
              <div class="edit-row">
                <mat-select [formControl]="priorityControl" placeholder="Priorität" (selectionChange)="changePriority()">
                  @for (p of priorities; track p) {
                    <mat-option [value]="p">{{ priorityLabels[p] }}</mat-option>
                  }
                </mat-select>
              </div>
            }
          </mat-card>
        }
        @if (canClose()) {
          <div class="close-row">
            <button mat-stroked-button color="warn" (click)="closeTicket()" [disabled]="busy()">
              Ticket schliessen
            </button>
          </div>
        }
      </mat-card>
    }
  `,
  styles: [
    `
      .meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; color: rgba(0,0,0,.7); margin-bottom: 12px; }
      .description { white-space: pre-wrap; }
      .edit-card { margin-top: 16px; background: #f5f5f5; }
      .close-row { margin-top: 12px; }
      .edit-row { display: flex; gap: 12px; align-items: center; }
      .full-width { width: 100%; }
    `,
  ],
})
export class TicketDetail {
  private ticketService = inject(TicketService);
  readonly auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly statusLabels = STATUS_LABELS;
  readonly priorityLabels = PRIORITY_LABELS;
  readonly priorities = TICKET_PRIORITIES;

  readonly ticket = signal<TicketDto | null>(null);
  readonly descriptionControl = new FormControl<string>('', { nonNullable: true });
  readonly priorityControl = new FormControl<TicketPriority>('medium');
  readonly statusControl = new FormControl<TicketStatus | null>(null);
  readonly busy = signal(false);
  readonly assigneeControl = new FormControl<number | null>(null);
  readonly assignees = signal<UserListItemDto[]>([]);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id)) {
      this.router.navigate(['/tickets']);
      return;
    }
    this.ticketService.get(id).pipe(takeUntilDestroyed()).subscribe({
      next: (t) => {
        this.ticket.set(t);
        this.descriptionControl.setValue(t.description);
        this.priorityControl.setValue(t.priority);
        this.assigneeControl.setValue(t.assigned_to?.id ?? null);
      },
      error: () => this.ticket.set(null),
    });
    if (this.auth.isAdmin()) {
      this.ticketService.listUsers().pipe(takeUntilDestroyed()).subscribe({
        next: (users) => this.assignees.set(users),
        error: () => this.assignees.set([]),
      });
    }
  }

  changeAssignee(userId: number | null): void {
    this.patch({ assigned_to: userId }).then(() =>
      this.success.set(userId ? 'Ticket zugewiesen.' : 'Zuweisung entfernt.'),
    );
  }

  canEditContent(): boolean {
    const t = this.ticket();
    if (!t || t.status === 'closed') return false;
    return t.created_by.id === this.auth.user()?.id;
  }

  canAdminister(): boolean {
    const t = this.ticket();
    if (!t || t.status === 'closed') return false;
    return this.auth.isAdmin();
  }

  canClose(): boolean {
    const t = this.ticket();
    if (!t || t.status === 'closed') return false;
    if (this.auth.isAdmin()) return true;
    return t.created_by.id === this.auth.user()?.id;
  }

  statusTransitions(): TicketStatus[] {
    const t = this.ticket();
    if (!t || !this.auth.isAdmin()) return [];
    return ALLOWED_TRANSITIONS[t.status].filter((s) => s !== 'closed');
  }

  changeStatus(status: TicketStatus | null): void {
    const t = this.ticket();
    if (!t || !status) return;
    this.patch({ status }).then(() => this.success.set('Status aktualisiert.'));
  }

  changePriority(): void {
    const priority = this.priorityControl.value ?? 'medium';
    this.patch({ priority }).then(() => this.success.set('Priorität aktualisiert.'));
  }

  saveDescription(): void {
    const description = this.descriptionControl.value;
    if (!description) return;
    this.patch({ description }).then(() => this.success.set('Beschreibung aktualisiert.'));
  }

  closeTicket(): void {
    const t = this.ticket();
    if (!t) return;
    this.busy.set(true);
    this.ticketService
      .close(t.id)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (updated) => {
          this.ticket.set(updated);
          this.success.set('Ticket geschlossen.');
        },
        error: () => this.error.set('Ticket konnte nicht geschlossen werden.'),
      });
  }

  private patch(body: Record<string, unknown>): Promise<void> {
    const t = this.ticket()!;
    this.busy.set(true);
    this.error.set(null);
    return new Promise((resolve, reject) => {
      this.ticketService
        .patch(t.id, body)
        .pipe(finalize(() => this.busy.set(false)))
        .subscribe({
          next: (updated) => {
            this.ticket.set(updated);
            resolve();
          },
          error: (err) => {
            this.error.set(err?.error?.message ?? 'Änderung fehlgeschlagen.');
            reject(err);
          },
        });
    });
  }

  format(iso: string): string {
    return new Date(iso).toLocaleString('de-CH');
  }
}
