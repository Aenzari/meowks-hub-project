-- Meowks Phase 4.4: student profiles and community directory.
-- Apply after the existing Phase 4.3 moderation migration.
begin;

alter table public.profiles
  add column if not exists bio text not null default '',
  add column if not exists major text not null default '',
  add column if not exists year_of_study text not null default '',
  add column if not exists interests text[] not null default '{}',
  add column if not exists profile_visibility text not null default 'community';

alter table public.profiles
  drop constraint if exists profiles_bio_length_check,
  add constraint profiles_bio_length_check check (char_length(bio) <= 280),
  drop constraint if exists profiles_major_length_check,
  add constraint profiles_major_length_check check (char_length(major) <= 100),
  drop constraint if exists profiles_year_of_study_check,
  add constraint profiles_year_of_study_check check (char_length(year_of_study) <= 40),
  drop constraint if exists profiles_interests_count_check,
  add constraint profiles_interests_count_check check (cardinality(interests) <= 10),
  drop constraint if exists profiles_visibility_check,
  add constraint profiles_visibility_check check (profile_visibility in ('private','community'));

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own or community-visible profiles"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or profile_visibility = 'community');

-- The existing owner-only update policy and security-field trigger remain in place.
-- No browser-facing policy allows changing university affiliation or verification.
create index if not exists profiles_visibility_updated_idx
on public.profiles(profile_visibility, updated_at desc);

commit;
