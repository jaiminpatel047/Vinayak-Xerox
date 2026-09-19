import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStateService } from './auth-state.service';

/** Only lets logged-in users through; everyone else goes to /login. */
export const authGuard: CanActivateFn = async () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  await authState.whenReady();
  return authState.isLoggedIn() ? true : router.createUrlTree(['/login']);
};

/** Keeps logged-in users away from the login page. */
export const guestGuard: CanActivateFn = async () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  await authState.whenReady();
  return authState.isLoggedIn() ? router.createUrlTree(['/dashboard']) : true;
};
