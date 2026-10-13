-- 0001_init.sql : core schema for the personal finance app (MYR, Asia/Kuala_Lumpur)
-- All money columns are numeric(12,2). Every table is user-scoped with RLS.

create extension if not exists pgcrypto;

create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end $$ language plpgsql;

-- ───────── Profile & settings ─────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  expected_salary numeric(12,2) not null default 0 check (expected_salary >= 0),
  salary_day smallint not null default 25 check (salary_day between 1 and 31),
  savings_target numeric(12,2) not null default 0 check (savings_target >= 0),
  emergency_reserve numeric(12,2) not null default 0 check (emergency_reserve >= 0),
  other_reserved numeric(12,2) not null default 0 check (other_reserved >= 0),
  warn_threshold_pct smallint not null default 75 check (warn_threshold_pct between 1 and 100),
  timezone text not null default 'Asia/Kuala_Lumpur',
  currency text not null default 'MYR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on sign-up
create or replace function handle_new_user() returns trigger as $$
begin insert into profiles(id) values (new.id); return new; end $$
language plpgsql security definer set search_path = public;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ───────── Accounts ─────────
create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('cash','bank','e_wallet','savings')),  -- credit cards are NOT cash accounts
  opening_balance numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on accounts(user_id);

-- ───────── Income ─────────
create table income (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references accounts(id) on delete set null,
  income_date date not null,
  source text not null,
  description text,
  amount numeric(12,2) not null check (amount > 0),
  income_type text not null check (income_type in ('salary','bonus','freelance','allowance','other')),
  status text not null default 'received' check (status in ('expected','received')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on income(user_id, income_date);

-- ───────── Debts ─────────
create table debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  lender text not null,
  debt_type text not null check (debt_type in ('bank','friend','family','credit_card','bnpl','other')),
  original_amount numeric(12,2) not null check (original_amount >= 0),
  current_balance numeric(12,2) not null check (current_balance >= 0),
  interest_rate numeric(5,2) not null default 0 check (interest_rate >= 0),
  min_payment numeric(12,2) not null default 0 check (min_payment >= 0),
  due_day smallint check (due_day between 1 and 31),
  start_date date,
  expected_settlement date,
  frequency text not null default 'monthly' check (frequency in ('weekly','monthly','one_time')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on debts(user_id);

-- ───────── Recurring commitments ─────────
create table commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null check (amount > 0),
  due_day smallint not null check (due_day between 1 and 31),
  frequency text not null default 'monthly' check (frequency in ('weekly','monthly','yearly')),
  start_date date not null,
  end_date date,
  payment_method text,
  debt_id uuid references debts(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on commitments(user_id);

-- One row per commitment per month → generation is idempotent (no duplicates)
create table commitment_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  commitment_id uuid not null references commitments(id) on delete cascade,
  period date not null,                 -- first day of the month
  due_date date not null,
  amount numeric(12,2) not null,
  status text not null default 'upcoming' check (status in ('upcoming','paid','overdue')),
  expense_id uuid,                      -- FK added below
  created_at timestamptz not null default now(),
  unique (commitment_id, period)
);
create index on commitment_occurrences(user_id, due_date);

-- ───────── Expenses ─────────
create table expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references accounts(id) on delete set null,
  spent_at timestamptz not null default now(),
  description text not null,
  category text not null check (category in (
    'food','transport','car_installment','car_maintenance','toll_parking','shopping','online',
    'bills','phone_internet','insurance','family','entertainment','health','education',
    'debt_repayment','savings','other')),
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('cash','debit_card','credit_card','bank_transfer','e_wallet','other')),
  merchant text,
  is_essential boolean not null default true,
  is_recurring boolean not null default false,
  notes text,
  receipt_path text,                    -- path in private storage bucket 'receipts'
  debt_id uuid references debts(id) on delete set null,
  commitment_occurrence_id uuid,
  client_request_id uuid,               -- idempotency key: blocks double submits
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_request_id)
);
create index on expenses(user_id, spent_at desc);
create index on expenses(user_id, category);

alter table commitment_occurrences
  add constraint occ_expense_fk foreign key (expense_id) references expenses(id) on delete set null;
alter table expenses
  add constraint exp_occ_fk foreign key (commitment_occurrence_id) references commitment_occurrences(id) on delete set null;

