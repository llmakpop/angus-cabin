-- 0002_seed_data.sql
-- Seed data: cabin sleeping spots and Angus-family households.
-- Idempotent: uses ON CONFLICT so it's safe to re-run.

-- =========================================
-- Sleep spots (the cabin's bed inventory)
-- =========================================

insert into sleep_spots (label, capacity, flags, sort_order) values
  ('Bedroom (double bed)',                     2, '{}',                   10),
  ('Loft – left (double bed + 2 twin bunks)',  4, '{}',                   20),
  ('Loft – right (double bed + 2 twin bunks)', 4, '{}',                   30),
  ('Living room pull-out couch',               2, '{}',                   40),
  ('Living room couch',                        1, '{}',                   50),
  ('Camper trailer (Todd & Colleen''s)',       4, '{seasonal}',           60),
  ('Bunkhouse pull-out couch',                 2, '{mold}',               70),
  ('Bunkhouse double+twin bunk',               3, '{mold}',               80),
  ('Tent in backyard',                         4, '{outdoor,seasonal}',   90)
on conflict do nothing;

-- =========================================
-- Households (Angus family units)
-- One row per couple/individual that travels as a unit.
-- =========================================

insert into households (name) values
  ('Chuck'),
  ('Rob & Sheila'),
  ('Trevor'),
  ('Tricia'),
  ('Kim & Jeff'),
  ('Bri & Jorge'),
  ('Ryan'),
  ('Todd & Colleen'),
  ('Amanda & David'),
  ('Charlie & Bre'),
  ('Jon & Kristi'),
  ('Lauren & John'),
  ('Jack & Autumn')
on conflict (name) do nothing;
