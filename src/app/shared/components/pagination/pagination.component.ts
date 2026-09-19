import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  template: `
    @if (pageCount() > 1) {
      <nav class="pagination" aria-label="Pages">
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          [disabled]="page() <= 1 || disabled()"
          (click)="pageChange.emit(page() - 1)"
        >
          ‹ Previous
        </button>
        <span class="muted">Page {{ page() }} of {{ pageCount() }}</span>
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          [disabled]="page() >= pageCount() || disabled()"
          (click)="pageChange.emit(page() + 1)"
        >
          Next ›
        </button>
      </nav>
    }
  `,
  styles: `
    .pagination {
      display: flex; align-items: center; justify-content: center;
      gap: 12px; flex-wrap: wrap; padding: 14px 16px;
      border-top: 1px solid var(--border);
    }
  `,
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly total = input.required<number>();
  readonly disabled = input(false);

  readonly pageChange = output<number>();

  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
}
