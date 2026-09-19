import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { LogoutService } from '../../layout/logout.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ToastService } from '../../shared/services/toast.service';
import { friendlyError } from '../../shared/utils/error.utils';

@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule, IconComponent, LoadingSpinnerComponent],
  template: `
    <div class="page page-narrow">
      <div class="page-header">
        <h1 class="page-title">Settings</h1>
      </div>

      <div class="stack">
        <section class="card">
          <h2 class="card-title">Shop Details</h2>

          @if (loading()) {
            <app-loading-spinner message="Loading profile..." />
          } @else {
            <form class="form-grid" [formGroup]="form" (ngSubmit)="save()" novalidate>
              <div class="field">
                <label for="s-shop">Shop Name</label>
                <input id="s-shop" class="input" type="text" maxlength="120" formControlName="shop_name" placeholder="e.g. ABC Xerox" />
              </div>
              <div class="field">
                <label for="s-name">Owner Name</label>
                <input id="s-name" class="input" type="text" maxlength="120" autocomplete="name" formControlName="full_name" />
              </div>
              <div class="field">
                <label for="s-phone">Phone</label>
                <input
                  id="s-phone"
                  class="input"
                  type="tel"
                  inputmode="tel"
                  autocomplete="tel"
                  maxlength="20"
                  formControlName="phone"
                  [class.invalid]="form.controls.phone.invalid && form.controls.phone.touched"
                />
                @if (form.controls.phone.invalid && form.controls.phone.touched) {
                  <p class="error-text">Please enter a valid phone number.</p>
                }
              </div>
              <div class="form-actions">
                <button type="submit" class="btn btn-primary btn-lg" [disabled]="saving()">
                  {{ saving() ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </form>
          }
        </section>

        <section class="card account">
          <div>
            <h2 class="card-title">Account</h2>
            <p class="muted">Logged in as {{ email() }}</p>
          </div>
          <button
            type="button"
            class="btn btn-danger btn-lg"
            [disabled]="logoutService.busy()"
            (click)="logoutService.logout()"
          >
            <app-icon name="logout" /> Logout
          </button>
        </section>
      </div>
    </div>
  `,
  styles: `
    .account { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
    .account .card-title { margin-bottom: 4px; }
    .account p { margin: 0; word-break: break-all; }
  `,
})
export class SettingsComponent implements OnInit {
  private readonly profiles = inject(ProfileService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly logoutService = inject(LogoutService);

  protected readonly form = new FormGroup({
    shop_name: new FormControl('', { nonNullable: true }),
    full_name: new FormControl('', { nonNullable: true }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(/^[+\d][\d\s-]{5,18}$/)],
    }),
  });

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly email = computed(() => this.auth.currentUser()?.email ?? '');

  async ngOnInit(): Promise<void> {
    try {
      const profile = await this.profiles.getProfile();
      this.form.reset({
        shop_name: profile?.shop_name ?? '',
        full_name: profile?.full_name ?? '',
        phone: profile?.phone ?? '',
      });
    } catch (error) {
      this.toast.error(friendlyError(error, 'Unable to load your profile.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    const value = this.form.getRawValue();
    try {
      await this.profiles.updateProfile({
        shop_name: value.shop_name.trim() || null,
        full_name: value.full_name.trim() || null,
        phone: value.phone.trim() || null,
      });
      this.form.markAsPristine();
      this.toast.success('Settings saved successfully.');
    } catch (error) {
      this.toast.error(friendlyError(error, 'Unable to save settings. Please try again.'));
    } finally {
      this.saving.set(false);
    }
  }
}
