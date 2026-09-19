import { inject, Injectable, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { Profile, ProfileChanges } from '../models/profile.model';
import { SupabaseService } from '../supabase/supabase.service';

const COLUMNS = 'id, full_name, shop_name, phone, created_at, updated_at';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);

  private readonly profileSignal = signal<Profile | null>(null);

  /** Last loaded profile, shared by the header, dashboard and PDF. */
  readonly profile = this.profileSignal.asReadonly();

  async getProfile(): Promise<Profile | null> {
    const user = await this.auth.getVerifiedUser();

    const { data, error } = await this.supabase
      .from('profiles')
      .select(COLUMNS)
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;
    this.profileSignal.set(data);
    return data;
  }

  /** Updates (or creates, if missing) the logged-in user's profile. */
  async updateProfile(changes: ProfileChanges): Promise<Profile> {
    const user = await this.auth.getVerifiedUser();

    const { data, error } = await this.supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: changes.full_name,
        shop_name: changes.shop_name,
        phone: changes.phone,
      })
      .select(COLUMNS)
      .single();

    if (error) throw error;
    this.profileSignal.set(data);
    return data;
  }

  clear(): void {
    this.profileSignal.set(null);
  }
}
