-- Sasyathra core schema
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query)

create table if not exists processing_units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  village text not null,
  capacity_kg_per_day int not null
);

create table if not exists demands (
  id uuid primary key default gen_random_uuid(),
  product text not null,
  qty_kg numeric not null,
  matched_kg numeric not null default 0,
  location text not null,
  buyer_name text not null,
  required_date date,
  -- Expected price the buyer is offering. Real earnings math (advance +
  -- balance) is computed from this instead of a hardcoded example number.
  price_per_kg numeric not null default 0,
  -- % of expected earnings a farmer can draw immediately once their pledge
  -- is accepted, instead of waiting for processing + delivery to be paid.
  -- This is the direct answer to "why not just sell to the local mill today":
  -- the farmer gets speed AND the better confirmed-demand price.
  advance_percent numeric not null default 70,
  status text not null default 'open' check (status in ('open','processing','delivered')),
  unit_id uuid references processing_units(id),
  batch_id text,
  created_at timestamptz not null default now()
);

create table if not exists contributions (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references demands(id) on delete cascade,
  farmer_name text not null,
  village text not null,
  qty_kg numeric not null,
  created_at timestamptz not null default now()
);

-- If you already ran an earlier version of this schema, run this block to
-- add the new pricing columns without losing existing data.
alter table demands add column if not exists price_per_kg numeric not null default 0;
alter table demands add column if not exists advance_percent numeric not null default 70;

-- Atomic, safe pledge:
--  - locks the demand row so two simultaneous pledges can't race each other
--  - never records more than what the demand actually still needs
--  - rejects zero/negative pledges and already-full demands
--  - returns the quantity actually accepted, so the UI can tell the farmer
--    the truth instead of assuming their full request went through
create or replace function pledge_produce(
  p_demand_id uuid, p_farmer_name text, p_village text, p_qty numeric
) returns numeric as $$
declare
  v_remaining numeric;
  v_accepted numeric;
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'Pledge quantity must be greater than zero';
  end if;

  select qty_kg - matched_kg into v_remaining from demands where id = p_demand_id for update;

  if v_remaining is null then
    raise exception 'Demand not found';
  end if;

  v_accepted := least(p_qty, v_remaining);

  if v_accepted <= 0 then
    raise exception 'This demand is already fully matched';
  end if;

  insert into contributions (demand_id, farmer_name, village, qty_kg)
  values (p_demand_id, p_farmer_name, p_village, v_accepted);

  update demands set matched_kg = matched_kg + v_accepted where id = p_demand_id;

  return v_accepted;
end;
$$ language plpgsql;

insert into processing_units (name, village, capacity_kg_per_day) values
  ('Kondapur FPO Mill (CHC-registered)', 'Kondapur', 1500),
  ('Warangal Cooperative Processing Unit', 'Warangal Cluster', 1000)
on conflict do nothing;

alter table demands enable row level security;
alter table contributions enable row level security;
alter table processing_units enable row level security;

create policy "public read demands" on demands for select using (true);
create policy "public write demands" on demands for insert with check (true);
create policy "public update demands" on demands for update using (true);

create policy "public read contributions" on contributions for select using (true);
create policy "public write contributions" on contributions for insert with check (true);

create policy "public read units" on processing_units for select using (true);
