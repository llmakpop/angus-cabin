-- 0001_initial_schema.sql
-- Initial schema for the Angus Cabin app.
-- Creates: households, users (linked to auth.users), sleep_spots, stays,
-- stay_attendees, sleep_assignments, plus a trigger that auto-creates a
-- public.users row whenever someone signs up via Supabase Auth.

-- =========================================
-- ENUMs
-- =========================================

create type user_role as enum ('admin', 'member');

create type stay_type as enum (
  'solo',
  'solo_with_guests',
  'multi_family',
  'day_trip'
);

-- =========================================
-- Tables
-- =========================================

-- A household = a family unit (e.g. "Todd & Colleen", "Lauren & Mike").
-- Used to group attendees on multi-family stays.
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- One row per family member with an account.
-- The id matches auth.users.id (1:1 with Supabase Auth).
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role user_role not null default 'member',
  household_id uuid references households(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Sleeping spots at the cabin. Seeded; not user-editable in MVP.
-- 'flags' carries notes like 'mold', 'seasonal', 'outdoor'.
create table sleep_spots (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  capacity int not null check (capacity > 0),
  flags text[] not null default '{}',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- A stay is a date range (or single day for day trips) booked by one user.
create table stays (
  id uuid primary key default gen_random_uuid(),
  created_by_user_id uuid not null references users(id) on delete cascade,
  stay_type stay_type not null,
  start_date date not null,
  end_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (stay_type <> 'day_trip' or start_date = end_date)
);

-- Attendees on a stay. Either a registered user OR a free-text guest.
create table stay_attendees (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references stays(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  guest_name text,
  is_pet boolean not null default false,
  is_child boolean not null default false,
  bringing_note text,
  created_at timestamptz not null default now(),
  check (user_id is not null or guest_name is not null)
);

-- Per-night sleeping assignments. Lets people shift beds across a multi-night stay.
create table sleep_assignments (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references stays(id) on delete cascade,
  attendee_id uuid not null references stay_attendees(id) on delete cascade,
  sleep_spot_id uuid not null references sleep_spots(id) on delete restrict,
  night_date date not null,
  created_at timestamptz not null default now(),
  unique (attendee_id, night_date)
);

-- =========================================
-- Trigger: create public.users row on signup
-- =========================================

-- When Supabase Auth creates a new auth.users row (via magic link signup),
-- this trigger mirrors it into our public.users table.
create or replace function handle_new_auth_user()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  insert into users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- =========================================
-- Indexes (for the calendar query: "what stays overlap this date range?")
-- =========================================

create index stays_start_date_idx on stays (start_date);
create index stays_end_date_idx on stays (end_date);
create index stays_created_by_idx on stays (created_by_user_id);
create index stay_attendees_stay_idx on stay_attendees (stay_id);
create index stay_attendees_user_idx on stay_attendees (user_id);
create index sleep_assignments_stay_idx on sleep_assignments (stay_id);
create index sleep_assignments_night_idx on sleep_assignments (night_date);
