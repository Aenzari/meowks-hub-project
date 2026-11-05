-- Meowks Phase 3.1: private notes, flashcard decks/cards, and study sessions.
begin;

create table public.study_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  title text not null check (length(trim(title)) > 0),
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.flashcard_decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  title text not null check (length(trim(title)) > 0),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.flashcard_decks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  front text not null check (length(trim(front)) > 0),
  back text not null check (length(trim(back)) > 0),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_seconds integer not null check (duration_seconds > 0 and duration_seconds <= 86400),
  created_at timestamptz not null default now(),
  constraint study_sessions_valid_range check (ended_at > started_at)
);

create index study_notes_user_updated_idx on public.study_notes(user_id, updated_at desc);
create index flashcard_decks_user_idx on public.flashcard_decks(user_id, created_at desc);
create index flashcards_deck_position_idx on public.flashcards(deck_id, position);
create index study_sessions_user_started_idx on public.study_sessions(user_id, started_at desc);

create trigger study_notes_set_updated_at before update on public.study_notes
for each row execute function public.set_updated_at();
create trigger flashcard_decks_set_updated_at before update on public.flashcard_decks
for each row execute function public.set_updated_at();

alter table public.study_notes enable row level security;
alter table public.flashcard_decks enable row level security;
alter table public.flashcards enable row level security;
alter table public.study_sessions enable row level security;

create policy "users manage own notes" on public.study_notes for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "users manage own flashcard decks" on public.flashcard_decks for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "users manage own flashcards" on public.flashcards for all to authenticated
using (
  user_id = (select auth.uid()) and exists (
    select 1 from public.flashcard_decks d
    where d.id = flashcards.deck_id and d.user_id = (select auth.uid())
  )
)
with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.flashcard_decks d
    where d.id = flashcards.deck_id and d.user_id = (select auth.uid())
  )
);

create policy "users manage own study sessions" on public.study_sessions for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

commit;
