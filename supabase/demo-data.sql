-- =====================================================================
-- OPTIONAL demo data - for trying the app only.
-- Do NOT run this on a real shop's database.
--
-- 1. Create an account in the app first (Create account page).
-- 2. Replace demo@example.com below with that account's email.
-- 3. Run this in Supabase Dashboard -> SQL Editor.
-- =====================================================================

with owner as (
    select id from auth.users where email = 'demo@example.com'
)
insert into public.transactions
    (user_id, transaction_type, amount, category, description, transaction_date)
select owner.id, t.transaction_type, t.amount, t.category, t.description, t.transaction_date
from owner
cross join (values
    ('income',  500.00::numeric,  'Xerox',       'Customer Xerox - 100 pages', current_date),
    ('income',  800.00::numeric,  'Printing',    'Colour print - project file', current_date),
    ('expense', 1200.00::numeric, 'Paper',       'A4 paper - 2 bundles',       current_date),
    ('expense', 500.00::numeric,  'Electricity', 'Electricity bill',           current_date - 1),
    ('income',  250.00::numeric,  'Lamination',  'ID card lamination',         current_date - 1),
    ('income',  150.00::numeric,  'Online Form', 'Exam form filling',          current_date - 2)
) as t(transaction_type, amount, category, description, transaction_date);

-- Update the shop name too (optional):
-- update public.profiles set shop_name = 'ABC Xerox'
-- where id = (select id from auth.users where email = 'demo@example.com');
