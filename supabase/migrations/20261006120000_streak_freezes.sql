-- Streak freezes: a missed day no longer has to end a streak. Every 7th day played earns a freeze (up to
-- 2 banked), and a run of missed days spends one freeze per day, but only when the freezes cover
-- the whole gap; otherwise the streak ends and the freezes are kept for next time. Frozen days keep a
-- streak alive without adding to it.
--
-- Freezes aren't stored anywhere: they're replayed from the player's finished plays by streak_walk(), so
-- the server stays the referee and there's nothing for a client (or a cron job) to get out of sync.
-- lib/progress.ts mirrors this walk for the Today page; keep the two in sync.

-- Replays a player's finished days (ascending, at most one per day, none after `on_day`) and returns their
-- streak as of `on_day`, their best streak ever and the freezes they still hold. `on_day` itself is still
-- open, so missing it doesn't count against the streak yet; missed days before it spend freezes.
create function public.streak_walk(played date[], on_day date)
returns table (streak integer, best integer, freezes integer)
language plpgsql
immutable
set search_path = ''
as $$
declare
  -- Every 7th day played earns a freeze, and a player can bank at most 2.
  earn_every constant integer := 7;
  freeze_cap constant integer := 2;
  d date;
  prev date;
  gap integer;
  total integer := 0;
begin
  streak := 0;
  best := 0;
  freezes := 0;

  foreach d in array coalesce(played, '{}'::date[]) loop
    gap := case when prev is null then 0 else d - prev - 1 end;
    if gap > 0 then
      if streak > 0 and gap <= freezes then
        freezes := freezes - gap;
      else
        streak := 0;
      end if;
    end if;

    streak := streak + 1;
    total := total + 1;
    if total % earn_every = 0 then
      freezes := least(freezes + 1, freeze_cap);
    end if;
    best := greatest(best, streak);
    prev := d;
  end loop;

  -- The days missed since the last play, up to but not including `on_day`.
  gap := case when prev is null then 0 else on_day - prev - 1 end;
  if gap > 0 then
    if streak > 0 and gap <= freezes then
      freezes := freezes - gap;
    else
      streak := 0;
    end if;
  end if;

  return next;
end;
$$;

-- Only the security definer functions below call it, as its owner.
revoke execute on function public.streak_walk(date[], date) from public, anon, authenticated;

-- Rankings for a period ending on `on_day`: the top `max_rows` players plus the caller.
-- "today" ranks by solve time; "week" (Monday-first) and "all" by points. Streaks are as of `on_day`,
-- with freezes covering missed days (see streak_walk). A caller who hasn't scored gets a row with a null rank.
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

-- One player's public record as of `on_day`, for the profile card opened from the leaderboard:
-- totals, current and best streak, a breakdown by challenge type and their most recent finished plays.
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
