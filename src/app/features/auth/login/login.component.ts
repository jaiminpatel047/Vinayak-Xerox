import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { authErrorMessage, AuthService } from '../../../core/auth/auth.service';
import { friendlyError } from '../../../shared/utils/error.utils';
import { AuthShellComponent } from '../auth-shell.component';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent],
  template: `
    <app-auth-shell heading="Login" subheading="Welcome back! Login to your shop book.">
      <form class="form-grid" [formGroup]="form" (ngSubmit)="login()" novalidate>
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
            formControlName="email"
            [class.invalid]="invalid('email')"
          />
          @if (invalid('email')) {
            <p class="error-text">Please enter a valid email address.</p>
          }
        </div>

        <div class="field">
          <label for="password">Password</label>
          <input
            id="password"
            class="input"
            type="password"
            autocomplete="current-password"
            formControlName="password"
            [class.invalid]="invalid('password')"
          />
          @if (invalid('password')) {
            <p class="error-text">Password is required.</p>
          }
        </div>

        <button type="submit" class="btn btn-primary btn-lg btn-block" [disabled]="loading()">
          {{ loading() ? 'Logging in...' : 'Login' }}
        </button>

        <div class="links">
          <a routerLink="/forgot-password">Forgot password?</a>
          <a routerLink="/register">Create account</a>
        </div>
      </form>
    </app-auth-shell>
  `,
  styles: `
    .links { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; font-weight: 500; }
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected invalid(name: 'email' | 'password'): boolean {
    const control = this.form.controls[name];
    return control.invalid && control.touched;
  }

  protected async login(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();

    try {
      await this.auth.login(email.trim(), password);
      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      this.error.set(authErrorMessage(error) ?? friendlyError(error, 'Unable to login. Please try again.'));
    } finally {
      this.loading.set(false);
    }
  }
}
