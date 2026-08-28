import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { TicketForm } from './ticket-form';
import { TicketService } from '../../../core/services/ticket.service';

function setup(create: () => unknown) {
  const navigate = vi.fn(() => Promise.resolve(true));
  TestBed.configureTestingModule({
    providers: [
      { provide: TicketService, useValue: { create } },
      { provide: Router, useValue: { navigate } },
    ],
  });
  const form = TestBed.runInInjectionContext(() => new TicketForm());
  return { form, navigate };
}

describe('TicketForm', () => {
  it('sets error and resets busy when create() fails', () => {
    const { form } = setup(() =>
      throwError(() => new HttpErrorResponse({ error: { message: 'boom' }, status: 500, url: '' })),
    );
    form.title.setValue('Titel');
    form.description.setValue('Beschreibung');
    form.submit();
    expect(form.error()).toBeTruthy();
    expect(form.busy()).toBe(false);
  });

  it('navigates to the new ticket and resets busy on success', () => {
    const { form, navigate } = setup(() => of({ id: 7 }));
    form.title.setValue('Titel');
    form.description.setValue('Beschreibung');
    form.submit();
    expect(navigate).toHaveBeenCalledWith(['/tickets', 7]);
    expect(form.busy()).toBe(false);
    expect(form.error()).toBeNull();
  });
});
