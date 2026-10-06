-- Rankings for a period ending on `on_day`: the top `max_rows` players plus the caller.
-- "today" ranks by solve time; "week" (Monday-first) and "month" (calendar month, UTC) by points. "all" is no
-- longer offered in the app, but it still works so a client loaded before this change keeps its tab filled.
-- Streaks are as of `on_day`, with freezes covering missed days (see streak_walk). A caller who hasn't scored
-- gets a row with a null rank.
-- Security definer because it reads every player's plays, but it returns only these public aggregates.
create or replace function public.leaderboard(period text, on_day date, max_rows integer default 10)
returns table (
  user_id uuid,
  display_name text,
  rank integer,
  value integer,
  streak integer,
  solved integer,
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
  finished as (
    select
      p.user_id,
      p.challenge_day,
      p.status,
      p.time_ms,
      p.finished_at,
      -- Up to 100 points, minus one per 6 seconds and 20 for a hint; a solve is always worth at least 20.
      greatest(20, round(100 - p.time_ms / 6000.0)::integer - case when p.hint_used then 20 else 0 end) as points
    from public.plays p
    where p.status is not null
      and p.challenge_day <= on_day
      and on_day <= (now() at time zone 'utc')::date + 1
  ),
  board as (
    select
      f.user_id,
      case when period = 'today' then min(f.time_ms) else sum(f.points)::integer end as value,
      max(f.finished_at) as reached_at
    from finished f
    where f.status = 'solved'
      and case period
        when 'today' then f.challenge_day = on_day
        when 'week' then f.challenge_day >= date_trunc('week', on_day)::date
        when 'month' then f.challenge_day >= date_trunc('month', on_day)::date
        when 'all' then true
        else false
      end
    group by f.user_id
  ),
  ranked as (
    select
      b.user_id,
      b.value,
      row_number() over (
        order by
          case when period = 'today' then b.value end asc,
          case when period <> 'today' then b.value end desc,
          b.reached_at asc
      )::integer as rank
    from board b
  ),
  picked as (
    select r.user_id, r.rank, r.value
    from ranked r
    where r.rank <= least(greatest(max_rows, 0), 50) or r.user_id = (select id from me)
    union all
    select me.id, null, null
    from me
    where me.id is not null and not exists (select 1 from ranked r where r.user_id = me.id)
  ),
  streaks as (
    select f.user_id, (public.streak_walk(array_agg(f.challenge_day order by f.challenge_day), on_day)).streak
    from finished f
    where f.user_id in (select picked.user_id from picked)
    group by f.user_id
  ),
  solves as (
    select f.user_id, count(*)::integer as solved
    from finished f
    where f.status = 'solved' and f.user_id in (select picked.user_id from picked)
    group by f.user_id
  )
  select
    pk.user_id,
    pr.display_name,
    pk.rank,
    pk.value,
    coalesce(st.streak, 0),
    coalesce(so.solved, 0),
    pk.user_id is not distinct from (select id from me)
  from picked pk
  join public.profiles pr on pr.id = pk.user_id
  left join streaks st on st.user_id = pk.user_id
  left join solves so on so.user_id = pk.user_id
  order by pk.rank nulls last;
$$;
