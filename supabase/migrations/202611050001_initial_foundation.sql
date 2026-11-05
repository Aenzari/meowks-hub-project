-- Meowks initial multi-university foundation.
-- Apply only to a fresh Supabase project. Test University is fictional seed data.

begin;
create extension if not exists pgcrypto;

create table public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint universities_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  university_id uuid references public.universities(id) on delete set null,
  student_status text not null default 'independent'
    check (student_status in ('independent','unverified','verified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references public.universities(id) on delete cascade,
  code text,
  title text not null,
  description text,
  created_by uuid not null references auth.users(id) on delete restrict,
  visibility text not null default 'private'
    check (visibility in ('private','university','public')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_code_nonempty check (code is null or length(trim(code)) > 0)
);

create table public.course_memberships (
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'student'
    check (role in ('student','teaching_assistant','instructor')),
  joined_at timestamptz not null default now(),
  primary key (course_id,user_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  title text not null,
  details text,
  task_type text not null default 'task'
    check (task_type in ('task','assignment','exam','reading','event')),
  status text not null default 'todo'
    check (status in ('todo','in_progress','completed','archived')),
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_nonempty check (length(trim(title)) > 0)
);

create table public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp bigint not null default 0 check (xp >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  level integer not null default 1 check (level >= 1),
  updated_at timestamptz not null default now()
);

create index courses_university_idx on public.courses(university_id);
create index courses_created_by_idx on public.courses(created_by);
create index memberships_user_idx on public.course_memberships(user_id);
create index tasks_user_due_idx on public.tasks(user_id,due_at);
create index tasks_course_idx on public.tasks(course_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end; $$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger courses_set_updated_at before update on public.courses
for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks
for each row execute function public.set_updated_at();

-- Prevent browser users from self-assigning a university or self-verifying.
-- Those changes must be performed by a trusted server/admin workflow.
create or replace function public.guard_profile_security_fields()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if auth.uid() = old.id and (
    new.university_id is distinct from old.university_id or
    new.student_status is distinct from old.student_status
  ) then
    raise exception 'University affiliation and verification require an authorized workflow';
  end if;
  return new;
end;
$$;
create trigger profiles_guard_security_fields before update on public.profiles
for each row execute function public.guard_profile_security_fields();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id,display_name)
  values (new.id,nullif(trim(new.raw_user_meta_data ->> 'display_name'),''))
  on conflict (id) do nothing;
  insert into public.user_stats (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.universities enable row level security;
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_memberships enable row level security;
alter table public.tasks enable row level security;
alter table public.user_stats enable row level security;

create policy "signed-in users read active universities"
on public.universities for select to authenticated using (is_active = true);

create policy "users read own profile"
on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "users insert own profile"
on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "users update own profile"
on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "users read visible active courses"
on public.courses for select to authenticated
using (
  is_active = true and (
    visibility = 'public'
    or (visibility = 'university' and university_id = (
      select p.university_id from public.profiles p where p.id = (select auth.uid())
    ))
    or created_by = (select auth.uid())
    or exists (
      select 1 from public.course_memberships cm
      where cm.course_id = courses.id and cm.user_id = (select auth.uid())
    )
  )
);

create policy "users create own courses"
on public.courses for insert to authenticated
with check (
  created_by = (select auth.uid()) and (
    university_id is null or university_id = (
      select p.university_id from public.profiles p where p.id = (select auth.uid())
    )
  )
);
create policy "creators update own courses"
on public.courses for update to authenticated
using (created_by = (select auth.uid()))
with check (
  created_by = (select auth.uid()) and (
    university_id is null or university_id = (
      select p.university_id from public.profiles p where p.id = (select auth.uid())
    )
  )
);

create policy "users read own memberships"
on public.course_memberships for select to authenticated
using (user_id = (select auth.uid()));

create policy "users manage own tasks"
on public.tasks for all to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid()) and (
    course_id is null or exists (
      select 1 from public.courses c
      where c.id = tasks.course_id and (
        c.created_by = (select auth.uid()) or exists (
          select 1 from public.course_memberships cm
          where cm.course_id = c.id and cm.user_id = (select auth.uid())
        )
      )
    )
  )
);

create policy "users read own stats"
on public.user_stats for select to authenticated
using (user_id = (select auth.uid()));

-- No browser write policies for XP/stats or course membership enrollment.
commit;