-- ───────── Debt repayments & balance history ─────────
create table debt_repayments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null references debts(id) on delete cascade,
  expense_id uuid references expenses(id) on delete set null,  -- the single linked cash-flow record
  paid_on date not null,
  amount numeric(12,2) not null check (amount > 0),
  balance_after numeric(12,2) not null,
  created_at timestamptz not null default now()
);
create index on debt_repayments(debt_id, paid_on);

create table debt_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null references debts(id) on delete cascade,
  old_balance numeric(12,2) not null,
  new_balance numeric(12,2) not null check (new_balance >= 0),
  reason text not null,
  created_at timestamptz not null default now()
);

-- ───────── Transfers (never income or expense) ─────────
create table transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_account_id uuid not null references accounts(id) on delete cascade,
  to_account_id uuid not null references accounts(id) on delete cascade,
  transfer_date date not null,
  amount numeric(12,2) not null check (amount > 0),
  notes text,
  created_at timestamptz not null default now(),
  check (from_account_id <> to_account_id)
);
create index on transfers(user_id, transfer_date);

-- ───────── Budgets ─────────
create table budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period date not null,                 -- first day of month
  category text not null,
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period, category)
);

-- ───────── Savings goals ─────────
create table savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(12,2) not null check (target_amount > 0),
  target_date date,
  monthly_contribution numeric(12,2) not null default 0 check (monthly_contribution >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table savings_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references savings_goals(id) on delete cascade,
  contributed_on date not null,
  amount numeric(12,2) not null,        -- negative = withdrawal
  transfer_id uuid references transfers(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on savings_contributions(goal_id);

-- ───────── Notifications ─────────
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  message text not null,
  dedupe_key text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

-- ───────── updated_at triggers ─────────
do $$ declare t text; begin
  foreach t in array array['profiles','accounts','income','debts','commitments','expenses','budgets','savings_goals']
  loop execute format('create trigger trg_%1$s_updated before update on %1$s for each row execute function set_updated_at()', t); end loop;
end $$;

-- ───────── Row Level Security ─────────
do $$ declare t text; begin
  foreach t in array array['accounts','income','debts','commitments','commitment_occurrences','expenses',
    'debt_repayments','debt_adjustments','transfers','budgets','savings_goals','savings_contributions','notifications']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "own rows" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

alter table profiles enable row level security;
create policy "own profile" on profiles for all using (id = auth.uid()) with check (id = auth.uid());

-- ───────── Atomic debt repayment ─────────
-- Creates ONE expense + ONE repayment row + reduces balance, all in one transaction.
-- The expense is the only cash-flow record; repayments never deduct cash on their own.
create or replace function record_debt_repayment(
  p_debt_id uuid, p_amount numeric, p_paid_on date, p_account_id uuid,
  p_payment_method text, p_request_id uuid
) returns uuid language plpgsql security invoker as $$
declare v_debt debts%rowtype; v_expense uuid; v_new numeric(12,2);
begin
  select * into v_debt from debts where id = p_debt_id and user_id = auth.uid() for update;
  if not found then raise exception 'Debt not found'; end if;
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;
  if p_amount > v_debt.current_balance then raise exception 'Payment exceeds outstanding balance'; end if;

  -- idempotent: a repeated request id returns the existing expense
  select id into v_expense from expenses where user_id = auth.uid() and client_request_id = p_request_id;
  if found then return v_expense; end if;

  insert into expenses(user_id, account_id, spent_at, description, category, amount, payment_method,
                       is_essential, debt_id, client_request_id)
  values (auth.uid(), p_account_id, (p_paid_on::timestamp at time zone 'Asia/Kuala_Lumpur'),
          'Repayment: ' || v_debt.name, 'debt_repayment', p_amount, p_payment_method, true, p_debt_id, p_request_id)
  returning id into v_expense;

  v_new := v_debt.current_balance - p_amount;
  update debts set current_balance = v_new where id = p_debt_id;

  insert into debt_repayments(user_id, debt_id, expense_id, paid_on, amount, balance_after)
  values (auth.uid(), p_debt_id, v_expense, p_paid_on, p_amount, v_new);

  return v_expense;
end $$;

-- Private receipts bucket; files live under <user_id>/...
insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false) on conflict do nothing;
create policy "own receipts" on storage.objects for all
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
