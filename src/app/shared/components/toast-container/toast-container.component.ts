import { Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  template: `
    <div class="toasts" aria-live="polite">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" [class.toast-error]="toast.kind === 'error'" role="status">
          <span>{{ toast.message }}</span>
          <button type="button" aria-label="Close" (click)="toastService.dismiss(toast.id)">×</button>
        </div>
      }
    </div>
  `,
  styles: `
    .toasts {
      position: fixed;
      left: 50%;
      bottom: calc(84px + env(safe-area-inset-bottom, 0px));
      transform: translateX(-50%);
      z-index: 1000;
      display: grid;
      gap: 8px;
      width: min(420px, calc(100vw - 32px));
    }
    @media (min-width: 900px) {
      .toasts { bottom: 24px; }
    }
    .toast {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 10px;
      background: #166534;
      color: #fff;
      font-size: 1rem;
      box-shadow: 0 6px 20px rgb(0 0 0 / 0.18);
    }
    .toast-error { background: #b91c1c; }
    button {
      background: none;
      border: 0;
      color: inherit;
      font-size: 1.4rem;
      line-height: 1;
      cursor: pointer;
    }
  `,
})
export class ToastContainerComponent {
  protected readonly toastService = inject(ToastService);
}
