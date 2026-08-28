import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tickets' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },
  {
    path: 'tickets',
    canActivate: [authGuard],
    loadComponent: () => import('./features/tickets/ticket-list/ticket-list').then((m) => m.TicketList),
  },
  {
    path: 'tickets/new',
    canActivate: [authGuard],
    loadComponent: () => import('./features/tickets/ticket-form/ticket-form').then((m) => m.TicketForm),
  },
  {
    path: 'tickets/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/tickets/ticket-detail/ticket-detail').then((m) => m.TicketDetail),
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./features/admin/admin-panel/admin-panel').then((m) => m.AdminPanel),
  },
  { path: '**', redirectTo: 'tickets' },
];
