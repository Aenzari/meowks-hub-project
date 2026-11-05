-- Meowks Phase 4.5: private in-app community notifications.
begin;

create table public.community_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  notification_type text not null check (notification_type in ('post_reaction','post_comment','comment_reply','group_member')),
  post_id uuid references public.community_posts(id) on delete cascade,
  comment_id uuid references public.community_comments(id) on delete cascade,
  group_id uuid references public.study_groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (
    (notification_type in ('post_reaction','post_comment') and post_id is not null)
    or (notification_type = 'comment_reply' and comment_id is not null)
    or (notification_type = 'group_member' and group_id is not null)
  )
);

create index community_notifications_recipient_created_idx
  on public.community_notifications(recipient_id, created_at desc);
create index community_notifications_unread_idx
  on public.community_notifications(recipient_id, created_at desc)
  where read_at is null;
-- Enable Supabase Realtime delivery when the standard publication exists.
do $
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'community_notifications'
     ) then
    alter publication supabase_realtime add table public.community_notifications;
  end if;
end;
$$;

alter table public.community_notifications enable row level security;
create policy "users read own notifications"
  on public.community_notifications for select to authenticated
  using (recipient_id = (select auth.uid()));
create policy "users mark own notifications read"
  on public.community_notifications for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

-- Clients can only update read_at; notification creation is trigger-only.
revoke all on public.community_notifications from anon, authenticated;
grant select on public.community_notifications to authenticated;
grant update (read_at) on public.community_notifications to authenticated;

create or replace function public.notify_community_reaction()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
declare post_owner uuid;
begin
  select user_id into post_owner from public.community_posts where id = new.post_id;
  if post_owner is not null and post_owner <> new.user_id then
    insert into public.community_notifications(recipient_id, actor_id, notification_type, post_id)
    values (post_owner, new.user_id, 'post_reaction', new.post_id);
  end if;
  return new;
end;
$$;

create or replace function public.notify_community_comment()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
declare post_owner uuid;
declare parent_owner uuid;
begin
  select user_id into post_owner from public.community_posts where id = new.post_id;
  if new.parent_comment_id is not null then
    select user_id into parent_owner from public.community_comments where id = new.parent_comment_id;
  end if;

  if post_owner is not null and post_owner <> new.user_id then
    insert into public.community_notifications(recipient_id, actor_id, notification_type, post_id, comment_id)
    values (post_owner, new.user_id, 'post_comment', new.post_id, new.id);
  end if;

  if parent_owner is not null and parent_owner <> new.user_id and parent_owner is distinct from post_owner then
    insert into public.community_notifications(recipient_id, actor_id, notification_type, post_id, comment_id)
    values (parent_owner, new.user_id, 'comment_reply', new.post_id, new.id);
  end if;
  return new;
end;
$$;

create or replace function public.notify_study_group_member()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
declare group_owner uuid;
begin
  if new.role <> 'member' then return new; end if;
  select created_by into group_owner from public.study_groups where id = new.group_id;
  if group_owner is not null and group_owner <> new.user_id then
    insert into public.community_notifications(recipient_id, actor_id, notification_type, group_id)
    values (group_owner, new.user_id, 'group_member', new.group_id);
  end if;
  return new;
end;
$$;

revoke all on function public.notify_community_reaction() from public, anon, authenticated;
revoke all on function public.notify_community_comment() from public, anon, authenticated;
revoke all on function public.notify_study_group_member() from public, anon, authenticated;

create trigger community_reaction_notification
  after insert on public.community_post_reactions
  for each row execute function public.notify_community_reaction();
create trigger community_comment_notification
  after insert on public.community_comments
  for each row execute function public.notify_community_comment();
create trigger study_group_member_notification
  after insert on public.study_group_members
  for each row execute function public.notify_study_group_member();

commit;
