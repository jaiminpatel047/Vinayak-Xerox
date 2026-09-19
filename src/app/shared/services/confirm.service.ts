import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  danger: boolean;
}

interface PendingConfirm extends ConfirmRequest {
  resolve: (confirmed: boolean) => void;
}

/** Opens the single app-wide ConfirmDialogComponent and waits for the answer. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly pendingSignal = signal<PendingConfirm | null>(null);

  readonly pending = this.pendingSignal.asReadonly();

  confirm(options: Partial<ConfirmRequest> & Pick<ConfirmRequest, 'message'>): Promise<boolean> {
    // Only one dialog at a time: cancel any dialog that is still open.
    this.pendingSignal()?.resolve(false);

    return new Promise<boolean>((resolve) => {
      this.pendingSignal.set({
        title: 'Please confirm',
        confirmText: 'OK',
        cancelText: 'Cancel',
        danger: false,
        ...options,
        resolve,
      });
    });
  }

  answer(confirmed: boolean): void {
    const pending = this.pendingSignal();
    if (!pending) return;
    this.pendingSignal.set(null);
    pending.resolve(confirmed);
  }
}
