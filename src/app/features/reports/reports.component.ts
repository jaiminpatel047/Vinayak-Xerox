import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CategoryTotal, Totals } from '../../core/models/transaction.model';
import { PdfReportService } from '../../core/services/pdf-report.service';
import { ProfileService } from '../../core/services/profile.service';
import { MonthlyReport, ReportService, YearlyReport } from '../../core/services/report.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component';
import { TransactionTableComponent } from '../../shared/components/transaction-table/transaction-table.component';
import { InrPipe } from '../../shared/pipes/inr.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { currentMonth, currentYear, MONTH_NAMES, yearOptions } from '../../shared/utils/date.utils';
import { friendlyError } from '../../shared/utils/error.utils';

type ReportMode = 'month' | 'year';

interface ReportView {
  title: string;
  totals: Totals;
  incomeByCategory: CategoryTotal[];
  expenseByCategory: CategoryTotal[];
}

@Component({
  selector: 'app-reports',
  imports: [
    FormsModule,
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
        <h1 class="page-title">Reports</h1>
        <div class="segmented" role="group" aria-label="Report type">
          <button type="button" [class.active]="mode() === 'month'" (click)="setMode('month')">Monthly</button>
          <button type="button" [class.active]="mode() === 'year'" (click)="setMode('year')">Yearly</button>
        </div>
      </div>

      <div class="stack">
        <form class="card pickers" (submit)="$event.preventDefault()">
          @if (mode() === 'month') {
            <div class="field">
              <label for="r-month">Month</label>
              <select id="r-month" class="input" name="month" [ngModel]="month()" (ngModelChange)="month.set($event); load()">
                @for (name of monthNames; track name; let i = $index) {
                  <option [ngValue]="i + 1">{{ name }}</option>
                }
              </select>
            </div>
          }
          <div class="field">
            <label for="r-year">Year</label>
            <select id="r-year" class="input" name="year" [ngModel]="year()" (ngModelChange)="year.set($event); load()">
              @for (y of years; track y) {
                <option [ngValue]="y">{{ y }}</option>
              }
            </select>
          </div>
          @if (mode() === 'month') {
            <button
              type="button"
              class="btn btn-primary btn-lg download"
              [disabled]="!monthly() || loading() || downloading()"
              (click)="downloadPdf()"
            >
              <app-icon name="download" />
              {{ downloading() ? 'Preparing PDF...' : 'Download Monthly PDF' }}
            </button>
          }
        </form>

        @if (loading()) {
          <div class="card"><app-loading-spinner message="Loading report..." /></div>
        } @else if (error()) {
          <div class="card error-box">
            <p class="alert">{{ error() }}</p>
            <button type="button" class="btn btn-ghost" (click)="load()">Try again</button>
          </div>
        } @else if (view(); as r) {
          <section class="card report-head">
            <p class="muted">{{ mode() === 'month' ? 'Monthly Report' : 'Yearly Report' }}</p>
            <h2>{{ r.title }}</h2>
          </section>

          <section class="summary-grid" aria-label="Summary">
            <app-summary-card label="Total Income" tone="income" [amount]="r.totals.income" />
            <app-summary-card label="Total Expense" tone="expense" [amount]="r.totals.expense" />
            <app-summary-card label="Net Profit" tone="profit" [amount]="r.totals.profit" />
          </section>

          @if (isEmpty()) {
            <div class="card">
              <app-empty-state
                [title]="mode() === 'month' ? 'No transactions found for this month.' : 'No transactions found for this year.'"
                message=""
              />
            </div>
          } @else {
            <div class="breakdowns">
              <section class="card">
                <h3 class="card-title">Income Breakdown</h3>
                <ul class="breakdown">
                  @for (row of r.incomeByCategory; track row.category) {
                    <li><span>{{ row.category }}</span><strong class="amount-income">{{ row.amount | inr }}</strong></li>
                  } @empty {
                    <li class="muted">No income entries.</li>
                  }
                </ul>
              </section>
              <section class="card">
                <h3 class="card-title">Expense Breakdown</h3>
                <ul class="breakdown">
                  @for (row of r.expenseByCategory; track row.category) {
                    <li><span>{{ row.category }}</span><strong class="amount-expense">{{ row.amount | inr }}</strong></li>
                  } @empty {
                    <li class="muted">No expense entries.</li>
                  }
                </ul>
              </section>
            </div>

            @if (monthly(); as m) {
              <section class="card card-flush">
                <h3 class="card-title">Transactions ({{ m.transactions.length }})</h3>
                <app-transaction-table [transactions]="m.transactions" />
              </section>
            }
          }
        }
      </div>
    </div>
  `,
  styles: `
    .pickers { display: flex; flex-wrap: wrap; align-items: end; gap: 12px; }
    .pickers .field { flex: 1 1 160px; }
    .download { flex: 1 1 260px; }
    .report-head p { margin: 0; }
    .report-head h2 { font-size: 1.5rem; margin-top: 2px; }
    .breakdowns { display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
    .error-box { display: grid; gap: 12px; justify-items: start; }
  `,
})
export class ReportsComponent implements OnInit {
  private readonly reports = inject(ReportService);
  private readonly pdf = inject(PdfReportService);
  private readonly profiles = inject(ProfileService);
  private readonly toast = inject(ToastService);

  protected readonly monthNames = MONTH_NAMES;
  protected readonly years = yearOptions(6);

  protected readonly mode = signal<ReportMode>('month');
  protected readonly month = signal(currentMonth());
  protected readonly year = signal(currentYear());

  protected readonly monthly = signal<MonthlyReport | null>(null);
  protected readonly yearly = signal<YearlyReport | null>(null);
  protected readonly loading = signal(true);
  protected readonly downloading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly view = computed<ReportView | null>(() => {
    if (this.mode() === 'month') {
      const m = this.monthly();
      return m && { title: m.label, ...m };
    }
    const y = this.yearly();
    return y && { title: String(y.year), ...y };
  });

  protected readonly isEmpty = computed(() => {
    const v = this.view();
    return !!v && v.incomeByCategory.length === 0 && v.expenseByCategory.length === 0;
  });

  private requestId = 0;

  ngOnInit(): void {
    void this.load();
  }

  protected setMode(mode: ReportMode): void {
    if (mode === this.mode()) return;
    this.mode.set(mode);
    void this.load();
  }

  protected async load(): Promise<void> {
    const id = ++this.requestId;
    this.loading.set(true);
    this.error.set(null);
    this.monthly.set(null);
    this.yearly.set(null);

    try {
      if (this.mode() === 'month') {
        const report = await this.reports.getMonthlyReport(this.year(), this.month());
        if (id === this.requestId) this.monthly.set(report);
      } else {
        const report = await this.reports.getYearlyReport(this.year());
        if (id === this.requestId) this.yearly.set(report);
      }
    } catch (error) {
      if (id === this.requestId) {
        this.error.set(friendlyError(error, 'Unable to load the report. Please try again.'));
      }
    } finally {
      if (id === this.requestId) this.loading.set(false);
    }
  }

  /** Uses the exact report object shown on screen, so the PDF always matches the page. */
  protected async downloadPdf(): Promise<void> {
    const report = this.monthly();
    if (!report || this.downloading()) return;

    this.downloading.set(true);
    try {
      const profile = this.profiles.profile() ?? (await this.profiles.getProfile().catch(() => null));
      await this.pdf.generateMonthlyReportPdf(report, profile?.shop_name?.trim() ?? '');
    } catch (error) {
      this.toast.error(friendlyError(error, 'Unable to create the PDF. Please try again.'));
    } finally {
      this.downloading.set(false);
    }
  }
}
