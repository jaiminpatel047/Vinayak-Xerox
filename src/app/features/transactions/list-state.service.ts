import { Injectable, signal, WritableSignal } from '@angular/core';
import { TransactionFilter, TransactionType } from '../../core/models/transaction.model';
import { currentMonth, currentYear, monthRange } from '../../shared/utils/date.utils';

export type ListKey = TransactionType | 'all';

export interface ListState {
  filter: TransactionFilter;
  page: number;
}

/**
 * Remembers each list's filter and page while the app is open, so going to
 * Edit and coming back keeps the owner where they were.
 */
@Injectable({ providedIn: 'root' })
export class ListStateService {
  private readonly states = new Map<ListKey, WritableSignal<ListState>>();

  get(key: ListKey): WritableSignal<ListState> {
    let state = this.states.get(key);
    if (!state) {
      state = signal(defaultState(key));
      this.states.set(key, state);
    }
    return state;
  }
}

/** Lists open on the current month so we never load years of data by default. */
function defaultState(key: ListKey): ListState {
  return {
    filter: {
      type: key === 'all' ? null : key,
      category: null,
      ...monthRange(currentYear(), currentMonth()),
    },
    page: 1,
  };
}
