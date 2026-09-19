import { Component, input, output } from '@angular/core';
import { Transaction, typeLabel } from '../../../core/models/transaction.model';
import { DisplayDatePipe } from '../../pipes/display-date.pipe';
import { InrPipe } from '../../pipes/inr.pipe';
import { IconComponent } from '../icon/icon.component';

/**
 * Transactions table used by the dashboard, lists and reports.
 * Turns into a simple card list on phones (see .stack-mobile in styles.scss).
 */
@Component({
  selector: 'app-transaction-table',
  imports: [DisplayDatePipe, InrPipe, IconComponent],
  template: `
    <div class="table-wrap">
      <table class="data-table stack-mobile">
        <thead>
          <tr>
            <th scope="col">Date</th>
            @if (showType()) {
              <th scope="col">Type</th>
            }
            <th scope="col">Category</th>
            <th scope="col">Description</th>
            <th scope="col" class="num">Amount</th>
            @if (showActions()) {
              <th scope="col" class="actions">Actions</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (t of transactions(); track t.id) {
            <tr>
              <td class="cell-date">{{ t.transaction_date | displayDate }}</td>
              @if (showType()) {
                <td>
                  <span class="badge" [class]="'badge-' + t.transaction_type">
                    {{ typeLabel(t.transaction_type) }}
                  </span>
                </td>
              }
              <td class="cell-category">{{ t.category }}</td>
              <td class="desc">{{ t.description }}</td>
              <td class="num" [class]="'amount-' + t.transaction_type">
                {{ t.transaction_type === 'income' ? '+' : '−' }} {{ t.amount | inr }}
              </td>
              @if (showActions()) {
                <td class="actions">
                  <span class="actions-inner">
                    <button
                      type="button"
                      class="icon-btn"
                      [attr.aria-label]="'Edit ' + t.category + ' entry'"
                      title="Edit"
                      (click)="edit.emit(t)"
                    >
                      <app-icon name="edit" [size]="18" />
                    </button>
                    <button
                      type="button"
                      class="icon-btn danger"
                      [attr.aria-label]="'Delete ' + t.category + ' entry'"
                      title="Delete"
                      [disabled]="deletingId() === t.id"
                      (click)="remove.emit(t)"
                    >
                      <app-icon name="trash" [size]="18" />
                    </button>
                  </span>
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class TransactionTableComponent {
  readonly transactions = input.required<readonly Transaction[]>();
  readonly showType = input(true);
  readonly showActions = input(false);
  readonly deletingId = input<string | null>(null);

  readonly edit = output<Transaction>();
  readonly remove = output<Transaction>();

  protected readonly typeLabel = typeLabel;
}
