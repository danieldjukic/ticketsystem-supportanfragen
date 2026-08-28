export type UserRole = 'user' | 'admin';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high';

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: Date;
}

export interface TicketRow {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_by: number;
  assigned_to: number | null;
  created_at: Date;
  updated_at: Date;
  closed_at: Date | null;
}

export interface UserDto {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface UserListItemDto {
  id: number;
  name: string;
  email: string;
}

export interface PersonDto {
  id: number;
  name: string;
}

export interface TicketDto {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_by: PersonDto;
  assigned_to: PersonDto | null;
  created_at: Date | string;
  updated_at: Date | string;
  closed_at: Date | string | null;
}

export const TICKET_STATUSES: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
export const TICKET_PRIORITIES: TicketPriority[] = ['low', 'medium', 'high'];

export const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ['in_progress', 'closed'],
  in_progress: ['resolved', 'closed'],
  resolved: ['closed'],
  closed: [],
};

export interface AuthPayload {
  sub: number;
  role: UserRole;
  iat: number;
  exp: number;
}
