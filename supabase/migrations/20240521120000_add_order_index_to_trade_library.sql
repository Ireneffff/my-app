-- Ensure trade_library rows can be ordered consistently
alter table public.trade_library
  add column if not exists order_index integer not null default 0;

-- Backfill sequential order_index values per trade
with ranked as (
  select
    id,
    row_number() over (partition by trade_id order by id) - 1 as new_order_index
  from public.trade_library
)
update public.trade_library as tl
set order_index = ranked.new_order_index
from ranked
where tl.id = ranked.id;
