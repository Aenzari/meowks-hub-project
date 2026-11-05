-- Meowks Phase 4.3: moderator roles and community report review.
-- Apply after 202611050006_community_engagement.sql.
begin;

create table public.meowks_moderator_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'moderator' check (role in ('moderator','admin')),
  created_at timestamptz not null default now()
);

alter table public.meowks_moderator_roles enable row level security;

create policy "moderators can read their own role"
on public.meowks_moderator_roles
for select to authenticated
using (user_id = (select auth.uid()));

-- No client insert/update/delete policies: role assignment is an owner-controlled
-- operation performed in the Supabase SQL Editor, never by browser code.
create or replace function public.is_meowks_moderator()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select exists (
    select 1 from public.meowks_moderator_roles
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_meowks_moderator() from public, anon;
grant execute on function public.is_meowks_moderator() to authenticated;

drop policy if exists "moderators read community reports" on public.community_reports;
create policy "moderators read community reports"
on public.community_reports
for select to authenticated
using (public.is_meowks_moderator());

drop policy if exists "moderators update report status" on public.community_reports;
create policy "moderators update report status"
on public.community_reports
for update to authenticated
using (public.is_meowks_moderator())
with check (public.is_meowks_moderator());

-- Moderators may update only status; report evidence and ownership remain immutable.
revoke update on public.community_reports from authenticated;
grant update (status) on public.community_reports to authenticated;

commit;

-- To grant moderator access, replace the UUID below with the intended user's
-- auth.users.id and run this separately as the project owner:
-- insert into public.meowks_moderator_roles (user_id, role)
-- values ('00000000-0000-0000-0000-000000000000', 'admin')
-- on conflict (user_id) do update set role = excluded.role;
