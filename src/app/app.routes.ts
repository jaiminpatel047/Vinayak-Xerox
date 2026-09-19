import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { AppLayoutComponent } from './layout/app-layout/app-layout.component';

export const routes: Routes = [
  // ---- Public pages ----
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Login - Shop Ledger',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    title: 'Create account - Shop Ledger',
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    title: 'Forgot password - Shop Ledger',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    // Opened from the password reset email; Supabase signs the user in first.
    path: 'reset-password',
    title: 'Set new password - Shop Ledger',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },

  // ---- Logged-in pages ----
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard - Shop Ledger',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },

      // Income
      {
        path: 'income',
        title: 'Income - Shop Ledger',
        data: { type: 'income' },
        loadComponent: () =>
          import('./features/transactions/transaction-list/transaction-list.component').then(
            (m) => m.TransactionListComponent,
          ),
      },
      {
        path: 'income/new',
        title: 'Add Income - Shop Ledger',
        data: { type: 'income' },
        loadComponent: () =>
          import('./features/transactions/transaction-edit/transaction-edit.component').then(
            (m) => m.TransactionEditComponent,
          ),
      },
      {
        path: 'income/:id/edit',
        title: 'Edit Income - Shop Ledger',
        data: { type: 'income' },
        loadComponent: () =>
          import('./features/transactions/transaction-edit/transaction-edit.component').then(
            (m) => m.TransactionEditComponent,
          ),
      },

      // Expenses
      {
        path: 'expenses',
        title: 'Expenses - Shop Ledger',
        data: { type: 'expense' },
        loadComponent: () =>
          import('./features/transactions/transaction-list/transaction-list.component').then(
            (m) => m.TransactionListComponent,
          ),
      },
      {
        path: 'expenses/new',
        title: 'Add Expense - Shop Ledger',
        data: { type: 'expense' },
        loadComponent: () =>
          import('./features/transactions/transaction-edit/transaction-edit.component').then(
            (m) => m.TransactionEditComponent,
          ),
      },
      {
        path: 'expenses/:id/edit',
        title: 'Edit Expense - Shop Ledger',
        data: { type: 'expense' },
        loadComponent: () =>
          import('./features/transactions/transaction-edit/transaction-edit.component').then(
            (m) => m.TransactionEditComponent,
          ),
      },

      // Combined history (type chosen on the page)
      {
        path: 'transactions',
        title: 'All Transactions - Shop Ledger',
        data: { type: null },
        loadComponent: () =>
          import('./features/transactions/transaction-list/transaction-list.component').then(
            (m) => m.TransactionListComponent,
          ),
      },

      {
        path: 'reports',
        title: 'Reports - Shop Ledger',
        loadComponent: () =>
          import('./features/reports/reports.component').then((m) => m.ReportsComponent),
      },
      {
        path: 'settings',
        title: 'Settings - Shop Ledger',
        loadComponent: () =>
          import('./features/settings/settings.component').then((m) => m.SettingsComponent),
      },
    ],
  },

  { path: '**', redirectTo: 'dashboard' },
];
