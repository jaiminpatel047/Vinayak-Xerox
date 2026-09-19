import { Component, inject } from '@angular/core';
import { ConfirmService } from '../../services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  host: { '(document:keydown.escape)': 'confirmService.answer(false)' },
  template: `
    @if (confirmService.pending(); as dialog) {
      <div class="backdrop" (click)="confirmService.answer(false)">
        <div
          class="dialog card"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          (click)="$event.stopPropagation()"
        >
          <h2 id="confirm-title">{{ dialog.title }}</h2>
          <p>{{ dialog.message }}</p>
          <div class="actions">
            <button type="button" class="btn btn-ghost" (click)="confirmService.answer(false)">
              {{ dialog.cancelText }}
            </button>
            <button
              type="button"
              class="btn"
              [class.btn-danger]="dialog.danger"
              [class.btn-primary]="!dialog.danger"
              (click)="confirmService.answer(true)"
            >
              {{ dialog.confirmText }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 1100;
      background: rgb(15 23 42 / 0.45);
      display: grid;
      place-items: center;
      padding: 16px;
    }
    .dialog { width: min(420px, 100%); }
    h2 { margin: 0 0 8px; font-size: 1.25rem; }
    p { margin: 0 0 20px; color: var(--text-muted); }
    .actions { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
  `,
})
export class ConfirmDialogComponent {
  protected readonly confirmService = inject(ConfirmService);
}
