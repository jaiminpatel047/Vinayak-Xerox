import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  categoriesFor,
  Transaction,
  TransactionChanges,
  TransactionType,
  typeLabel,
} from '../../../core/models/transaction.model';
import { todayIso } from '../../utils/date.utils';

/** numeric(12,2) upper limit. */
const MAX_AMOUNT = 9999999999.99;

/**
 * One form for both income and expense:
 *   <app-transaction-form transactionType="income" />
 *   <app-transaction-form transactionType="expense" [transaction]="existing" />
 * The parent does the saving; this component only collects valid values.
 */
@Component({
  selector: 'app-transaction-form',
  imports: [ReactiveFormsModule],
  template: `
    <form class="form-grid" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="field">
        <label for="t-date">Date</label>
        <input
          id="t-date"
          class="input"
          type="date"
          formControlName="transaction_date"
          [class.invalid]="showError('transaction_date')"
        />
        @if (showError('transaction_date')) {
          <p class="error-text">Date is required.</p>
        }
      </div>

      <div class="field">
        <label for="t-category">Category</label>
        <select
          id="t-category"
          class="input"
          formControlName="category"
          [class.invalid]="showError('category')"
        >
          <option value="" disabled>Select category</option>
          @for (c of categories(); track c) {
            <option [value]="c">{{ c }}</option>
          }
        </select>
        @if (showError('category')) {
          <p class="error-text">Category is required.</p>
        }
      </div>

      <div class="field">
        <label for="t-amount">Amount</label>
        <div class="amount-input">
          <span aria-hidden="true">₹</span>
          <input
            id="t-amount"
            class="input"
            type="number"
            inputmode="decimal"
            min="0.01"
            step="0.01"
            placeholder="0"
            formControlName="amount"
            [class.invalid]="showError('amount')"
          />
        </div>
        @if (showError('amount')) {
          <p class="error-text">{{ amountError() }}</p>
        }
      </div>

      <div class="field">
        <label for="t-description">Description <span class="muted">(optional)</span></label>
        <input
          id="t-description"
          class="input"
          type="text"
          maxlength="500"
          formControlName="description"
          [placeholder]="transactionType() === 'income' ? 'e.g. Customer Xerox - 50 pages' : 'e.g. A4 paper purchase'"
        />
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-ghost btn-lg" [disabled]="saving()" (click)="cancelled.emit()">
          Cancel
        </button>
        <button
          type="submit"
          class="btn btn-lg"
          [class.btn-income]="transactionType() === 'income'"
          [class.btn-expense]="transactionType() === 'expense'"
          [disabled]="saving()"
        >
          {{ saving() ? 'Saving...' : submitLabel() }}
        </button>
      </div>
    </form>
  `,
})
export class TransactionFormComponent {
  readonly transactionType = input.required<TransactionType>();
  /** Existing transaction when editing; omit when adding. */
  readonly transaction = input<Transaction | null>(null);
  readonly saving = input(false);

  readonly saved = output<TransactionChanges>();
  readonly cancelled = output<void>();

  protected readonly form = new FormGroup({
    transaction_date: new FormControl(todayIso(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    category: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    amount: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0.01), Validators.max(MAX_AMOUNT)],
    }),
    description: new FormControl('', { nonNullable: true }),
  });

  private readonly submitted = signal(false);

  protected readonly categories = computed(() => {
    const list = categoriesFor(this.transactionType());
    const current = this.transaction()?.category;
    // Keep an old category visible even if it is no longer in the list.
    return current && !list.includes(current) ? [...list, current] : list;
  });

  protected readonly submitLabel = computed(() => {
    const label = typeLabel(this.transactionType());
    return this.transaction() ? 'Save Changes' : `Save ${label}`;
  });

  constructor() {
    effect(() => {
      const t = this.transaction();
      if (t) {
        this.form.reset({
          transaction_date: t.transaction_date,
          category: t.category,
          amount: t.amount,
          description: t.description ?? '',
        });
      }
    });

    effect(() => {
      if (this.saving()) this.form.disable({ emitEvent: false });
      else this.form.enable({ emitEvent: false });
    });
  }

  protected showError(name: 'transaction_date' | 'category' | 'amount'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  protected amountError(): string {
    const errors = this.form.controls.amount.errors;
    if (errors?.['required']) return 'Amount is required.';
    if (errors?.['max']) return 'Amount is too large.';
    return 'Amount must be greater than 0.';
  }

  protected submit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;

    const value = this.form.getRawValue();
    const description = value.description.trim();
    this.saved.emit({
      transaction_date: value.transaction_date,
      category: value.category,
      amount: Math.round(Number(value.amount) * 100) / 100,
      description: description || null,
    });
  }
}
