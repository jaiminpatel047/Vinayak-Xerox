import { Component, inject, input } from '@angular/core';
import { SupabaseService } from '../../core/supabase/supabase.service';

/** Centered card used by login, register and password pages. */
@Component({
  selector: 'app-auth-shell',
  template: `
    <main class="auth">
      <div class="brand">
        <span class="logo" aria-hidden="true">₹</span>
        <strong>Shop Ledger</strong>
      </div>
      <div class="card box">
        <h1>{{ heading() }}</h1>
        @if (subheading()) {
          <p class="muted sub">{{ subheading() }}</p>
        }
        @if (!configured) {
          <p class="alert">
            Supabase is not set up yet. Add your project URL and anon key in
            <code>src/environments/</code> (see README).
          </p>
        }
        <ng-content />
      </div>
    </main>
  `,
  styles: `
    .auth {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
      padding: 24px 16px;
    }
    .brand { display: flex; align-items: center; gap: 10px; font-size: 1.4rem; }
    .logo {
      display: grid; place-items: center; width: 44px; height: 44px;
      border-radius: 12px; background: var(--primary); color: #fff; font-weight: 700;
    }
    .box { width: min(420px, 100%); padding: 28px 24px; display: grid; gap: 18px; }
    h1 { font-size: 1.5rem; }
    .sub { margin: -10px 0 0; }
    .alert { margin: 0; }
  `,
})
export class AuthShellComponent {
  readonly heading = input.required<string>();
  readonly subheading = input('');

  protected readonly configured = inject(SupabaseService).isConfigured;
}
