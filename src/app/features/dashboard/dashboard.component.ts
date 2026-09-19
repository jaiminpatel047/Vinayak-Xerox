import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Totals, Transaction } from '../../core/models/transaction.model';
import { ProfileService } from '../../core/services/profile.service';
import { TransactionService } from '../../core/services/transaction.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component';
import { TransactionTableComponent } from '../../shared/components/transaction-table/transaction-table.component';
import { InrPipe } from '../../shared/pipes/inr.pipe';
import {
  currentMonth,
  currentYear,
  DateRange,
  monthLabel,
  monthRange,
  todayRange,
  yearRange,
} from '../../shared/utils/date.utils';
import { friendlyError } from '../../shared/utils/error.utils';

type Period = 'today' | 'month' | 'year';

const PERIOD_LABELS: Record<Period, string> = {
  today: "Today's",
  month: "This Month's",
  year: "This Year's",
};

const EMPTY_TOTALS: Totals = { income: 0, expense: 0, profit: 0 };

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    EmptyStateComponent,
    IconComponent,
    LoadingSpinnerComponent,
    SummaryCardComponent,
    TransactionTableComponent,
    InrPipe,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ greeting() }}!</h1>
          <p class="page-subtitle">{{ shopName() }}</p>
        </div>
        <div class="segmented" role="group" aria-label="Show totals for">
          <button type="button" [class.active]="period() === 'today'" (click)="setPeriod('today')">Today</button>
          <button type="button" [class.active]="period() === 'month'" (click)="setPeriod('month')">This Month</button>
          <button type="button" [class.active]="period() === 'year'" (click)="setPeriod('year')">This Year</button>
        </div>
      </div>

      <div class="stack">
        @if (statsError()) {
          <div class="alert error-row">
            <span>{{ statsError() }}</span>
            <button type="button" class="btn btn-ghost btn-sm" (click)="loadAll()">Try again</button>
          </div>
        }

        <section class="summary-grid" aria-label="Summary">
          <app-summary-card
            [label]="periodLabel() + ' Income'"
            tone="income"
            [amount]="periodTotals().income"
            [loading]="statsLoading()"
          />
          <app-summary-card
            [label]="periodLabel() + ' Expense'"
            tone="expense"
            [amount]="periodTotals().expense"
            [loading]="statsLoading()"
          />
          <app-summary-card
            [label]="periodLabel() + ' Profit'"
            tone="profit"
            [amount]="periodTotals().profit"
            [loading]="statsLoading()"
          />
        </section>

        <section class="card">
          <h2 class="card-title">Quick Actions</h2>
          <div class="quick-actions">
            <a routerLink="/income/new" [queryParams]="{ returnTo: '/dashboard' }" class="btn btn-income btn-lg">
              <app-icon name="plus" /> Add Income
            </a>
            <a routerLink="/expenses/new" [queryParams]="{ returnTo: '/dashboard' }" class="btn btn-expense btn-lg">
              <app-icon name="plus" /> Add Expense
            </a>
          </div>
        </section>

        <section class="card card-flush">
          <div class="recent-head">
            <h2 class="card-title">Recent Transactions</h2>
            <a routerLink="/transactions">View all ›</a>
          </div>

          @if (recentLoading()) {
            <app-loading-spinner message="Loading transactions..." />
          } @else if (recentError()) {
            <p class="alert inset">{{ recentError() }}</p>
          } @else if (recent().length === 0) {
            <app-empty-state
              title="No transactions found."
              message="Start by adding your first income or expense."
            />
          } @else {
            <app-transaction-table [transactions]="recent()" />
          }
        </section>
      </div>
    </div>
  `,
  styles: `
    .quick-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
    .month-lines { margin: 10px 0 0; display: grid; gap: 2px; font-size: 0.9rem; }
    .month-lines div { display: flex; justify-content: space-between; gap: 8px; }
    .month-lines dt { color: var(--text-muted); }
    .month-lines dd { margin: 0; }
    .recent-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 18px 20px 4px; }
    .recent-head .card-title { margin: 0; }
    .recent-head a { font-weight: 600; text-decoration: none; }
    .error-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .inset { margin: 16px 20px 20px; }
  `,
})
export class DashboardComponent implements OnInit {
  private readonly transactions = inject(TransactionService);
  private readonly profiles = inject(ProfileService);

  protected readonly period = signal<Period>('today');
  protected readonly periodLabel = computed(() => PERIOD_LABELS[this.period()]);
  protected readonly monthName = monthLabel(currentYear(), currentMonth());

  protected readonly periodTotals = signal<Totals>(EMPTY_TOTALS);
  protected readonly monthTotals = signal<Totals>(EMPTY_TOTALS);
  protected readonly recent = signal<Transaction[]>([]);

  protected readonly statsLoading = signal(true);
  protected readonly monthLoading = signal(true);
  protected readonly recentLoading = signal(true);
  protected readonly statsError = signal<string | null>(null);
  protected readonly recentError = signal<string | null>(null);

  protected readonly shopName = computed(() => {
    const profile = this.profiles.profile();
    return profile?.shop_name?.trim() || profile?.full_name?.trim() || 'Your Shop';
  });

  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  });

  private periodRequest = 0;

  ngOnInit(): void {
    this.loadAll();
  }

  protected loadAll(): void {
    this.statsError.set(null);
    void this.loadPeriod();
    void this.loadMonth();
    void this.loadRecent();
  }

  protected setPeriod(period: Period): void {
    if (period === this.period()) return;
    this.period.set(period);
    void this.loadPeriod();
  }

  private async loadPeriod(): Promise<void> {
    const id = ++this.periodRequest;
    this.statsLoading.set(true);
    try {
      const totals = await this.totalsFor(rangeFor(this.period()));
      if (id === this.periodRequest) this.periodTotals.set(totals);
    } catch (error) {
      if (id === this.periodRequest) {
        this.statsError.set(friendlyError(error, 'Unable to load totals. Please try again.'));
      }
    } finally {
      if (id === this.periodRequest) this.statsLoading.set(false);
    }
  }

  private async loadMonth(): Promise<void> {
    this.monthLoading.set(true);
    try {
      this.monthTotals.set(await this.totalsFor(rangeFor('month')));
    } catch (error) {
      this.statsError.set(friendlyError(error, 'Unable to load totals. Please try again.'));
    } finally {
      this.monthLoading.set(false);
    }
  }

  private async loadRecent(): Promise<void> {
    this.recentLoading.set(true);
    this.recentError.set(null);
    try {
      this.recent.set(await this.transactions.getRecent(10));
    } catch (error) {
      this.recentError.set(friendlyError(error, 'Unable to load transactions. Please try again.'));
    } finally {
      this.recentLoading.set(false);
    }
  }

  private totalsFor(range: DateRange): Promise<Totals> {
    return this.transactions.getTotals({ type: null, category: null, ...range });
  }
}

function rangeFor(period: Period): DateRange {
  if (period === 'today') return todayRange();
  if (period === 'month') return monthRange(currentYear(), currentMonth());
  return yearRange(currentYear());
}
