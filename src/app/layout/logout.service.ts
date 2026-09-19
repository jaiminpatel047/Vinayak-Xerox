import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { ProfileService } from '../core/services/profile.service';
import { ToastService } from '../shared/services/toast.service';
import { friendlyError } from '../shared/utils/error.utils';

/** Shared by the header and the settings page. */
@Injectable({ providedIn: 'root' })
export class LogoutService {
  private readonly auth = inject(AuthService);
  private readonly profiles = inject(ProfileService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly busy = signal(false);

  async logout(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.auth.logout();
      this.profiles.clear();
      await this.router.navigateByUrl('/login');
    } catch (error) {
      this.toast.error(friendlyError(error, 'Unable to log out. Please try again.'));
    } finally {
      this.busy.set(false);
    }
  }
}
