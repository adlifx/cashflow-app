# Cash Flow (Stage 1 foundation)

Next.js + TypeScript + Tailwind + Supabase (Postgres/Auth/RLS). Currency MYR, timezone Asia/Kuala_Lumpur.

## Status (honest)
Included: full database schema + RLS + atomic debt-repayment function, auth (login/signup/logout, protected routes),
tested finance calculation library, and a dashboard showing safe-to-spend and daily limit from real DB rows.
NOT built yet: income/expense forms, debts UI, commitments, budgets, savings goals, calendar, reports, charts, alerts.
This code has NOT been installed, built or run against Supabase yet; run the steps below and fix any version issues.

## Local setup
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Supabase URL and anon key.
3. `npm test` (calculation tests) then `npm run dev`.

## Supabase
1. Create a project at supabase.com.
2. SQL Editor: paste and run `supabase/migrations/0001_init.sql`.
3. Auth > Providers: enable Email (turn off "Confirm email" for local testing if you like).
4. Settings > API: copy Project URL and anon key into `.env.local`.
5. Add at least one account row (Table Editor > accounts) with your opening balance until the Accounts UI exists.

## Vercel
1. Push to GitHub, import the repo in Vercel.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables.
3. In Supabase Auth > URL Configuration, add your Vercel URL as Site URL.
4. Deploy. Never add the service-role key.
