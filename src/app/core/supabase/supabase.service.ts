import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Database } from './database.types';

/**
 * The one and only Supabase client for the whole app.
 * Uses the public anon key only; data security is enforced by RLS.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient<Database>;

  /** False while environment files still contain the placeholder values. */
  readonly isConfigured =
    Boolean(environment.supabaseUrl) &&
    Boolean(environment.supabaseAnonKey) &&
    !environment.supabaseUrl.includes('abcdefghijklmnop') &&
    !environment.supabaseUrl.includes('YOUR_PROJECT') &&
    !environment.supabaseAnonKey.includes('your anon key');

  constructor() {
    if (!this.isConfigured) {
      console.warn(
        'Supabase is not configured. Add your project URL and anon key to src/environments/.',
      );
    }

    const cleanUrl = (environment.supabaseUrl || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

    this.client = createClient<Database>(cleanUrl, environment.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
}
