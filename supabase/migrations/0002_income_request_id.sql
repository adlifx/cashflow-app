-- Stage 2: stop double-submitted income entries
alter table income add column if not exists client_request_id uuid;
create unique index if not exists income_user_request_uq on income(user_id, client_request_id);
