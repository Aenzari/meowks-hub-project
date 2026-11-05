-- Meowks Phase 4.2: engagement, content reporting, and study-group RLS hardening.
begin;

-- Break the cross-table RLS recursion from Phase 4.1. Membership helper
-- checks only the signed-in user's membership, never an arbitrary user.
create or replace function public.is_study_group_member(p_group_id uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select exists (
    select 1 from public.study_group_members
    where group_id = p_group_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_study_group_public(p_group_id uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select exists (
    select 1 from public.study_groups
    where id = p_group_id and visibility = 'public'
  );
$$;

revoke all on function public.is_study_group_member(uuid) from public, anon;
revoke all on function public.is_study_group_public(uuid) from public, anon;
grant execute on function public.is_study_group_member(uuid) to authenticated;
grant execute on function public.is_study_group_public(uuid) to authenticated;

drop policy if exists "users read public or joined groups" on public.study_groups;
drop function if exists public.is_study_group_member(uuid, uuid);
create policy "users read public or joined groups" on public.study_groups
for select to authenticated using (
  visibility = 'public' or created_by = (select auth.uid())
  or public.is_study_group_member(id)
);

drop policy if exists "users join public groups" on public.study_group_members;
create policy "users join public groups" on public.study_group_members
for insert to authenticated with check (
  user_id = (select auth.uid()) and role = 'member'
  and public.is_study_group_public(group_id)
);

create table public.community_post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('like','love','helpful')),
  created_at timestamptz not null default now(),
  unique(post_id,user_id)
);
create index community_post_reactions_post_idx
  on public.community_post_reactions(post_id);

alter table public.community_post_reactions enable row level security;
create policy "authenticated users read post reactions"
on public.community_post_reactions for select to authenticated using (true);
create policy "users add own post reaction"
on public.community_post_reactions for insert to authenticated
with check (user_id = (select auth.uid()) and exists (
  select 1 from public.community_posts p where p.id = post_id
));
create policy "users change own post reaction"
on public.community_post_reactions for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy "users remove own post reaction"
on public.community_post_reactions for delete to authenticated
using (user_id = (select auth.uid()));

create table public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.community_posts(id) on delete cascade,
  comment_id uuid references public.community_comments(id) on delete cascade,
  reason text not null check (reason in ('spam','harassment','misinformation','copyright','inappropriate','other')),
  details text not null default '' check (length(details) <= 1000),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  check ((post_id is not null)::int + (comment_id is not null)::int = 1)
);
create index community_reports_status_created_idx
  on public.community_reports(status,created_at desc);

alter table public.community_reports enable row level security;
create policy "users submit reports as themselves"
on public.community_reports for insert to authenticated
with check (
  reporter_id = (select auth.uid())
  and status = 'open'
  and (
    (post_id is not null and exists(select 1 from public.community_posts p where p.id = post_id))
    or
    (comment_id is not null and exists(select 1 from public.community_comments c where c.id = comment_id))
  )
);
create policy "users read own submitted reports"
on public.community_reports for select to authenticated
using (reporter_id = (select auth.uid()));

commit;
