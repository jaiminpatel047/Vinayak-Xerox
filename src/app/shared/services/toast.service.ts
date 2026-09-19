import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly toastsSignal = signal<Toast[]>([]);

  readonly toasts = this.toastsSignal.asReadonly();

  success(message: string): void {
    this.show('success', message, 3000);
  }

  error(message: string): void {
    this.show('error', message, 5000);
  }

  dismiss(id: number): void {
    this.toastsSignal.update((list) => list.filter((t) => t.id !== id));
  }

  private show(kind: ToastKind, message: string, duration: number): void {
    const id = this.nextId++;
    this.toastsSignal.update((list) => [...list, { id, kind, message }]);
    setTimeout(() => this.dismiss(id), duration);
  }
}
