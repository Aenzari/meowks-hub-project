-- Meowks Phase 5: server-awarded Paw Points, levels, streaks, achievements, and opt-in leaderboard.
begin;

alter table public.profiles
  add column if not exists leaderboard_opt_in boolean not null default false;

alter table public.user_stats
  add column if not exists last_activity_date date;

create table public.gamification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  xp_awarded integer not null check (xp_awarded > 0 and xp_awarded <= 100),
  created_at timestamptz not null default now(),
  unique (user_id, source_type, source_id)
);
create index gamification_events_user_created_idx
  on public.gamification_events(user_id, created_at desc);
alter table public.gamification_events enable row level security;
create policy "users read own gamification events"
  on public.gamification_events for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.gamification_events from anon, authenticated;
grant select on public.gamification_events to authenticated;

create table public.meowks_achievements (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null,
  created_at timestamptz not null default now()
);
create table public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null references public.meowks_achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);
alter table public.meowks_achievements enable row level security;
alter table public.user_achievements enable row level security;
create policy "authenticated users read achievement catalog"
  on public.meowks_achievements for select to authenticated using (true);
create policy "users read own achievements"
  on public.user_achievements for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.meowks_achievements from anon, authenticated;
revoke all on public.user_achievements from anon, authenticated;
grant select on public.meowks_achievements, public.user_achievements to authenticated;

insert into public.meowks_achievements(id,name,description,icon) values
 ('first_steps','First Steps','Complete your first study session.','🐾'),
 ('focus_hour','Focus Hour','Accumulate 60 minutes of focused study.','⏱️'),
 ('quiz_starter','Quiz Starter','Complete your first practice quiz.','🧠'),
 ('quiz_ace','Practice Makes Progress','Complete 10 practice quizzes.','🏅'),
 ('card_collector','Memory Builder','Review 25 flashcards.','🗂️'),
 ('week_streak','Seven-Day Spark','Study on 7 consecutive days.','🔥'),
 ('xp_500','Paw Point Pioneer','Earn 500 Paw Points.','✨')
on conflict (id) do update set name=excluded.name,description=excluded.description,icon=excluded.icon;

create or replace function public.evaluate_meowks_achievements(p_user_id uuid)
returns void language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_minutes bigint; v_quizzes bigint; v_cards bigint; v_xp bigint; v_streak integer; v_sessions bigint;
begin
  select coalesce(sum(duration_seconds),0)/60, count(*) into v_minutes,v_sessions
    from public.study_sessions where user_id=p_user_id;
  select count(*) into v_quizzes from public.quiz_attempts where user_id=p_user_id;
  select count(*) into v_cards from public.card_review_events where user_id=p_user_id;
  select xp,current_streak into v_xp,v_streak from public.user_stats where user_id=p_user_id;
  insert into public.user_achievements(user_id,achievement_id)
  select p_user_id, a.id from public.meowks_achievements a
  where (a.id='first_steps' and v_sessions >= 1)
     or (a.id='focus_hour' and v_minutes >= 60)
     or (a.id='quiz_starter' and v_quizzes >= 1)
     or (a.id='quiz_ace' and v_quizzes >= 10)
     or (a.id='card_collector' and v_cards >= 25)
     or (a.id='week_streak' and v_streak >= 7)
     or (a.id='xp_500' and v_xp >= 500)
  on conflict do nothing;
end;
$$;
revoke all on function public.evaluate_meowks_achievements(uuid) from public, anon, authenticated;

