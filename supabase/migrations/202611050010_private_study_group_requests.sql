-- Private study-group join requests with owner-reviewed membership.
begin;

create table public.study_group_join_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  constraint study_group_join_requests_review_state_check check (
    (status = 'pending' and reviewed_at is null and reviewed_by is null)
    or (status in ('approved', 'rejected') and reviewed_at is not null and reviewed_by is not null)
  )
);

create unique index study_group_join_requests_one_pending_idx
  on public.study_group_join_requests(group_id, requester_id)
  where status = 'pending';
create index study_group_join_requests_group_status_created_idx
  on public.study_group_join_requests(group_id, status, created_at desc);
create index study_group_join_requests_requester_created_idx
  on public.study_group_join_requests(requester_id, created_at desc);

alter table public.study_group_join_requests enable row level security;

-- Private group metadata is discoverable to authenticated students so they can
-- request access. Membership and group activity remain separately protected.
drop policy if exists "users read public or joined groups" on public.study_groups;
create policy "users read discoverable group details" on public.study_groups
for select to authenticated using (true);

create policy "requesters read own join requests"
on public.study_group_join_requests for select to authenticated
using (requester_id = (select auth.uid()));

create policy "group owners read join requests"
on public.study_group_join_requests for select to authenticated
using (exists (
  select 1 from public.study_groups g
  where g.id = study_group_join_requests.group_id and g.created_by = (select auth.uid())
));

create policy "users request private group membership"
on public.study_group_join_requests for insert to authenticated
with check (
  requester_id = (select auth.uid())
  and status = 'pending'
  and reviewed_at is null
  and reviewed_by is null
  and exists (
    select 1 from public.study_groups g
    where g.id = study_group_join_requests.group_id
      and g.visibility = 'private'
      and g.created_by <> (select auth.uid())
  )
  and not exists (
    select 1 from public.study_group_members m
    where m.group_id = study_group_join_requests.group_id and m.user_id = (select auth.uid())
  )
);

revoke all on public.study_group_join_requests from anon, authenticated;
grant select, insert on public.study_group_join_requests to authenticated;

-- Review is transactional: approval creates membership and closes the request
-- in the same database transaction. Only the group creator may decide.
create or replace function public.review_study_group_join_request(
  p_request_id uuid,
  p_decision text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
set row_security = off
as $$
declare
  v_request public.study_group_join_requests%rowtype;
  v_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;

  select r.* into v_request
  from public.study_group_join_requests r
  where r.id = p_request_id
  for update;

  if not found then
    raise exception 'Join request not found';
  end if;

  select g.created_by into v_owner
  from public.study_groups g
  where g.id = v_request.group_id;

  if v_owner is distinct from auth.uid() then
    raise exception 'Only the group creator can review requests';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'This join request has already been reviewed';
  end if;

  if p_decision = 'approved' then
    insert into public.study_group_members(group_id, user_id, role)
    values (v_request.group_id, v_request.requester_id, 'member')
    on conflict (group_id, user_id) do nothing;
  end if;

  update public.study_group_join_requests
  set status = p_decision,
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where id = v_request.id;
end;
$$;

revoke all on function public.review_study_group_join_request(uuid, text) from public, anon;
grant execute on function public.review_study_group_join_request(uuid, text) to authenticated;

commit;
