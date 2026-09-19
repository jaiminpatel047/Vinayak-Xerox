import { Component, computed, DestroyRef, effect, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  categoriesFor,
  TransactionFilter,
  TransactionType,
} from '../../../core/models/transaction.model';
import {
  currentMonth,
  currentYear,
  MONTH_NAMES,
  monthRange,
  todayRange,
  yearOptions,
  yearRange,
} from '../../utils/date.utils';

type QuickRange = 'today' | 'month' | 'year' | 'all' | null;

/**
 * Filters for the transaction lists: date range, month, year, category and
 * (on the combined history page) income/expense type.
 * Choosing a month or year fills in Date From / Date To; typing dates clears month/year.
 */
@Component({
  selector: 'app-date-filter',
  imports: [ReactiveFormsModule],
  template: `
    <form class="card filters" [formGroup]="form" (submit)="$event.preventDefault()">
      <div class="quick">
        @if (showTypeFilter()) {
          <div class="segmented" role="group" aria-label="Type">
            <button type="button" [class.active]="!filter().type" (click)="setType(null)">All</button>
            <button type="button" [class.active]="filter().type === 'income'" (click)="setType('income')">
              Income
            </button>
            <button type="button" [class.active]="filter().type === 'expense'" (click)="setType('expense')">
              Expense
            </button>
          </div>
        }
        <div class="segmented" role="group" aria-label="Quick dates">
          <button type="button" [class.active]="quick() === 'today'" (click)="applyQuick('today')">Today</button>
          <button type="button" [class.active]="quick() === 'month'" (click)="applyQuick('month')">This Month</button>
          <button type="button" [class.active]="quick() === 'year'" (click)="applyQuick('year')">This Year</button>
          <button type="button" [class.active]="quick() === 'all'" (click)="applyQuick('all')">Clear</button>
        </div>
      </div>

      <div class="grid">
        <div class="field">
          <label for="f-from">Date From</label>
          <input id="f-from" class="input" type="date" formControlName="from" />
        </div>
        <div class="field">
          <label for="f-to">Date To</label>
          <input id="f-to" class="input" type="date" formControlName="to" />
        </div>
        <div class="field">
          <label for="f-month">Month</label>
          <select id="f-month" class="input" formControlName="month">
            <option [ngValue]="null">Any month</option>
            @for (name of monthNames; track name; let i = $index) {
              <option [ngValue]="i + 1">{{ name }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label for="f-year">Year</label>
          <select id="f-year" class="input" formControlName="year">
            <option [ngValue]="null">Any year</option>
            @for (y of years; track y) {
              <option [ngValue]="y">{{ y }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label for="f-category">Category</label>
          <select id="f-category" class="input" formControlName="category">
            <option [ngValue]="null">All categories</option>
            @for (c of categories(); track c) {
              <option [ngValue]="c">{{ c }}</option>
            }
          </select>
        </div>
      </div>

      @if (rangeInvalid()) {
        <p class="error-text">"Date From" is after "Date To".</p>
      }
    </form>
  `,
  styles: `
    .filters { display: grid; gap: 16px; }
    .quick { display: flex; flex-wrap: wrap; gap: 10px; }
    .grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
  `,
})
export class DateFilterComponent {
  readonly filter = input.required<TransactionFilter>();
  readonly showTypeFilter = input(false);
  readonly filterChange = output<TransactionFilter>();

  protected readonly monthNames = MONTH_NAMES;
  protected readonly years = yearOptions(6);

  protected readonly form = new FormGroup({
    from: new FormControl<string | null>(null),
    to: new FormControl<string | null>(null),
    month: new FormControl<number | null>(null),
    year: new FormControl<number | null>(null),
    category: new FormControl<string | null>(null),
  });

  protected readonly categories = computed(() => categoriesFor(this.filter().type));

  protected readonly rangeInvalid = computed(() => {
    const { from, to } = this.filter();
    return !!from && !!to && from > to;
  });

  protected readonly quick = computed<QuickRange>(() => {
    const { from, to } = this.filter();
    if (!from && !to) return 'all';
    if (sameRange(from, to, todayRange())) return 'today';
    if (sameRange(from, to, monthRange(currentYear(), currentMonth()))) return 'month';
    if (sameRange(from, to, yearRange(currentYear()))) return 'year';
    return null;
  });

  constructor() {
    const destroyRef = inject(DestroyRef);

    // Parent filter -> form (without triggering our own change handlers).
    effect(() => {
      const f = this.filter();
      this.form.patchValue(
        { from: f.from, to: f.to, category: f.category, ...monthYearOf(f.from, f.to) },
        { emitEvent: false },
      );
    });

    const c = this.form.controls;

    c.from.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => this.onDatesTyped());
    c.to.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => this.onDatesTyped());
    c.month.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => this.onMonthYear());
    c.year.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => this.onMonthYear());
    c.category.valueChanges
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((category) => this.emit({ category }));
  }

  protected applyQuick(range: Exclude<QuickRange, null>): void {
    if (range === 'all') {
      this.emit({ from: null, to: null, category: null });
      return;
    }
    const dates =
      range === 'today'
        ? todayRange()
        : range === 'month'
          ? monthRange(currentYear(), currentMonth())
          : yearRange(currentYear());
    this.emit(dates);
  }

  protected setType(type: TransactionType | null): void {
    const category = this.filter().category;
    const keepCategory = category && categoriesFor(type).includes(category);
    this.emit({ type, category: keepCategory ? category : null });
  }

  private onDatesTyped(): void {
    const { from, to } = this.form.getRawValue();
    this.emit({ from: from || null, to: to || null });
  }

  private onMonthYear(): void {
    const { month, year } = this.form.getRawValue();
    if (month === null && year === null) {
      this.emit({ from: null, to: null });
    } else if (month === null && year !== null) {
      this.emit(yearRange(year));
    } else if (month !== null) {
      this.emit(monthRange(year ?? currentYear(), month));
    }
  }

  private emit(changes: Partial<TransactionFilter>): void {
    this.filterChange.emit({ ...this.filter(), ...changes });
  }
}

function sameRange(from: string | null, to: string | null, range: { from: string; to: string }) {
  return from === range.from && to === range.to;
}

/** Works out which month/year dropdown values match a date range. */
function monthYearOf(
  from: string | null,
  to: string | null,
): { month: number | null; year: number | null } {
  const none = { month: null, year: null };
  if (!from || !to) return none;

  const year = Number(from.slice(0, 4));
  const month = Number(from.slice(5, 7));
  if (sameRange(from, to, yearRange(year))) return { month: null, year };
  if (sameRange(from, to, monthRange(year, month))) return { month, year };
  return none;
}
