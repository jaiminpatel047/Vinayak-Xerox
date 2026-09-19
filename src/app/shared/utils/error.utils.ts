import { isDevMode } from '@angular/core';

export const NETWORK_ERROR_MESSAGE = 'Unable to connect. Please check your internet connection.';
export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  const message = messageOf(error).toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('load failed')
  );
}

/**
 * Turns any error into a short message that is safe to show a shop owner.
 * Raw database details are only written to the console in development.
 */
export function friendlyError(error: unknown, fallback = GENERIC_ERROR_MESSAGE): string {
  if (isDevMode()) {
    console.error(error);
  }
  return isNetworkError(error) ? NETWORK_ERROR_MESSAGE : fallback;
}
