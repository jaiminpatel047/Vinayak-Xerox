import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  Totals,
  Transaction,
  TransactionFilter,
  TransactionType,
} from '../../../core/models/transaction.model';
import { TransactionService } from '../../../core/services/transaction.service';
import { DateFilterComponent } from '../../../shared/components/date-filter/date-filter.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { TransactionTableComponent } from '../../../shared/components/transaction-table/transaction-table.component';
import { InrPipe } from '../../../shared/pipes/inr.pipe';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { ToastService } from '../../../shared/services/toast.service';
import { friendlyError } from '../../../shared/utils/error.utils';
import { ListStateService } from '../list-state.service';

const PAGE_SIZE = 20;

const PAGE_TEXT = {
  income: { title: 'Income', loading: 'Loading income...' },
  expense: { title: 'Expenses', loading: 'Loading expenses...' },
  all: { title: 'All Transactions', loading: 'Loading transactions...' },
} as const;

/**
 * Income page, Expenses page and combined History page.
 * The route's data.type (income | expense | null) decides which one.
 */
@Component({
  selector: 'app-transaction-list',
  imports: [
    RouterLink,
    DateFilterComponent,
    EmptyStateComponent,
    IconComponent,
    LoadingSpinnerComponent,
    PaginationComponent,
    TransactionTableComponent,
    InrPipe,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">{{ text().title }}</h1>
        <div class="form-actions">
          @if (type() !== 'expense') {
            <a
              routerLink="/income/new"
              [queryParams]="{ returnTo: returnUrl() }"
              class="btn btn-income"
            >
              <app-icon name="plus" [size]="18" /> Add Income
            </a>
          }
          @if (type() !== 'income') {
            <a
              routerLink="/expenses/new"
              [queryParams]="{ returnTo: returnUrl() }"
              class="btn btn-expense"
            >
              <app-icon name="plus" [size]="18" /> Add Expense
            </a>
          }
        </div>
      </div>

      <div class="stack">
        <app-date-filter
          [filter]="state().filter"
          [showTypeFilter]="type() === null"
          (filterChange)="onFilterChange($event)"
        />

        <section class="card card-flush" [attr.aria-busy]="loading()">
          @if (loading() && !loaded()) {
            <app-loading-spinner [message]="text().loading" />
          } @else if (error()) {
            <div class="error-box">
              <p class="alert">{{ error() }}</p>
              <button type="button" class="btn btn-ghost" (click)="reload()">Try again</button>
            </div>
          } @else if (items().length === 0) {
            <app-empty-state
              title="No transactions found."
              message="Start by adding your first income or expense, or change the filters above."
            />
          } @else {
            <app-transaction-table
              [class.dim]="loading()"
              [transactions]="items()"
              [showType]="type() === null"
              [showActions]="true"
              [deletingId]="deletingId()"
              (edit)="edit($event)"
              (remove)="remove($event)"
            />
            <app-pagination
              [page]="state().page"
              [pageSize]="pageSize"
              [total]="total()"
              [disabled]="loading()"
              (pageChange)="goToPage($event)"
            />
          }

          @if (totals(); as t) {
            <div class="totals-bar">
              @if (type() !== 'expense') {
                <span>Total Income:<strong class="amount-income">{{ t.income | inr }}</strong></span>
              }
              @if (type() !== 'income') {
                <span>Total Expense:<strong class="amount-expense">{{ t.expense | inr }}</strong></span>
              }
              @if (type() === null) {
                <span>
                  Net Profit:<strong [class.amount-expense]="t.profit < 0">{{ t.profit | inr }}</strong>
                </span>
              }
            </div>
          }
        </section>
      </div>
    </div>
  `,
  styles: `
    .error-box { display: grid; gap: 12px; justify-items: start; padding: 20px; }
    .dim { opacity: 0.55; pointer-events: none; }
  `,
})
export class TransactionListComponent {
  /** From route data. */
  readonly type = input<TransactionType | null>(null);

  private readonly transactions = inject(TransactionService);
  private readonly listState = inject(ListStateService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly text = computed(() => PAGE_TEXT[this.type() ?? 'all']);
  protected readonly state = computed(() => this.listState.get(this.type() ?? 'all')());

  protected readonly items = signal<Transaction[]>([]);
  protected readonly total = signal(0);
  protected readonly totals = signal<Totals | null>(null);
  protected readonly loading = signal(true);
  protected readonly loaded = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);

  /** Brings the user back here (not to the dashboard) after adding. */
  protected readonly returnUrl = computed(() => {
    const type = this.type();
    if (type === 'income') return '/income';
    if (type === 'expense') return '/expenses';
    return '/transactions';
  });

  private requestId = 0;

  constructor() {
    // Reload whenever the filter or page changes.
    effect(() => {
      const { filter, page } = this.state();
      untracked(() => void this.load(filter, page));
    });
  }

  protected onFilterChange(filter: TransactionFilter): void {
    this.updateState({ filter, page: 1 });
  }

  protected goToPage(page: number): void {
    this.updateState({ ...this.state(), page });
  }

  protected reload(): void {
    const { filter, page } = this.state();
    void this.load(filter, page);
  }

  protected edit(t: Transaction): void {
    const base = t.transaction_type === 'income' ? '/income' : '/expenses';
    void this.router.navigate([base, t.id, 'edit'], { queryParams: { returnTo: this.returnUrl() } });
  }

  protected async remove(t: Transaction): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Delete transaction',
      message: 'Are you sure you want to delete this transaction?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      danger: true,
    });
    if (!ok) return;

    this.deletingId.set(t.id);
    try {
      await this.transactions.deleteTransaction(t.id);
      this.toast.success('Transaction deleted successfully.');

      // If the last row on a page was removed, step back one page.
      const { filter, page } = this.state();
      if (this.items().length === 1 && page > 1) {
        this.updateState({ filter, page: page - 1 });
      } else {
        await this.load(filter, page);
      }
    } catch (error) {
      this.toast.error(friendlyError(error, 'Unable to delete the transaction.'));
    } finally {
      this.deletingId.set(null);
    }
  }

  private updateState(next: { filter: TransactionFilter; page: number }): void {
    this.listState.get(this.type() ?? 'all').set(next);
  }

  private async load(filter: TransactionFilter, page: number): Promise<void> {
    const id = ++this.requestId;
    this.loading.set(true);
    this.error.set(null);

    try {
      const [result, totals] = await Promise.all([
        this.transactions.getTransactions(filter, page, PAGE_SIZE),
        this.transactions.getTotals(filter),
      ]);
      if (id !== this.requestId) return; // A newer request has started.

      this.items.set(result.items);
      this.total.set(result.total);
      this.totals.set(totals);
      this.loaded.set(true);
    } catch (error) {
      if (id !== this.requestId) return;
      this.error.set(friendlyError(error, 'Unable to load transactions. Please try again.'));
      this.totals.set(null);
    } finally {
      if (id === this.requestId) this.loading.set(false);
    }
  }
}
