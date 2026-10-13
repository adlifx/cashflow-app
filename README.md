# Cash Flow: personal finance and monthly cash-flow app

Next.js (App Router) + TypeScript + Tailwind + Supabase (Postgres, Auth, Storage, RLS) + Recharts. Currency MYR (RM), timezone Asia/Kuala_Lumpur. Manual entry only; no bank integration.

## What it does
Dashboard with safe-to-spend and daily limit, transactions with receipts, income, budgets, debts and repayments, monthly commitments, savings goals, calendar, reports (charts, month-end review, CSV, print), alerts, settings.

## Setup
1. Install Node.js 20+.
2. Create a Supabase project. In **SQL Editor**, run these files **in order**:
   `supabase/migrations/0001_init.sql`, `0002_income_request_id.sql`, `0003_debt_commitment_fns.sql`, `0004_hardening.sql`.
3. Supabase **Authentication**: enable Email. For real use, keep **Confirm email** ON and set **Site URL** and **Redirect URLs** to your Vercel address.
4. Copy `.env.example` to `.env.local` and fill in the project URL and the public key (legacy `anon` key starting with `eyJ`, or the publishable key).
5. `npm install`, then `npm test`, then `npm run dev`. Open http://localhost:3000, create an account, then fill in **Settings** (salary, payday, reserves, an account with its opening balance).

## Deploy on Vercel
1. Push the project to a **private** GitHub repo (`.env.local` is git-ignored).
2. In Vercel: Add New > Project > import the repo. Framework is detected automatically.
3. Add environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then Deploy. Variables only reach builds made after they are saved, so redeploy after changing them.
4. Put the Vercel URL into Supabase Authentication > URL Configuration.
Later changes: push to `main` and Vercel redeploys.

## Security notes
- Every table has Row Level Security: a signed-in user can only read and write rows where `user_id` is their own id. Pages are protected by middleware.
- Only the public key is used. The service-role (secret) key is never needed and must never be added to this app or to `NEXT_PUBLIC_` variables.
- Receipts live in a **private** storage bucket under the user's own folder; the app shows 1-hour signed links. Uploads are limited to JPG/PNG/WebP up to 3 MB.
- Server actions validate all input with Zod. Database functions are callable only by signed-in users.
- CSV export neutralises spreadsheet formulas. Security headers are set in `next.config.mjs`.
- Money is stored as `numeric(12,2)`; arithmetic uses integer sen in code.

## Data integrity
- A debt repayment creates ONE expense, ONE repayment row and lowers the balance in a single database function, so cash is never deducted twice. Marking a commitment paid works the same way.
- Double submits are blocked by a per-form request id.
- Transfers and savings contributions are never counted as income or expenses. Credit card purchases and borrowed money are never counted as cash.

## Tests
`npm test` covers safe-to-spend, daily limit, payday dates, budget status, payoff estimate, cash balance, alerts, reports and paging. `npm run build` was run successfully before packaging. Nothing here has been tested against your own Supabase project until you run it.

## Known limits
Commitments are monthly only. No undo for repayments (use a balance adjustment with a reason). Alerts show on the dashboard only; no email, push or WhatsApp is sent. No transfers screen between accounts. Dashboard charts live on the Reports page. `npm audit` reports PostCSS issues inside Next.js's build tooling; they involve attacker-supplied CSS, which this app never processes, and are fixed by a future Next.js upgrade.
