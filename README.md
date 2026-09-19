# Shop Ledger

A simple daily income & expense book for a small Xerox / printing / stationery shop.

- Login with email and password (Supabase Auth)
- Add income and expenses in a few taps
- Dashboard with today's, this month's and this year's income, expense and profit
- Income, Expenses and History pages with date, month, year, category and type filters
- Monthly and yearly reports with category breakdowns
- Monthly PDF report download (made in the browser)
- Shop details in Settings

**Stack:** Angular 22 (standalone components, signals, reactive forms) + Supabase (PostgreSQL, Auth, Row Level Security) + jsPDF. There is no custom backend: the Angular app talks to Supabase directly, and Row Level Security makes sure each user only sees their own data.

---

## Requirements

- Node.js 20.19+ (tested with Node 24)
- Angular CLI (`npm install -g @angular/cli`), or use `npx ng ...`
- A free Supabase account: https://supabase.com

## Installation

```bash
npm install
```

## Supabase Setup

1. **Create a Supabase project** at https://supabase.com/dashboard.
2. Open **SQL Editor → New query**.
3. Paste the whole of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
   This creates:
   - `profiles` and `transactions` tables
   - indexes
   - Row Level Security and policies (users can only read and change their own rows)
   - a trigger that creates a profile when someone signs up
   - `updated_at` triggers
   - a trigger that stops a transaction's owner or type from being changed
   - `get_transaction_totals` and `get_category_totals` functions for fast totals (they also respect RLS)

   The script is safe to run again.
4. **Enable Email/Password authentication:** Authentication → Sign In / Providers → Email → enabled.
   - If *Confirm email* is on, new users must click the link in their email before logging in.
     Turn it off if you want the account to work straight away.
5. **Set the redirect URLs** (needed for confirmation and password reset emails):
   Authentication → URL Configuration
   - Site URL: `http://localhost:4200` (your real domain once deployed)
   - Redirect URLs: add `http://localhost:4200/**` (and `https://your-domain/**` later)
6. **Copy the Project URL and the anon public key:** Project Settings → API
   (called *Publishable key* in newer dashboards).
7. **Add them to the Angular environment files:**

   `src/environments/environment.development.ts` (used by `ng serve`)
   and `src/environments/environment.ts` (used by `ng build`):

   ```ts
   export const environment = {
     production: false, // true in environment.ts
     supabaseUrl: 'https://abcdefghijklmnop.supabase.co',
     supabaseAnonKey: 'eyJhbGciOi...your anon key...',
   };
   ```

> ⚠️ **Never** put the `service_role` / secret key in the Angular app. It bypasses RLS.
> The anon key is safe to ship because every table is protected by RLS.

## Run

```bash
ng serve
```

Open http://localhost:4200, click **Create account**, then log in.

## Build

```bash
ng build
```

The production files are written to `dist/shop-ledger/browser`. Host them on any static host
(Netlify, Vercel, Firebase Hosting, Cloudflare Pages, and so on). Configure the host to send unknown paths to
`index.html` so page refreshes work, and add the domain to Supabase's redirect URLs.

## Tests

```bash
ng test
```

## Optional demo data

Demo records are **never** inserted automatically. To try the app with sample entries:

1. Create an account in the app.
2. Open [`supabase/demo-data.sql`](supabase/demo-data.sql) and replace `demo@example.com` with that email.
3. Run it in the Supabase SQL Editor.

It adds entries such as:

| Type    | Category    | Amount |
| ------- | ----------- | -----: |
| Income  | Xerox       |   ₹500 |
| Income  | Printing    |   ₹800 |
| Expense | Paper       | ₹1,200 |
| Expense | Electricity |   ₹500 |

---

## Pages

| URL                                        | Page                                               |
| ------------------------------------------ | -------------------------------------------------- |
| `/login`, `/register`, `/forgot-password`  | Public pages                                       |
| `/reset-password`                          | Opened from the password reset email               |
| `/dashboard`                               | Totals, quick actions, latest 10 transactions      |
| `/income`, `/income/new`, `/income/:id/edit`       | Income list, add and edit                  |
| `/expenses`, `/expenses/new`, `/expenses/:id/edit` | Expense list, add and edit                 |
| `/transactions`                            | All transactions (All / Income / Expense filter)   |
| `/reports`                                 | Monthly / yearly report and PDF download           |
| `/settings`                                | Shop name, owner name, phone, logout               |

Every page except the public ones is protected by `authGuard`.

## Project structure

```text
src/app/
├── core/
│   ├── auth/          AuthService, AuthStateService (session signals), auth/guest guards
│   ├── models/        Transaction, Profile, categories
│   ├── services/      TransactionService, ProfileService, ReportService, PdfReportService
│   └── supabase/      SupabaseService (single client) + database types
├── shared/
│   ├── components/    transaction-form, transaction-table, date-filter, summary-card,
│   │                  confirm-dialog, empty-state, loading-spinner, pagination, toast, icon
│   ├── pipes/         inr (₹1,25,000), displayDate (15 Sep 2026)
│   ├── services/      ToastService, ConfirmService
│   └── utils/         currency, date (no UTC conversion), friendly errors
├── features/
│   ├── auth/          login, register, forgot-password, reset-password
│   ├── dashboard/
│   ├── transactions/  list page (income / expenses / history) and add/edit page
│   ├── reports/
│   └── settings/
├── layout/            app shell, header (desktop), bottom nav (mobile)
├── app.routes.ts
└── app.config.ts
supabase/
├── schema.sql         run once to set up the database
└── demo-data.sql      optional sample entries
```

## Notes

- **Dates** are stored as a PostgreSQL `date` (`2026-09-15`) and handled as plain strings in the
  app, so they never shift a day because of timezones.
- **Profit** is never stored. It is always `income − expense`, calculated when needed.
- **Totals** on list pages and the dashboard are summed in the database (RPC), so large histories
  are never downloaded. Lists are paginated (20 rows per page).
- **The monthly PDF** is built from the exact same report data shown on the Reports page. It embeds
  Noto Sans (`public/fonts`) so the ₹ symbol prints correctly, and it is named
  `shop-report-YYYY-MM.pdf`.
