-- =====================================================================
-- Shop Ledger - Supabase database setup
--
-- Run this whole file once in: Supabase Dashboard -> SQL Editor -> New query
-- It is safe to re-run (uses IF NOT EXISTS / DROP ... IF EXISTS).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Profiles table (one row per auth user)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text,
    shop_name text,
    phone text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 2. Transactions table (income AND expense in one table)
-- ---------------------------------------------------------------------
create table if not exists public.transactions (
    id uuid primary key default gen_random_uuid(),

    -- Defaults to the logged-in user; RLS below still enforces it.
    user_id uuid not null default auth.uid()
        references auth.users(id)
        on delete cascade,

    transaction_type text not null
        check (transaction_type in ('income', 'expense')),

    amount numeric(12,2) not null
        check (amount > 0),

    category text not null,

    description text,

    transaction_date date not null default current_date,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------
create index if not exists idx_transactions_user_id
    on public.transactions(user_id);

create index if not exists idx_transactions_date
    on public.transactions(transaction_date);

create index if not exists idx_transactions_user_date
    on public.transactions(user_id, transaction_date);

create index if not exists idx_transactions_type
    on public.transactions(transaction_type);


-- ---------------------------------------------------------------------
-- 4. Enable Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

alter table public.transactions enable row level security;


-- ---------------------------------------------------------------------
-- 5. RLS policies - users can only touch their own rows
-- ---------------------------------------------------------------------

-- Transactions
drop policy if exists "Users can view own transactions" on public.transactions;
create policy "Users can view own transactions"
on public.transactions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own transactions" on public.transactions;
create policy "Users can insert own transactions"
on public.transactions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own transactions" on public.transactions;
create policy "Users can update own transactions"
on public.transactions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own transactions" on public.transactions;
create policy "Users can delete own transactions"
on public.transactions
for delete
to authenticated
using (auth.uid() = user_id);

-- Profiles
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Allows the app to create a missing profile (e.g. users created before
-- the trigger below existed). A user can still only insert their own id.
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);


-- ---------------------------------------------------------------------
-- 6. Table privileges for logged-in users (RLS still applies)
--    Anonymous (logged-out) visitors get no access at all.
-- ---------------------------------------------------------------------
revoke all on public.profiles from anon;
revoke all on public.transactions from anon;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;


-- ---------------------------------------------------------------------
-- 7. Automatic profile creation when a new auth user signs up
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, full_name, shop_name)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', ''),
        coalesce(new.raw_user_meta_data->>'shop_name', '')
    )
    on conflict (id) do nothing;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

-- Backfill profiles for any users that already existed.
insert into public.profiles (id, full_name)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', '')
from auth.users u
on conflict (id) do nothing;


-- ---------------------------------------------------------------------
-- 8. updated_at triggers
-- ---------------------------------------------------------------------
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists update_transactions_updated_at on public.transactions;
create trigger update_transactions_updated_at
before update on public.transactions
for each row
execute function public.update_updated_at_column();

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
before update on public.profiles
for each row
execute function public.update_updated_at_column();


-- ---------------------------------------------------------------------
-- 9. Transaction owner / type protection
--    Nobody can move a transaction to another user, and the
--    income/expense type cannot be changed after creation.
-- ---------------------------------------------------------------------
create or replace function public.protect_transaction_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if new.user_id is distinct from old.user_id then
        raise exception 'user_id cannot be changed';
    end if;

    if new.transaction_type is distinct from old.transaction_type then
        raise exception 'transaction_type cannot be changed';
    end if;

    return new;
end;
$$;

drop trigger if exists protect_transactions_columns on public.transactions;
create trigger protect_transactions_columns
before update on public.transactions
for each row
execute function public.protect_transaction_columns();


-- ---------------------------------------------------------------------
-- 10. Summary functions (fast totals without downloading every row)
--     SECURITY INVOKER => RLS applies, users only ever see their own sums.
-- ---------------------------------------------------------------------
create or replace function public.get_transaction_totals(
    p_from date default null,
    p_to date default null,
    p_category text default null,
    p_type text default null
)
returns table (
    total_income numeric,
    total_expense numeric,
    transaction_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
    select
        coalesce(sum(t.amount) filter (where t.transaction_type = 'income'), 0)  as total_income,
        coalesce(sum(t.amount) filter (where t.transaction_type = 'expense'), 0) as total_expense,
        count(*) as transaction_count
    from public.transactions t
    where t.user_id = auth.uid()
      and (p_from is null or t.transaction_date >= p_from)
      and (p_to is null or t.transaction_date <= p_to)
      and (p_category is null or t.category = p_category)
      and (p_type is null or t.transaction_type = p_type);
$$;

create or replace function public.get_category_totals(
    p_from date,
    p_to date
)
returns table (
    transaction_type text,
    category text,
    total numeric
)
language sql
stable
security invoker
set search_path = public
as $$
    select t.transaction_type, t.category, sum(t.amount) as total
    from public.transactions t
    where t.user_id = auth.uid()
      and t.transaction_date between p_from and p_to
    group by t.transaction_type, t.category
    order by t.transaction_type, total desc;
$$;

revoke execute on function public.get_transaction_totals(date, date, text, text) from public, anon;
revoke execute on function public.get_category_totals(date, date) from public, anon;
grant execute on function public.get_transaction_totals(date, date, text, text) to authenticated;
grant execute on function public.get_category_totals(date, date) to authenticated;
