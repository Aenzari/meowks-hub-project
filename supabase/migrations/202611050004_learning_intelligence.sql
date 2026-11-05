-- Meowks Phase 3.2: private quizzes, attempts, spaced repetition, and review history.
begin;

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null check (length(trim(prompt)) > 0),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  correct_option integer not null check (correct_option >= 0 and correct_option <= 5),
  explanation text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null check (score >= 0),
  total_questions integer not null check (total_questions > 0),
  answers jsonb not null default '[]'::jsonb,
  completed_at timestamptz not null default now(),
  constraint quiz_attempt_score_valid check (score <= total_questions)
);

create table public.card_review_state (
  card_id uuid primary key references public.flashcards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  due_at timestamptz not null default now(),
  interval_days integer not null default 0 check (interval_days >= 0),
  ease_factor numeric(4,2) not null default 2.50 check (ease_factor between 1.30 and 3.00),
  repetitions integer not null default 0 check (repetitions >= 0),
  last_reviewed_at timestamptz
);

create table public.card_review_events (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.flashcards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 0 and 3),
  reviewed_at timestamptz not null default now()
);

create index quizzes_user_created_idx on public.quizzes(user_id, created_at desc);
create index quiz_questions_quiz_position_idx on public.quiz_questions(quiz_id, position);
create index quiz_attempts_user_completed_idx on public.quiz_attempts(user_id, completed_at desc);
create index card_review_state_due_idx on public.card_review_state(user_id, due_at);
create index card_review_events_user_reviewed_idx on public.card_review_events(user_id, reviewed_at desc);

create trigger quizzes_set_updated_at before update on public.quizzes
for each row execute function public.set_updated_at();

alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.card_review_state enable row level security;
alter table public.card_review_events enable row level security;

create policy "users manage own quizzes" on public.quizzes for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "users manage own quiz questions" on public.quiz_questions for all to authenticated
using (user_id = (select auth.uid()) and exists (
  select 1 from public.quizzes q where q.id = quiz_questions.quiz_id and q.user_id = (select auth.uid())
))
with check (user_id = (select auth.uid()) and exists (
  select 1 from public.quizzes q where q.id = quiz_questions.quiz_id and q.user_id = (select auth.uid())
));

create policy "users read own quiz attempts" on public.quiz_attempts for select to authenticated
using (user_id = (select auth.uid()));

create policy "users read own card review state" on public.card_review_state for select to authenticated
using (user_id = (select auth.uid()));

create policy "users read own card review events" on public.card_review_events for select to authenticated
using (user_id = (select auth.uid()));

-- Attempts are scored in the database so the browser never needs access to answer keys.
create or replace function public.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb)
returns table(attempt_id uuid, score integer, total_questions integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_total integer;
  v_score integer;
  v_attempt uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_answers) <> 'array' then raise exception 'Answers must be an array'; end if;
  if not exists (select 1 from public.quizzes q where q.id = p_quiz_id and q.user_id = v_user) then
    raise exception 'Quiz not found';
  end if;

  select count(*) into v_total from public.quiz_questions qq
  where qq.quiz_id = p_quiz_id and qq.user_id = v_user;
  if v_total = 0 then raise exception 'This quiz has no questions'; end if;

  select count(*) into v_score
  from public.quiz_questions qq
  join lateral (
    select (item->>'selected_option')::integer as selected_option
    from jsonb_array_elements(p_answers) item
    where item->>'question_id' = qq.id::text
    limit 1
  ) submitted on true
  where qq.quiz_id = p_quiz_id and qq.user_id = v_user
    and submitted.selected_option = qq.correct_option;

  insert into public.quiz_attempts(quiz_id,user_id,score,total_questions,answers)
  values (p_quiz_id,v_user,v_score,v_total,p_answers)
  returning id into v_attempt;

  return query select v_attempt,v_score,v_total;
end;
$$;
revoke all on function public.submit_quiz_attempt(uuid,jsonb) from public;
grant execute on function public.submit_quiz_attempt(uuid,jsonb) to authenticated;

-- Rating: 0=again, 1=hard, 2=good, 3=easy.
create or replace function public.review_flashcard(p_card_id uuid, p_rating integer)
returns table(next_due_at timestamptz, next_interval_days integer, next_repetitions integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_state public.card_review_state%rowtype;
  v_interval integer;
  v_repetitions integer;
  v_ease numeric(4,2);
  v_due timestamptz;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_rating < 0 or p_rating > 3 then raise exception 'Rating must be between 0 and 3'; end if;
  if not exists (
    select 1 from public.flashcards f
    join public.flashcard_decks d on d.id = f.deck_id
    where f.id = p_card_id and f.user_id = v_user and d.user_id = v_user
  ) then raise exception 'Flashcard not found'; end if;

  select * into v_state from public.card_review_state s
  where s.card_id = p_card_id and s.user_id = v_user;

  v_repetitions := coalesce(v_state.repetitions,0);
  v_ease := coalesce(v_state.ease_factor,2.50);

  if p_rating = 0 then
    v_repetitions := 0;
    v_interval := 1;
  else
    v_repetitions := v_repetitions + 1;
    v_interval := case
      when v_repetitions = 1 then 1
      when v_repetitions = 2 then 3
      else greatest(1,round(coalesce(v_state.interval_days,3) * v_ease * case when p_rating = 1 then 0.75 when p_rating = 3 then 1.25 else 1 end)::integer)
    end;
    v_ease := greatest(1.30,least(3.00,v_ease + case p_rating when 1 then -0.15 when 3 then 0.15 else 0 end));
  end if;

  v_due := now() + make_interval(days => v_interval);
  insert into public.card_review_state(card_id,user_id,due_at,interval_days,ease_factor,repetitions,last_reviewed_at)
  values(p_card_id,v_user,v_due,v_interval,v_ease,v_repetitions,now())
  on conflict(card_id) do update set due_at=excluded.due_at,interval_days=excluded.interval_days,
    ease_factor=excluded.ease_factor,repetitions=excluded.repetitions,last_reviewed_at=excluded.last_reviewed_at;

  insert into public.card_review_events(card_id,user_id,rating) values(p_card_id,v_user,p_rating);
  return query select v_due,v_interval,v_repetitions;
end;
$$;
revoke all on function public.review_flashcard(uuid,integer) from public;
grant execute on function public.review_flashcard(uuid,integer) to authenticated;

commit;
