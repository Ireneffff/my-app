alter table registered_trades
  add column if not exists archived_at timestamptz;

create index if not exists registered_trades_archived_at_idx
  on registered_trades (archived_at);
