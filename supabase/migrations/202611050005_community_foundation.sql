-- Meowks Phase 4.1: community feed, discussions, replies, and study groups.
begin;

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  post_type text not null default 'discussion' check (post_type in ('discussion','question','resource','announcement')),
  title text not null check (length(trim(title)) between 1 and 180),
  body text not null check (length(trim(body)) between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_comment_id uuid references public.community_comments(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.study_groups (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  name text not null check (length(trim(name)) between 2 and 100),
  description text not null default '' check (length(description) <= 1000),
  visibility text not null default 'public' check (visibility in ('public','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.study_group_members (
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (group_id,user_id)
);

create index community_posts_created_idx on public.community_posts(created_at desc);
create index community_posts_course_idx on public.community_posts(course_id,created_at desc);
create index community_comments_post_idx on public.community_comments(post_id,created_at);
create index study_groups_created_idx on public.study_groups(created_at desc);
create index study_group_members_user_idx on public.study_group_members(user_id);

create trigger community_posts_updated_at before update on public.community_posts
for each row execute function public.set_updated_at();
create trigger community_comments_updated_at before update on public.community_comments
for each row execute function public.set_updated_at();
create trigger study_groups_updated_at before update on public.study_groups
for each row execute function public.set_updated_at();

alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.study_groups enable row level security;
alter table public.study_group_members enable row level security;

create policy "authenticated users read community posts" on public.community_posts
for select to authenticated using (true);
create policy "users create own community posts" on public.community_posts
for insert to authenticated with check (user_id = (select auth.uid()));
create policy "authors update own community posts" on public.community_posts
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy "authors delete own community posts" on public.community_posts
for delete to authenticated using (user_id = (select auth.uid()));

create policy "authenticated users read comments" on public.community_comments
for select to authenticated using (true);
create policy "users comment as themselves" on public.community_comments
for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.community_posts p where p.id = post_id
  ) and (
    parent_comment_id is null or exists (
      select 1 from public.community_comments parent
      where parent.id = parent_comment_id and parent.post_id = community_comments.post_id
    )
  )
);
create policy "authors update own comments" on public.community_comments
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy "authors delete own comments" on public.community_comments
for delete to authenticated using (user_id = (select auth.uid()));

create policy "users read public or joined groups" on public.study_groups
for select to authenticated using (
  visibility = 'public' or created_by = (select auth.uid()) or exists (
    select 1 from public.study_group_members m
    where m.group_id = study_groups.id and m.user_id = (select auth.uid())
  )
);
create policy "users create own groups" on public.study_groups
for insert to authenticated with check (created_by = (select auth.uid()));
create policy "owners update own groups" on public.study_groups
for update to authenticated using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()));
create policy "owners delete own groups" on public.study_groups
for delete to authenticated using (created_by = (select auth.uid()));

create policy "members read own group memberships" on public.study_group_members
for select to authenticated using (user_id = (select auth.uid()));
create policy "users join public groups" on public.study_group_members
for insert to authenticated with check (
  user_id = (select auth.uid()) and role = 'member' and exists (
    select 1 from public.study_groups g where g.id = group_id and g.visibility = 'public'
  )
);
create policy "members leave groups" on public.study_group_members
for delete to authenticated using (user_id = (select auth.uid()) and role = 'member');

-- Group creators are added as owners by this trigger. Clients cannot self-assign owner role.
create or replace function public.add_study_group_owner()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.study_group_members(group_id,user_id,role)
  values(new.id,new.created_by,'owner');
  return new;
end;
$$;
create trigger study_groups_add_owner after insert on public.study_groups
for each row execute function public.add_study_group_owner();

commit;
