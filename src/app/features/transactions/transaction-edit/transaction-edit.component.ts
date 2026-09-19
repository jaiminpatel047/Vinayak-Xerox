import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  Transaction,
  TransactionChanges,
  TransactionType,
  typeLabel,
} from '../../../core/models/transaction.model';
import { TransactionService } from '../../../core/services/transaction.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { TransactionFormComponent } from '../../../shared/components/transaction-form/transaction-form.component';
import { ToastService } from '../../../shared/services/toast.service';
import { friendlyError } from '../../../shared/utils/error.utils';

/** Add or edit page for income and expense (type comes from route data, id from the URL). */
@Component({
  selector: 'app-transaction-edit',
  imports: [RouterLink, LoadingSpinnerComponent, TransactionFormComponent],
  template: `
    <div class="page page-narrow">
      <a class="back-link" [routerLink]="backUrl()">‹ Back</a>

      <div class="page-header">
        <h1 class="page-title">{{ title() }}</h1>
      </div>

      <div class="card">
        @if (loading()) {
          <app-loading-spinner message="Loading transaction..." />
        } @else if (loadError()) {
          <p class="alert">{{ loadError() }}</p>
        } @else {
          <app-transaction-form
            [transactionType]="type()"
            [transaction]="existing()"
            [saving]="saving()"
            (saved)="save($event)"
            (cancelled)="goBack()"
          />
        }
      </div>
    </div>
  `,
})
export class TransactionEditComponent {
  /** Route data. */
  readonly type = input.required<TransactionType>();
  /** :id route param (absent when adding). */
  readonly id = input<string | undefined>();
  /** ?returnTo= query param. */
  readonly returnTo = input<string | undefined>();

  private readonly transactions = inject(TransactionService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly existing = signal<Transaction | null>(null);
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly title = computed(
    () => `${this.id() ? 'Edit' : 'Add'} ${typeLabel(this.type())}`,
  );

  protected readonly backUrl = computed(() => {
    const target = this.returnTo();
    // Only allow in-app paths, never another website.
    if (target && target.startsWith('/') && !target.startsWith('//')) return target;
    return this.type() === 'income' ? '/income' : '/expenses';
  });

  constructor() {
    effect(() => {
      const id = this.id();
      if (id) untracked(() => void this.loadExisting(id));
    });
  }

  protected goBack(): void {
    void this.router.navigateByUrl(this.backUrl());
  }

  protected async save(changes: TransactionChanges): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);

    try {
      const id = this.id();
      if (id) {
        await this.transactions.updateTransaction(id, changes);
        this.toast.success('Transaction updated successfully.');
      } else {
        await this.transactions.createTransaction({ ...changes, transaction_type: this.type() });
        this.toast.success(`${typeLabel(this.type())} added successfully.`);
      }
      this.goBack();
    } catch (error) {
      this.toast.error(friendlyError(error, 'Unable to save the transaction. Please try again.'));
    } finally {
      this.saving.set(false);
    }
  }

  private async loadExisting(id: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const transaction = await this.transactions.getTransactionById(id);
      if (!transaction) {
        this.loadError.set('This transaction was not found. It may have been deleted.');
      } else if (transaction.transaction_type !== this.type()) {
        // e.g. /income/<expense-id>/edit - open the correct page instead.
        const base = transaction.transaction_type === 'income' ? '/income' : '/expenses';
        await this.router.navigate([base, id, 'edit'], {
          queryParams: { returnTo: this.returnTo() },
          replaceUrl: true,
        });
      } else {
        this.existing.set(transaction);
      }
    } catch (error) {
      this.loadError.set(friendlyError(error, 'Unable to load the transaction. Please try again.'));
    } finally {
      this.loading.set(false);
    }
  }
}
