-- The Today board looks up a day's unsolved plays; solved ones already have plays_solved_day_idx.
create index plays_unsolved_day_idx on public.plays (challenge_day) where status is distinct from 'solved';

-- Players who took on `on_day`'s puzzle without solving it: those who got it wrong ('failed') and those still
-- going ('playing', revealed but unfinished). The Today leaderboard lists them under the ranked solvers, so a
-- day's board shows everyone who tried and not only the winners.
-- Returns failed plays first, then unfinished ones, each oldest start first, capped at `max_rows` (at most 50)
-- but always including the caller. `total` is the full count, so the app can say how many it left out.
-- Security definer because it reads every player's plays, but it returns only these public facts.
create function public.leaderboard_attempts(on_day date, max_rows integer default 20)
returns table (
  user_id uuid,
  display_name text,
  status text,
  streak integer,
  solved integer,
  is_you boolean,
  total integer
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
      row_number() over (order by p.status is null, p.started_at)::integer as position,
      count(*) over ()::integer as total
    from public.plays p
    where p.challenge_day = on_day
      and p.status is distinct from 'solved'
      and on_day <= (now() at time zone 'utc')::date + 1
  ),
  picked as (
    select a.*
    from attempts a
    where a.position <= least(greatest(max_rows, 0), 50) or a.user_id = (select id from me)
  ),
  finished as (
    select p.user_id, p.challenge_day, p.status
    from public.plays p
    where p.user_id in (select picked.user_id from picked)
      and p.status is not null
      and p.challenge_day <= on_day
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
    pk.user_id is not distinct from (select id from me),
    pk.total
  from picked pk
  join public.profiles pr on pr.id = pk.user_id
  left join streaks st on st.user_id = pk.user_id
  left join solves so on so.user_id = pk.user_id
  order by pk.position;
$$;

-- The leaderboard is public, so signed-out visitors can see who tried too.
revoke execute on function public.leaderboard_attempts(date, integer) from public;
grant execute on function public.leaderboard_attempts(date, integer) to anon, authenticated;
