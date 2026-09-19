import { inject, Injectable } from '@angular/core';
import { AuthError, User } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthStateService } from './auth-state.service';

export interface SignUpResult {
  /** False when Supabase requires the user to confirm their email first. */
  loggedIn: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly authState = inject(AuthStateService);

  readonly session = this.authState.session;
  readonly currentUser = this.authState.user;

  async login(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signUp(
    email: string,
    password: string,
    fullName: string,
    shopName: string,
  ): Promise<SignUpResult> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, shop_name: shopName },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) throw error;
    return { loggedIn: data.session !== null };
  }

  async logout(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  async sendPasswordReset(email: string): Promise<void> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }

  async updatePassword(password: string): Promise<void> {
    const { error } = await this.supabase.auth.updateUser({ password });
    if (error) throw error;
  }

  /**
   * Returns the user verified by the Supabase server (not just the cached session).
   * Used before inserts so we never rely on a stale or client-supplied id.
   */
  async getVerifiedUser(): Promise<User> {
    const { data, error } = await this.supabase.auth.getUser();
    if (error || !data.user) {
      throw error ?? new Error('Not logged in');
    }
    return data.user;
  }
}

/** Maps Supabase auth errors to simple messages for the login page. */
export function authErrorMessage(error: unknown): string | null {
  if (!(error instanceof AuthError)) return null;
  const code = error.code ?? '';
  if (code === 'invalid_credentials') return 'Incorrect email or password.';
  if (code === 'email_not_confirmed') return 'Please confirm your email address first.';
  if (code === 'user_already_exists') return 'An account with this email already exists.';
  if (code === 'weak_password') return 'Please choose a stronger password (at least 6 characters).';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') {
    return 'Too many attempts. Please wait a minute and try again.';
  }
  if (code === 'same_password') return 'New password must be different from the old one.';
  return null;
}
