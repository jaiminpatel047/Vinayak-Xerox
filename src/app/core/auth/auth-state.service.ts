import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Session } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';

const PUBLIC_URL_PREFIXES = ['/login', '/register', '/forgot-password', '/reset-password'];

/**
 * Keeps track of the current Supabase session.
 * Supabase stores and refreshes the session itself; we only mirror it
 * into signals and react to sign-out / expiry / password recovery.
 */
@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly router = inject(Router);

  private readonly sessionSignal = signal<Session | null>(null);
  private readonly readySignal = signal(false);
  private readonly ready: Promise<void>;

  readonly session = this.sessionSignal.asReadonly();
  readonly user = computed(() => this.sessionSignal()?.user ?? null);
  readonly isLoggedIn = computed(() => this.sessionSignal() !== null);
  /** True once the stored session (or one from an email link) has been checked. */
  readonly isReady = this.readySignal.asReadonly();

  constructor() {
    this.ready = this.supabase.auth
      .getSession()
      .then(({ data }) => this.sessionSignal.set(data.session))
      .catch((error: unknown) => {
        console.error('Could not restore session', error);
        this.sessionSignal.set(null);
      })
      .finally(() => this.readySignal.set(true));

    // Note: do not await other Supabase calls inside this callback (it can deadlock).
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.sessionSignal.set(session);

      if (event === 'PASSWORD_RECOVERY') {
        void this.router.navigateByUrl('/reset-password');
        return;
      }

      // Logged out in another tab, or the session expired and could not be refreshed.
      if (event === 'SIGNED_OUT' && !this.isOnPublicPage()) {
        void this.router.navigateByUrl('/login');
      }
    });
  }

  /** Resolves once the stored session (if any) has been loaded. */
  whenReady(): Promise<void> {
    return this.ready;
  }

  private isOnPublicPage(): boolean {
    const url = this.router.url;
    return PUBLIC_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
  }
}
