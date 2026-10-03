-- Riddle and math answers never leave the database. Players load the challenge without them and send
-- guesses to submit_answer, so a solve can't be faked by reading the answer off the network.

-- Content is only served through challenge_for_day, which strips what a player mustn't see yet.
revoke select on public.challenges from anon, authenticated;
grant select (day, number, type) on public.challenges to anon, authenticated;

-- Mirrors how players type answers: lowercase, punctuation dropped and a leading article ignored,
-- so "A keyboard!" matches "keyboard".
create function public.normalize_answer(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    btrim(regexp_replace(regexp_replace(lower(input), '[^a-z0-9.$ ]', ' ', 'g'), '\s+', ' ', 'g')),
    '^(a|an|the) ',
    ''
  );
$$;

revoke execute on function public.normalize_answer(text) from public, anon, authenticated;

-- A released challenge. Riddles and math never include their answers, and their reveal (the answer
-- with an explanation) appears only once the caller has finished the play.
create function public.challenge_for_day(on_day date)
returns table (number integer, type text, content jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.number,
    c.type,
    case
      when c.type not in ('riddle', 'math') then c.content
      when exists (
        select 1
        from public.plays p
        where p.user_id = (select auth.uid()) and p.challenge_day = c.day and p.status is not null
      ) then c.content - 'answers'
      else c.content - array['answers', 'reveal']
    end
  from public.challenges c
  where c.day = on_day
    and c.day <= (select public.challenge_today());
$$;

revoke execute on function public.challenge_for_day(date) from public;
grant execute on function public.challenge_for_day(date) to anon, authenticated;

-- Checks a guess at the caller's riddle or math play, solving the play when it's right. Returns whether
-- the guess was right along with the play as it now stands; no row if the caller hasn't started it.
create function public.submit_answer(on_day date, guess text)
returns table (correct boolean, status text, time_ms integer, hint_used boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  accepted jsonb;
  is_correct boolean;
begin
  select c.content -> 'answers' into accepted
  from public.challenges c
  where c.day = on_day and c.type in ('riddle', 'math');
  if accepted is null then
    raise exception 'No riddle or math puzzle on %', on_day using errcode = 'P0002';
  end if;

  is_correct := exists (
    select 1
    from jsonb_array_elements_text(accepted) a
    where public.normalize_answer(a) = public.normalize_answer(guess)
  );

  -- The guard trigger stamps finished_at, and leaves an already-finished play as it was.
  if is_correct then
    update public.plays p
    set status = 'solved'
    where p.user_id = (select auth.uid()) and p.challenge_day = on_day and p.status is null;
  end if;

  return query
    select is_correct, p.status, p.time_ms, p.hint_used
    from public.plays p
    where p.user_id = (select auth.uid()) and p.challenge_day = on_day;
end;
$$;

revoke execute on function public.submit_answer(date, text) from public, anon;
grant execute on function public.submit_answer(date, text) to authenticated;

-- As before, plus: players can't mark a riddle or math play solved themselves, only via submit_answer
-- (which runs as its owner). Giving up still goes through a plain update.
create or replace function public.plays_guard_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status is not null then
    new.status := old.status;
    new.finished_at := old.finished_at;
    new.hint_used := old.hint_used;
  elsif new.status is not null then
    if new.status = 'solved'
      and current_user in ('anon', 'authenticated')
      and exists (
        select 1 from public.challenges c where c.day = new.challenge_day and c.type in ('riddle', 'math')
      )
    then
      raise exception 'Riddle and math answers are checked by submit_answer' using errcode = '42501';
    end if;
    new.finished_at := now();
  end if;
  -- A hint, once taken, stays taken.
  new.hint_used := old.hint_used or new.hint_used;
  return new;
end;
$$;