create or replace function public.award_meowks_xp(
  p_user_id uuid, p_source_type text, p_source_id uuid, p_points integer
) returns void language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_today date := (now() at time zone 'UTC')::date; v_last date;
begin
  if p_user_id is null or p_source_id is null or p_points < 1 or p_points > 100 then return; end if;
  if p_source_type in ('community_post','community_comment') and (
    select count(*) from public.gamification_events
    where user_id=p_user_id and source_type=p_source_type
      and created_at >= date_trunc('day',now())
  ) >= 3 then return; end if;
  insert into public.gamification_events(user_id,source_type,source_id,xp_awarded)
  values(p_user_id,p_source_type,p_source_id,p_points)
  on conflict(user_id,source_type,source_id) do nothing;
  if not found then return; end if;

  select last_activity_date into v_last from public.user_stats where user_id=p_user_id for update;
  update public.user_stats
  set xp=xp+p_points,
      level=((xp+p_points)/250)+1,
      current_streak=case
        when v_last is null or v_last < v_today-1 then 1
        when v_last = v_today then current_streak
        when v_last = v_today-1 then current_streak+1
        else current_streak end,
      longest_streak=greatest(longest_streak,
        case when v_last is null or v_last < v_today-1 then 1
             when v_last = v_today then current_streak
             else current_streak+1 end),
      last_activity_date=greatest(coalesce(v_last,v_today),v_today),
      updated_at=now()
  where user_id=p_user_id;

  perform public.evaluate_meowks_achievements(p_user_id);
end;
$$;
revoke all on function public.award_meowks_xp(uuid,text,uuid,integer) from public, anon, authenticated;

create or replace function public.award_study_session_xp()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $$
begin
  if new.duration_seconds >= 600 then
    perform public.award_meowks_xp(new.user_id,'study_session',new.id,
      least(50,greatest(5,(new.duration_seconds/600)*5)));
  end if;
  return new;
end;
$$;
create trigger study_session_award_xp after insert on public.study_sessions
for each row execute function public.award_study_session_xp();

create or replace function public.award_quiz_attempt_xp()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $$
begin
  perform public.award_meowks_xp(new.user_id,'quiz_attempt',new.id,
    least(25,5+floor((new.score::numeric/greatest(new.total_questions,1))*20)::integer));
  return new;
end;
$$;
create trigger quiz_attempt_award_xp after insert on public.quiz_attempts
for each row execute function public.award_quiz_attempt_xp();

create or replace function public.award_flashcard_review_xp()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $$
begin
  perform public.award_meowks_xp(new.user_id,'flashcard_review',new.id,1);
  return new;
end;
$$;
create trigger flashcard_review_award_xp after insert on public.card_review_events
for each row execute function public.award_flashcard_review_xp();

create or replace function public.award_task_completion_xp()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $$
begin
  if new.status='completed' then
    if tg_op='INSERT' then
      perform public.award_meowks_xp(new.user_id,'task_completion',new.id,5);
    elsif old.status is distinct from 'completed' then
      perform public.award_meowks_xp(new.user_id,'task_completion',new.id,5);
    end if;
  end if;
  return new;
end;
$$;
create trigger task_completion_award_xp
after insert or update of status on public.tasks
for each row execute function public.award_task_completion_xp();


create or replace function public.award_community_post_xp()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $
begin
  perform public.award_meowks_xp(new.user_id,'community_post',new.id,3);
  return new;
end;
$;
create trigger community_post_award_xp after insert on public.community_posts
for each row execute function public.award_community_post_xp();

create or replace function public.award_community_comment_xp()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $
begin
  perform public.award_meowks_xp(new.user_id,'community_comment',new.id,2);
  return new;
end;
$;
create trigger community_comment_award_xp after insert on public.community_comments
for each row execute function public.award_community_comment_xp();

create or replace function public.meowks_leaderboard(p_limit integer default 20)
returns table(user_id uuid,display_name text,xp bigint,level integer,current_streak integer,rank bigint)
language sql stable security definer set search_path=public,pg_temp
as $$
  select s.user_id,coalesce(nullif(p.display_name,''),'Meowks student'),
         s.xp,s.level,s.current_streak,
         row_number() over(order by s.xp desc,s.level desc,s.user_id)
  from public.user_stats s
  join public.profiles p on p.id=s.user_id
  where p.leaderboard_opt_in=true
  order by s.xp desc,s.level desc
  limit least(greatest(coalesce(p_limit,20),1),50);
$$;
revoke all on function public.meowks_leaderboard(integer) from public;
grant execute on function public.meowks_leaderboard(integer) to authenticated;

commit;
