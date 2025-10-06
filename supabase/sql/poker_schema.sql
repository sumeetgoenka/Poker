-- Enable UUIDs (usually present on Supabase)
create extension if not exists pgcrypto;

-- ===================== TABLES =====================
create table if not exists tables (
  id uuid primary key default gen_random_uuid(),
  host_uid text not null,
  small_blind int not null,
  big_blind int not null,
  max_players int not null default 6,
  is_private boolean not null default true,
  invite_token text,
  status text not null default 'waiting' check (status in ('waiting','in_hand','ended')),
  created_at timestamptz not null default now()
);

create table if not exists table_players (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references tables(id) on delete cascade,
  uid text not null,
  nickname text,
  seat int not null check (seat between 1 and 6),
  stack int not null default 2000,
  is_connected boolean not null default true,
  last_seen timestamptz not null default now(),
  unique(table_id, seat)
);

create table if not exists hand (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null unique references tables(id) on delete cascade,
  hand_no int not null default 1,
  dealer_seat int,
  sb_seat int,
  bb_seat int,
  board jsonb not null default '[]',
  pot int not null default 0,
  street text not null default 'preflop' check (street in ('preflop','flop','turn','river','showdown')),
  to_act_seat int,
  min_raise int not null default 0,
  act_deadline timestamptz,
  deck jsonb
);

create table if not exists private_holes (
  table_id uuid not null references tables(id) on delete cascade,
  seat int not null check (seat between 1 and 6),
  cards jsonb not null,
  primary key (table_id, seat)
);

create table if not exists actions (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references tables(id) on delete cascade,
  hand_no int not null,
  seat int not null,
  action text not null check (action in ('post','fold','check','call','bet','raise')),
  amount int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists chat (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references tables(id) on delete cascade,
  uid text not null,
  nickname text,
  text text not null,
  created_at timestamptz not null default now()
);

-- ===================== INDEXES =====================
create index if not exists idx_table_players_table on table_players(table_id);
create index if not exists idx_hand_table on hand(table_id);
create index if not exists idx_actions_table_created on actions(table_id, created_at desc);
create index if not exists idx_chat_table_created on chat(table_id, created_at desc);

-- ===================== RLS =====================
alter table tables         enable row level security;
alter table table_players  enable row level security;
alter table hand           enable row level security;
alter table private_holes  enable row level security;
alter table actions        enable row level security;
alter table chat           enable row level security;

-- Helper to check membership (auth.uid() is UUID; our uid columns are TEXT -> cast)
drop function if exists is_table_member(uuid);
create or replace function is_table_member(t_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from table_players tp
    where tp.table_id = t_id
      and tp.uid = auth.uid()::text
  );
$$;

-- ======= Policies
-- tables: members can read; writes only by service role (bypass RLS)
drop policy if exists "tables_select_members" on tables;
create policy "tables_select_members"
on tables for select
to authenticated
using (is_table_member(id));

drop policy if exists "tables_insert_none" on tables;
create policy "tables_insert_none"
on tables for insert
to authenticated
with check (false);

drop policy if exists "tables_update_none" on tables;
create policy "tables_update_none"
on tables for update
to authenticated
using (false);

-- table_players: members read; a user can update their own row (presence)
drop policy if exists "players_select_members" on table_players;
create policy "players_select_members"
on table_players for select
to authenticated
using (is_table_member(table_id));

drop policy if exists "players_update_self" on table_players;
create policy "players_update_self"
on table_players for update
to authenticated
using (uid = auth.uid()::text);

drop policy if exists "players_insert_none" on table_players;
create policy "players_insert_none"
on table_players for insert
to authenticated
with check (false);

-- hand: members read; all writes via service role only
drop policy if exists "hand_select_members" on hand;
create policy "hand_select_members"
on hand for select
to authenticated
using (is_table_member(table_id));

drop policy if exists "hand_write_none" on hand;
create policy "hand_write_none"
on hand for all
to authenticated
using (false)
with check (false);

-- private_holes: only the seat owner can read; writes via service role only
drop policy if exists "holes_select_owner" on private_holes;
create policy "holes_select_owner"
on private_holes for select
to authenticated
using (
  exists (
    select 1 from table_players tp
    where tp.table_id = private_holes.table_id
      and tp.seat = private_holes.seat
      and tp.uid = auth.uid()::text
  )
);

drop policy if exists "holes_write_none" on private_holes;
create policy "holes_write_none"
on private_holes for all
to authenticated
using (false)
with check (false);

-- actions: members read; writes via service role only
drop policy if exists "actions_select_members" on actions;
create policy "actions_select_members"
on actions for select
to authenticated
using (is_table_member(table_id));

drop policy if exists "actions_write_none" on actions;
create policy "actions_write_none"
on actions for all
to authenticated
using (false)
with check (false);

-- chat: members read; members can insert
drop policy if exists "chat_select_members" on chat;
create policy "chat_select_members"
on chat for select
to authenticated
using (is_table_member(table_id));

drop policy if exists "chat_insert_members" on chat;
create policy "chat_insert_members"
on chat for insert
to authenticated
with check (is_table_member(table_id));

-- Done.
-- Optional manual step after running this in dashboard:
-- Database → Replication → (enable Realtime later if you get access;
-- not needed for our Broadcast+Refetch pattern).

