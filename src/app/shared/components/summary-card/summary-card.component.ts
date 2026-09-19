import { Component, computed, input } from '@angular/core';
import { InrPipe } from '../../pipes/inr.pipe';

export type SummaryTone = 'income' | 'expense' | 'profit' | 'neutral';

@Component({
  selector: 'app-summary-card',
  imports: [InrPipe],
  template: `
    <div class="card summary" [class]="'tone-' + tone()">
      <p class="label">{{ label() }}</p>
      <p class="value" [class.negative]="negative()">
        @if (loading()) {
          <span class="placeholder" aria-label="Loading"></span>
        } @else {
          {{ amount() | inr }}
        }
      </p>
      <ng-content />
    </div>
  `,
  styles: `
    .summary { border-top-width: 4px; }
    .tone-income { border-top-color: var(--income); }
    .tone-expense { border-top-color: var(--expense); }
    .tone-profit { border-top-color: var(--primary); }
    .label { margin: 0; color: var(--text-muted); font-weight: 600; }
    .value { margin: 6px 0 0; font-size: 1.75rem; font-weight: 700; min-height: 2.6rem; }
    .tone-income .value { color: var(--income); }
    .tone-expense .value { color: var(--expense); }
    .value.negative { color: var(--expense); }
    .placeholder {
      display: inline-block; width: 120px; height: 1.6rem;
      border-radius: 6px; background: #eef2f7; vertical-align: middle;
    }
  `,
})
export class SummaryCardComponent {
  readonly label = input.required<string>();
  readonly amount = input<number>(0);
  readonly tone = input<SummaryTone>('neutral');
  readonly loading = input(false);

  protected readonly negative = computed(() => this.tone() === 'profit' && this.amount() < 0);
}
