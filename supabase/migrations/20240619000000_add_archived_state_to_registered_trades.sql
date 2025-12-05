-- Add archived state tracking to registered trades
alter table public.registered_trades
  add column if not exists is_archived boolean not null default false,
  add column if not exists archived_at timestamptz null;

create index if not exists registered_trades_archived_created_idx
  on public.registered_trades (is_archived, created_at desc nulls last);
