import { Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStateService } from '../../../core/auth/auth-state.service';
import { authErrorMessage, AuthService } from '../../../core/auth/auth.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ToastService } from '../../../shared/services/toast.service';
import { friendlyError } from '../../../shared/utils/error.utils';
import { AuthShellComponent } from '../auth-shell.component';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirm')?.value;
  return password && confirm && password !== confirm ? { mismatch: true } : null;
}

/** Reached from the reset email link; Supabase has already signed the user in. */
@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent, LoadingSpinnerComponent],
  template: `
    <app-auth-shell heading="Set new password">
      @if (!authState.isReady()) {
        <app-loading-spinner message="Checking reset link..." />
      } @else if (!hasSession()) {
        <p class="alert">
          This reset link is invalid or has expired. Please request a new one.
        </p>
        <a routerLink="/forgot-password" class="btn btn-primary btn-lg btn-block">Request new link</a>
      } @else {
        <form class="form-grid" [formGroup]="form" (ngSubmit)="save()" novalidate>
          @if (error()) {
            <p class="alert" role="alert">{{ error() }}</p>
          }
          <div class="field">
            <label for="password">New Password</label>
            <input id="password" class="input" type="password" autocomplete="new-password" formControlName="password" />
            @if (form.controls.password.invalid && form.controls.password.touched) {
              <p class="error-text">Password must be at least 6 characters.</p>
            }
          </div>
          <div class="field">
            <label for="confirm">Confirm Password</label>
            <input id="confirm" class="input" type="password" autocomplete="new-password" formControlName="confirm" />
            @if (form.hasError('mismatch') && form.controls.confirm.touched) {
              <p class="error-text">Passwords do not match.</p>
            }
          </div>
          <button type="submit" class="btn btn-primary btn-lg btn-block" [disabled]="loading()">
            {{ loading() ? 'Saving...' : 'Save new password' }}
          </button>
        </form>
      }
    </app-auth-shell>
  `,
})
export class ResetPasswordComponent {
  private readonly auth = inject(AuthService);
  protected readonly authState = inject(AuthStateService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly hasSession = computed(() => this.authState.isLoggedIn());

  protected readonly form = new FormGroup(
    {
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(6)],
      }),
      confirm: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: passwordsMatch },
  );

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    try {
      await this.auth.updatePassword(this.form.controls.password.value);
      this.toast.success('Password updated successfully.');
      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      this.error.set(authErrorMessage(error) ?? friendlyError(error));
    } finally {
      this.loading.set(false);
    }
  }
}
