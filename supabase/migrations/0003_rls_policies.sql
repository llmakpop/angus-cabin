-- 0003_rls_policies.sql
-- Row Level Security: lock down every table by default, then grant
-- the minimum each table needs.
--
-- Access model for the cabin app:
--   - All authenticated family members can READ everything (transparency is good)
--   - Anyone can INSERT a stay (book themselves); only the creator or admin
--     can UPDATE/DELETE their stays + attendees + sleep assignments
--   - households and sleep_spots are admin-managed
--   - users can update their own profile only
--
-- Anonymous (not-logged-in) visitors get nothing.

-- =========================================
-- Helper: is the current user an admin?
-- SECURITY DEFINER lets this bypass RLS so it can read the users table
-- without recursion when called from policies on users itself.
-- =========================================

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from users where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function is_admin() to authenticated, anon;

-- =========================================
-- Enable RLS on every table
-- =========================================

alter table households        enable row level security;
alter table users             enable row level security;
alter table sleep_spots       enable row level security;
alter table stays             enable row level security;
alter table stay_attendees    enable row level security;
alter table sleep_assignments enable row level security;

-- =========================================
-- households: read all (auth); write admin only
-- =========================================

create policy households_read_authenticated
  on households for select
  to authenticated
  using (true);

create policy households_write_admin
  on households for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- =========================================
-- users: read all (auth); update own row or admin; no direct insert/delete
-- (rows are created by the on_auth_user_created trigger, which is SECURITY
-- DEFINER and bypasses RLS)
-- =========================================

create policy users_read_authenticated
  on users for select
  to authenticated
  using (true);

create policy users_update_own_or_admin
  on users for update
  to authenticated
  using (id = (select auth.uid()) or is_admin())
  with check (id = (select auth.uid()) or is_admin());

create policy users_delete_admin
  on users for delete
  to authenticated
  using (is_admin());

-- =========================================
-- sleep_spots: read all (auth); write admin only
-- =========================================

create policy sleep_spots_read_authenticated
  on sleep_spots for select
  to authenticated
  using (true);

create policy sleep_spots_write_admin
  on sleep_spots for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- =========================================
-- stays: read all (auth); anyone can insert as themselves; update/delete
-- limited to creator or admin
-- =========================================

create policy stays_read_authenticated
  on stays for select
  to authenticated
  using (true);

create policy stays_insert_self
  on stays for insert
  to authenticated
  with check (created_by_user_id = (select auth.uid()));

create policy stays_update_own_or_admin
  on stays for update
  to authenticated
  using (created_by_user_id = (select auth.uid()) or is_admin())
  with check (created_by_user_id = (select auth.uid()) or is_admin());

create policy stays_delete_own_or_admin
  on stays for delete
  to authenticated
  using (created_by_user_id = (select auth.uid()) or is_admin());

-- =========================================
-- stay_attendees: read all (auth); write only allowed if the parent stay
-- belongs to the current user (or admin)
-- =========================================

create policy stay_attendees_read_authenticated
  on stay_attendees for select
  to authenticated
  using (true);

create policy stay_attendees_write_owner_or_admin
  on stay_attendees for all
  to authenticated
  using (
    is_admin() or exists (
      select 1 from stays
      where stays.id = stay_attendees.stay_id
        and stays.created_by_user_id = (select auth.uid())
    )
  )
  with check (
    is_admin() or exists (
      select 1 from stays
      where stays.id = stay_attendees.stay_id
        and stays.created_by_user_id = (select auth.uid())
    )
  );

-- =========================================
-- sleep_assignments: same access pattern as stay_attendees
-- =========================================

create policy sleep_assignments_read_authenticated
  on sleep_assignments for select
  to authenticated
  using (true);

create policy sleep_assignments_write_owner_or_admin
  on sleep_assignments for all
  to authenticated
  using (
    is_admin() or exists (
      select 1 from stays
      where stays.id = sleep_assignments.stay_id
        and stays.created_by_user_id = (select auth.uid())
    )
  )
  with check (
    is_admin() or exists (
      select 1 from stays
      where stays.id = sleep_assignments.stay_id
        and stays.created_by_user_id = (select auth.uid())
    )
  );
