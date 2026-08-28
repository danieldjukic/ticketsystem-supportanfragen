import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { TicketDto, TicketPriority, UserListItemDto } from '../models';

import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TicketService {
  constructor(private http: HttpClient) {}

  list(params: { status?: string | null; priority?: string | null } = {}): Observable<TicketDto[]> {
    const query: { status?: string; priority?: string } = {};
    if (params.status) query.status = params.status;
    if (params.priority) query.priority = params.priority;
    return this.http.get<TicketDto[]>(`${environment.apiUrl}/tickets`, { params: query });
  }

  create(body: { title: string; description: string; priority?: TicketPriority }): Observable<TicketDto> {
    return this.http.post<TicketDto>(`${environment.apiUrl}/tickets`, body);
  }

  get(id: number): Observable<TicketDto> {
    return this.http.get<TicketDto>(`${environment.apiUrl}/tickets/${id}`);
  }

  patch(id: number, body: Record<string, unknown>): Observable<TicketDto> {
    return this.http.patch<TicketDto>(`${environment.apiUrl}/tickets/${id}`, body);
  }

  close(id: number): Observable<TicketDto> {
    return this.http.post<TicketDto>(`${environment.apiUrl}/tickets/${id}/close`, {});
  }

  listUsers(): Observable<UserListItemDto[]> {
    return this.http.get<UserListItemDto[]>(`${environment.apiUrl}/users`);
  }
}
