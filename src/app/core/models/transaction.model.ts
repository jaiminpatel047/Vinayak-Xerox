export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  user_id: string;
  transaction_type: TransactionType;
  amount: number;
  category: string;
  description?: string | null;
  transaction_date: string; // Business date, always 'YYYY-MM-DD'
  created_at: string;
  updated_at: string;
}

/** Fields the user fills in on the add form. user_id is added by the service. */
export interface TransactionInput {
  transaction_type: TransactionType;
  amount: number;
  category: string;
  description: string | null;
  transaction_date: string;
}

/** Fields that may be changed when editing. Type and owner are never editable. */
export type TransactionChanges = Pick<
  TransactionInput,
  'amount' | 'category' | 'description' | 'transaction_date'
>;

export interface TransactionFilter {
  type: TransactionType | null;
  from: string | null;
  to: string | null;
  category: string | null;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
}

export interface Totals {
  income: number;
  expense: number;
  profit: number;
}

export interface CategoryTotal {
  category: string;
  amount: number;
}

export const INCOME_CATEGORIES: readonly string[] = [
  'Xerox',
  'Printing',
  'Color Printing',
  'Scanning',
  'Lamination',
  'Binding',
  'Stationery',
  'Online Form',
  'Photo',
  'Other',
];

export const EXPENSE_CATEGORIES: readonly string[] = [
  'Paper',
  'Ink',
  'Toner',
  'Electricity',
  'Internet',
  'Rent',
  'Staff Salary',
  'Machine Repair',
  'Stationery Purchase',
  'Transportation',
  'Other',
];

export function categoriesFor(type: TransactionType | null): readonly string[] {
  if (type === 'income') return INCOME_CATEGORIES;
  if (type === 'expense') return EXPENSE_CATEGORIES;
  return [...new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES])];
}

export function typeLabel(type: TransactionType): string {
  return type === 'income' ? 'Income' : 'Expense';
}
