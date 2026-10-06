-- Shows players how many streak freezes they hold on their own profile. Other players' freezes stay
-- private: they're part of how a streak might survive, not part of the public record.

-- One player's public record as of `on_day`, for the profile card opened from the leaderboard:
-- totals, current and best streak, a breakdown by challenge type and their most recent finished plays.
-- The streak freezes they hold are included only when they're the caller's own (null otherwise).
-- Only finished plays count, and they're scored and streaked exactly as in `leaderboard()`.
-- Returns null when the player doesn't exist.
-- Security definer because it reads another player's plays, but it returns only outcomes, times and
-- hint use, never game or server state.
create or replace function public.player_profile(player uuid, on_day date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with finished as (
    select
      p.challenge_day,
      c.number,
      c.type,
      p.status,
      p.time_ms,
      p.hint_used,
      case when p.status = 'solved' then
        -- Up to 100 points, minus one per 6 seconds and 20 for a hint; a solve is always worth at least 20.
        greatest(20, round(100 - p.time_ms / 6000.0)::integer - case when p.hint_used then 20 else 0 end)
      end as points
    from public.plays p
    join public.challenges c on c.day = p.challenge_day
    where p.user_id = player
      and p.status is not null
      and p.challenge_day <= on_day
      and on_day <= (now() at time zone 'utc')::date + 1
  ),
  walk as (
    select w.*
    from public.streak_walk(
      array(select f.challenge_day from finished f order by f.challenge_day),
      on_day
    ) w
  ),
  by_type as (
    select
      f.type,
      count(*)::integer as played,
      (count(*) filter (where f.status = 'solved'))::integer as solved,
      min(f.time_ms) filter (where f.status = 'solved') as best_ms
    from finished f
    group by f.type
  ),
  recent as (
    select f.*
    from finished f
    order by f.challenge_day desc
    limit 14
  )
  select jsonb_build_object(
    'display_name', pr.display_name,
    'joined_on', (pr.created_at at time zone 'utc')::date,
    'played', (select count(*) from finished),
    'solved', (select count(*) from finished f where f.status = 'solved'),
    'hints', (select count(*) from finished f where f.hint_used),
    'points', (select coalesce(sum(f.points), 0) from finished f),
    'fastest_ms', (select min(f.time_ms) from finished f where f.status = 'solved'),
    'streak', (select w.streak from walk w),
    'best_streak', (select w.best from walk w),
    'freezes', case when player = (select auth.uid()) then (select w.freezes from walk w) end,
    'types', (
      select coalesce(jsonb_agg(to_jsonb(t) order by t.solved desc, t.played desc, t.type), '[]'::jsonb)
      from by_type t
    ),
    'recent', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', r.challenge_day,
        'number', r.number,
        'type', r.type,
        'status', r.status,
        'time_ms', r.time_ms,
        'hint_used', r.hint_used,
        'points', r.points
      ) order by r.challenge_day desc), '[]'::jsonb)
      from recent r
    )
  )
  from public.profiles pr
  where pr.id = player;
$$;
