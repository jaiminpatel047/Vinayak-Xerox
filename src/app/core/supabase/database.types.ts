// Hand-written types matching supabase/schema.sql.
// (Can be regenerated with `supabase gen types typescript` if the schema grows.)

type TransactionRow = {
  id: string;
  user_id: string;
  transaction_type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  shop_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      transactions: {
        Row: TransactionRow;
        Insert: {
          id?: string;
          user_id: string;
          transaction_type: 'income' | 'expense';
          amount: number;
          category: string;
          description?: string | null;
          transaction_date?: string;
        };
        Update: {
          amount?: number;
          category?: string;
          description?: string | null;
          transaction_date?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: ProfileRow;
        Insert: {
          id: string;
          full_name?: string | null;
          shop_name?: string | null;
          phone?: string | null;
        };
        Update: {
          full_name?: string | null;
          shop_name?: string | null;
          phone?: string | null;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      get_transaction_totals: {
        Args: {
          p_from?: string | null;
          p_to?: string | null;
          p_category?: string | null;
          p_type?: string | null;
        };
        Returns: {
          total_income: number;
          total_expense: number;
          transaction_count: number;
        }[];
      };
      get_category_totals: {
        Args: { p_from: string; p_to: string };
        Returns: {
          transaction_type: 'income' | 'expense';
          category: string;
          total: number;
        }[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
