import { inject, Injectable } from '@angular/core';
import {
  CategoryTotal,
  Totals,
  Transaction,
  TransactionType,
} from '../models/transaction.model';
import { TransactionService } from './transaction.service';
import { subtractAmounts, sumAmounts } from '../../shared/utils/currency.utils';
import { monthLabel, monthRange, yearRange } from '../../shared/utils/date.utils';

export interface MonthlyReport {
  year: number;
  month: number; // 1-12
  label: string; // 'September 2026'
  totals: Totals;
  incomeByCategory: CategoryTotal[];
  expenseByCategory: CategoryTotal[];
  transactions: Transaction[];
}

export interface YearlyReport {
  year: number;
  totals: Totals;
  incomeByCategory: CategoryTotal[];
  expenseByCategory: CategoryTotal[];
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly transactions = inject(TransactionService);

  /**
   * Fetches only the selected month's transactions and derives every number
   * from that same list, so the page and the PDF always agree.
   */
  async getMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
    const range = monthRange(year, month);
    const transactions = await this.transactions.getAllInRange(range.from, range.to);

    return {
      year,
      month,
      label: monthLabel(year, month),
      totals: this.calculateTotals(transactions),
      incomeByCategory: this.groupByCategory(transactions, 'income'),
      expenseByCategory: this.groupByCategory(transactions, 'expense'),
      transactions,
    };
  }

  /** Yearly totals are summed in the database to avoid downloading a whole year. */
  async getYearlyReport(year: number): Promise<YearlyReport> {
    const range = yearRange(year);
    const [totals, byCategory] = await Promise.all([
      this.transactions.getTotals({ type: null, category: null, ...range }),
      this.transactions.getCategoryTotals(range.from, range.to),
    ]);

    return {
      year,
      totals,
      incomeByCategory: byCategory.income,
      expenseByCategory: byCategory.expense,
    };
  }

  calculateTotals(transactions: readonly Transaction[]): Totals {
    const income = sumAmounts(amountsOf(transactions, 'income'));
    const expense = sumAmounts(amountsOf(transactions, 'expense'));
    return { income, expense, profit: subtractAmounts(income, expense) };
  }

  /** Category totals for one type, largest first. */
  groupByCategory(transactions: readonly Transaction[], type: TransactionType): CategoryTotal[] {
    const groups = new Map<string, number[]>();

    for (const t of transactions) {
      if (t.transaction_type !== type) continue;
      const amounts = groups.get(t.category) ?? [];
      amounts.push(t.amount);
      groups.set(t.category, amounts);
    }

    return [...groups.entries()]
      .map(([category, amounts]) => ({ category, amount: sumAmounts(amounts) }))
      .sort((a, b) => b.amount - a.amount);
  }
}

function amountsOf(transactions: readonly Transaction[], type: TransactionType): number[] {
  return transactions.filter((t) => t.transaction_type === type).map((t) => t.amount);
}
