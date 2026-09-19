import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { authErrorMessage, AuthService } from '../../../core/auth/auth.service';
import { friendlyError } from '../../../shared/utils/error.utils';
import { AuthShellComponent } from '../auth-shell.component';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent],
  template: `
    <app-auth-shell heading="Forgot password" subheading="We will email you a link to set a new password.">
      @if (sent()) {
        <p class="alert alert-success" role="status">
          If an account exists for this email, a password reset link is on its way.
          Please check your inbox.
        </p>
      } @else {
        <form class="form-grid" (ngSubmit)="send()" novalidate>
          @if (error()) {
            <p class="alert" role="alert">{{ error() }}</p>
          }
          <div class="field">
            <label for="email">Email</label>
            <input
              id="email"
              class="input"
              type="email"
              autocomplete="email"
              [formControl]="email"
              [class.invalid]="email.invalid && email.touched"
            />
            @if (email.invalid && email.touched) {
              <p class="error-text">Please enter a valid email address.</p>
            }
          </div>
          <button type="submit" class="btn btn-primary btn-lg btn-block" [disabled]="loading()">
            {{ loading() ? 'Sending...' : 'Send reset link' }}
          </button>
        </form>
      }
      <a routerLink="/login" class="back">‹ Back to Login</a>
    </app-auth-shell>
  `,
  styles: `
    .back { font-weight: 500; text-align: center; }
  `,
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);

  protected readonly email = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });
  protected readonly loading = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async send(): Promise<void> {
    this.email.markAsTouched();
    if (this.email.invalid || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    try {
      await this.auth.sendPasswordReset(this.email.value.trim());
      this.sent.set(true);
    } catch (error) {
      this.error.set(authErrorMessage(error) ?? friendlyError(error));
    } finally {
      this.loading.set(false);
    }
  }
}
