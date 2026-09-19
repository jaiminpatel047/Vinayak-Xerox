import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { authErrorMessage, AuthService } from '../../../core/auth/auth.service';
import { friendlyError } from '../../../shared/utils/error.utils';
import { AuthShellComponent } from '../auth-shell.component';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent],
  template: `
    <app-auth-shell heading="Create account" subheading="Start keeping your shop's daily book online.">
      @if (checkEmail()) {
        <p class="alert alert-success" role="status">
          Account created! We have sent a confirmation link to your email.
          Please open it, then come back and login.
        </p>
        <a routerLink="/login" class="btn btn-primary btn-lg btn-block">Go to Login</a>
      } @else {
        <form class="form-grid" [formGroup]="form" (ngSubmit)="register()" novalidate>
          @if (error()) {
            <p class="alert" role="alert">{{ error() }}</p>
          }

          <div class="field">
            <label for="shop">Shop Name</label>
            <input id="shop" class="input" type="text" maxlength="120" formControlName="shopName" placeholder="e.g. ABC Xerox" />
          </div>

          <div class="field">
            <label for="name">Your Name</label>
            <input id="name" class="input" type="text" maxlength="120" autocomplete="name" formControlName="fullName" />
          </div>

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
              autocomplete="new-password"
              formControlName="password"
              [class.invalid]="invalid('password')"
            />
            <span class="hint">At least 6 characters.</span>
            @if (invalid('password')) {
              <p class="error-text">Password must be at least 6 characters.</p>
            }
          </div>

          <button type="submit" class="btn btn-primary btn-lg btn-block" [disabled]="loading()">
            {{ loading() ? 'Creating account...' : 'Create account' }}
          </button>

          <p class="muted center">Already have an account? <a routerLink="/login">Login</a></p>
        </form>
      }
    </app-auth-shell>
  `,
  styles: `
    .center { text-align: center; margin: 0; }
  `,
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = new FormGroup({
    shopName: new FormControl('', { nonNullable: true }),
    fullName: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
  });

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly checkEmail = signal(false);

  protected invalid(name: 'email' | 'password'): boolean {
    const control = this.form.controls[name];
    return control.invalid && control.touched;
  }

  protected async register(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();

    try {
      const result = await this.auth.signUp(v.email.trim(), v.password, v.fullName.trim(), v.shopName.trim());
      if (result.loggedIn) {
        await this.router.navigateByUrl('/dashboard');
      } else {
        this.checkEmail.set(true);
      }
    } catch (error) {
      this.error.set(authErrorMessage(error) ?? friendlyError(error, 'Unable to create account. Please try again.'));
    } finally {
      this.loading.set(false);
    }
  }
}
