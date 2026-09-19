import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="empty">
      <p class="title">{{ title() }}</p>
      @if (message()) {
        <p class="message">{{ message() }}</p>
      }
      <ng-content />
    </div>
  `,
  styles: `
    .empty { padding: 40px 16px; text-align: center; }
    .title { margin: 0; font-size: 1.1rem; font-weight: 600; }
    .message { margin: 6px 0 16px; color: var(--text-muted); }
  `,
})
export class EmptyStateComponent {
  readonly title = input('No transactions found.');
  readonly message = input('');
}
