import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  template: `
    <div class="loading" role="status" aria-live="polite">
      <span class="spinner" aria-hidden="true"></span>
      <span>{{ message() }}</span>
    </div>
  `,
  styles: `
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 32px 16px;
      color: var(--text-muted);
    }
    .spinner {
      width: 22px;
      height: 22px;
      border: 3px solid var(--border);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `,
})
export class LoadingSpinnerComponent {
  readonly message = input('Loading...');
}
