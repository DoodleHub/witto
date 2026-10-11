-- The players who took on `on_day`'s challenge without solving it, so the daily board shows everyone who had a
-- go and not only the winners. A play that ended unsolved is 'failed'; one revealed but not yet finished is
-- 'playing'. Failed plays come first, then the rest in the order they started. Returns at most `max_rows`
-- players plus the caller, and `total` counts every attempt, so the app can say how many it left out.
-- Streaks are as of `on_day`, with freezes covering missed days (see streak_walk).
-- Security definer because it reads every player's plays, but it returns only display names and these public
-- aggregates, never game state.
create function public.leaderboard_attempts(on_day date, max_rows integer default 20)
returns table (
  user_id uuid,
  display_name text,
  status text,
  streak integer,
  solved integer,
  total integer,
  is_you boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select auth.uid() as id
  ),
  attempts as (
    select
      p.user_id,
      coalesce(p.status, 'playing') as status,
      row_number() over (
        order by (p.status is null) asc, coalesce(p.finished_at, p.started_at) asc
      )::integer as position,
      count(*) over ()::integer as total
    from public.plays p
    where p.challenge_day = on_day
      and p.status is distinct from 'solved'
      and on_day <= (now() at time zone 'utc')::date + 1
  ),
  picked as (
    select a.user_id, a.status, a.position, a.total
    from attempts a
    where a.position <= least(greatest(max_rows, 0), 50) or a.user_id = (select id from me)
  ),
  finished as (
    select p.user_id, p.challenge_day, p.status
    from public.plays p
    where p.status is not null
      and p.challenge_day <= on_day
      and p.user_id in (select picked.user_id from picked)
  ),
  streaks as (
    select f.user_id, (public.streak_walk(array_agg(f.challenge_day order by f.challenge_day), on_day)).streak
    from finished f
    group by f.user_id
  ),
  solves as (
    select f.user_id, count(*)::integer as solved
    from finished f
    where f.status = 'solved'
    group by f.user_id
  )
  select
    pk.user_id,
    pr.display_name,
    pk.status,
    coalesce(st.streak, 0),
    coalesce(so.solved, 0),
    pk.total,
    pk.user_id is not distinct from (select id from me)
  from picked pk
  join public.profiles pr on pr.id = pk.user_id
  left join streaks st on st.user_id = pk.user_id
  left join solves so on so.user_id = pk.user_id
  order by pk.position;
$$;

-- The leaderboard is public, so signed-out visitors can see who attempted the puzzle too.
revoke execute on function public.leaderboard_attempts(date, integer) from public;
grant execute on function public.leaderboard_attempts(date, integer) to anon, authenticated;
