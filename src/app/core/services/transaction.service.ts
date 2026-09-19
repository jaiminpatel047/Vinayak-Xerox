import { inject, Injectable } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import {
  CategoryTotal,
  PagedResult,
  Totals,
  Transaction,
  TransactionChanges,
  TransactionFilter,
  TransactionInput,
  TransactionType,
} from '../models/transaction.model';
import { SupabaseService } from '../supabase/supabase.service';
import { subtractAmounts } from '../../shared/utils/currency.utils';
import { isFutureDate } from '../../shared/utils/date.utils';

const COLUMNS =
  'id, user_id, transaction_type, amount, category, description, transaction_date, created_at, updated_at';

/** PostgREST returns at most 1000 rows per request by default. */
const FETCH_CHUNK = 1000;

export const EMPTY_FILTER: TransactionFilter = { type: null, from: null, to: null, category: null };

/**
 * All transaction reads/writes. RLS on the database guarantees users only
 * ever see and change their own rows, so no user_id filter is trusted here.
 */
@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);

  /** One page of transactions matching the filter, newest first. */
  async getTransactions(
    filter: TransactionFilter,
    page = 1,
    pageSize = 20,
  ): Promise<PagedResult<Transaction>> {
    const start = (page - 1) * pageSize;

    let query = this.supabase.from('transactions').select(COLUMNS, { count: 'exact' });
    if (filter.type) query = query.eq('transaction_type', filter.type);
    if (filter.category) query = query.eq('category', filter.category);
    if (filter.from) query = query.gte('transaction_date', filter.from);
    if (filter.to) query = query.lte('transaction_date', filter.to);

    const { data, error, count } = await query
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(start, start + pageSize - 1);

    if (error) throw error;
    return { items: data.map(normalize), total: count ?? 0 };
  }

  getIncome(filter: TransactionFilter, page = 1, pageSize = 20): Promise<PagedResult<Transaction>> {
    return this.getTransactions({ ...filter, type: 'income' }, page, pageSize);
  }

  getExpenses(
    filter: TransactionFilter,
    page = 1,
    pageSize = 20,
  ): Promise<PagedResult<Transaction>> {
    return this.getTransactions({ ...filter, type: 'expense' }, page, pageSize);
  }

  async getRecent(limit = 10): Promise<Transaction[]> {
    const result = await this.getTransactions(EMPTY_FILTER, 1, limit);
    return result.items;
  }

  /** Every transaction between two dates (inclusive), oldest first. Used for reports. */
  async getAllInRange(from: string, to: string): Promise<Transaction[]> {
    const all: Transaction[] = [];

    for (let start = 0; ; start += FETCH_CHUNK) {
      const { data, error } = await this.supabase
        .from('transactions')
        .select(COLUMNS)
        .gte('transaction_date', from)
        .lte('transaction_date', to)
        .order('transaction_date', { ascending: true })
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(start, start + FETCH_CHUNK - 1);

      if (error) throw error;
      all.push(...data.map(normalize));
      if (data.length < FETCH_CHUNK) break;
    }

    return all;
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    const { data, error } = await this.supabase
      .from('transactions')
      .select(COLUMNS)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? normalize(data) : null;
  }

  async createTransaction(input: TransactionInput): Promise<Transaction> {
    if (isFutureDate(input.transaction_date)) {
      throw new Error('Future dates are not allowed.');
    }
    const user = await this.auth.getVerifiedUser();

    const { data, error } = await this.supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        transaction_type: input.transaction_type,
        amount: input.amount,
        category: input.category,
        description: input.description,
        transaction_date: input.transaction_date,
      })
      .select(COLUMNS)
      .single();

    if (error) throw error;
    return normalize(data);
  }

  /** Only date, category, amount and description can change — never type or owner. */
  async updateTransaction(id: string, changes: TransactionChanges): Promise<Transaction> {
    if (changes.transaction_date && isFutureDate(changes.transaction_date)) {
      throw new Error('Future dates are not allowed.');
    }
    const { data, error } = await this.supabase
      .from('transactions')
      .update({
        amount: changes.amount,
        category: changes.category,
        description: changes.description,
        transaction_date: changes.transaction_date,
      })
      .eq('id', id)
      .select(COLUMNS)
      .single();

    if (error) throw error;
    return normalize(data);
  }

  async deleteTransaction(id: string): Promise<void> {
    const { error, count } = await this.supabase
      .from('transactions')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) throw error;
    if (count === 0) throw new Error('Transaction not found');
  }

  /** Income / expense / profit totals for the filter, calculated in the database. */
  async getTotals(filter: TransactionFilter): Promise<Totals> {
    const { data, error } = await this.supabase.rpc('get_transaction_totals', {
      p_from: filter.from,
      p_to: filter.to,
      p_category: filter.category,
      p_type: filter.type,
    });

    if (error) throw error;
    const row = data[0];
    const income = Number(row?.total_income ?? 0);
    const expense = Number(row?.total_expense ?? 0);
    return { income, expense, profit: subtractAmounts(income, expense) };
  }

  /** Category totals for a date range, calculated in the database. */
  async getCategoryTotals(
    from: string,
    to: string,
  ): Promise<Record<TransactionType, CategoryTotal[]>> {
    const { data, error } = await this.supabase.rpc('get_category_totals', {
      p_from: from,
      p_to: to,
    });

    if (error) throw error;
    const result: Record<TransactionType, CategoryTotal[]> = { income: [], expense: [] };
    for (const row of data) {
      result[row.transaction_type].push({ category: row.category, amount: Number(row.total) });
    }
    return result;
  }
}

/** numeric columns can arrive as strings; make sure amount is always a number. */
function normalize(row: Transaction): Transaction {
  return { ...row, amount: Number(row.amount) };
}
