-- Achievements: badges for milestones, streaks, speed and skill. Like streak freezes, they aren't stored:
-- player_achievements() works each one out from the player's finished plays, so the server stays the referee
-- and an achievement can't be granted by a client or drift from the plays it's earned by. The only thing stored
-- is which earned achievements the player has already been shown, so the app celebrates each one once, on any
-- device. The titles, copy and icons live in lib/achievements.ts, keyed by id.

-- Every achievement and the number its metric must reach, in display order. lib/achievements.ts words its copy
-- from these targets; an id it doesn't know is skipped, so a new one can ship here first.
create function public.achievement_catalog()
returns table (id text, target integer, sort_order integer)
language sql
immutable
set search_path = ''
as $$
  select c.id, c.target, c.sort_order
  from (values
    ('first_solve', 1, 1),
    ('solves_10', 10, 2),
    ('solves_50', 50, 3),
    ('solves_100', 100, 4),
    ('streak_3', 3, 5),
    ('streak_7', 7, 6),
    ('streak_30', 30, 7),
    ('streak_100', 100, 8),
    ('freeze_saved', 1, 9),
    ('all_types', 7, 10),
    ('no_hints_10', 10, 11),
    ('perfect_week', 7, 12),
    ('points_1000', 1000, 13),
    ('quick_60', 1, 14),
    ('crossword_90', 1, 15),
    ('early_bird', 1, 16),
    ('word_two', 1, 17),
    ('connections_flawless', 1, 18),
    ('bee_pangram', 1, 19),
    ('daily_best', 1, 20)
  ) as c (id, target, sort_order);
$$;

revoke execute on function public.achievement_catalog() from public, anon, authenticated;

-- The streak after each finished day (ascending, at most one per day), and how many freezes were spent covering
-- the missed days just before it. The same rules as streak_walk, which only reports where the walk ends; keep
-- the two (and streakFor in lib/progress.ts) in sync.
create function public.streak_days(played date[])
returns table (played_on date, streak integer, frozen integer)
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
  freezes integer := 0;
  total integer := 0;
begin
  streak := 0;
  foreach d in array coalesce(played, '{}'::date[]) loop
    frozen := 0;
    gap := case when prev is null then 0 else d - prev - 1 end;
    if gap > 0 then
      if streak > 0 and gap <= freezes then
        freezes := freezes - gap;
        frozen := gap;
      else
        streak := 0;
      end if;
    end if;

    streak := streak + 1;
    total := total + 1;
    if total % earn_every = 0 then
      freezes := least(freezes + 1, freeze_cap);
    end if;
    played_on := d;
    prev := d;
    return next;
  end loop;
end;
$$;

revoke execute on function public.streak_days(date[]) from public, anon, authenticated;

-- The earned achievements each player has been shown. Written only by mark_achievements_seen().
create table public.achievement_views (
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement text not null,
  seen_at timestamptz not null default now(),
  primary key (user_id, achievement)
);

alter table public.achievement_views enable row level security;

-- The project's default privileges grant everything on new tables; players only ever read their own rows.
revoke all on public.achievement_views from anon, authenticated;
grant select on public.achievement_views to authenticated;

create policy "Players can view the achievements they've seen"
  on public.achievement_views for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Every achievement for `player`, earned or not: its progress towards the target (capped at the target), the UTC
-- day it was earned (null while locked) and, on the caller's own achievements only, whether they've been shown
-- it (null on anyone else's). A metric that counts "best ever" (a streak, a run without hints) reports its best.
-- Fastest of the day only counts once that day is over, so it can't be taken back.
-- Security definer because it reads another player's plays and, for daily_best, everyone's solve times on the
-- player's days, but it returns only these outcomes, never game state.
create function public.player_achievements(player uuid)
returns table (id text, progress integer, target integer, earned_on date, seen boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with finished as (
    select
      p.challenge_day as day,
      c.type,
      c.content,
      p.server_state as st,
      p.status = 'solved' as solved,
      p.status = 'solved' and not p.hint_used as clean,
      p.time_ms,
      p.finished_at,
      case when p.status = 'solved' then
        -- Up to 100 points, minus one per 6 seconds and 20 for a hint; a solve is always worth at least 20.
        greatest(20, round(100 - p.time_ms / 6000.0)::integer - case when p.hint_used then 20 else 0 end)
      else 0 end as points
    from public.plays p
    join public.challenges c on c.day = p.challenge_day
    where p.user_id = player
      and p.status is not null
  ),
  streaks as (
    select s.played_on, s.streak, s.frozen
    from public.streak_days(array(select f.day from finished f order by f.day)) s
  ),
  flagged as (
    select
      f.*,
      s.streak,
      s.frozen,
      -- A failed play or a hint ends a run of clean solves; each break starts a new group.
      sum(case when f.clean then 0 else 1 end) over (order by f.day) as clean_group,
      f.solved and row_number() over (partition by f.type, f.solved order by f.day) = 1 as first_of_type,
      (f.solved and f.time_ms < 60000) as quick,
      (f.solved and f.type = 'crossword' and f.time_ms < 90000) as quick_crossword,
      -- Within the first hour after the puzzle came out at midnight UTC.
      (f.solved and f.finished_at < (f.day::timestamp at time zone 'utc') + interval '1 hour') as early,
      (f.solved and f.type = 'word' and jsonb_array_length(coalesce(f.st -> 'guesses', '[]'::jsonb)) <= 2) as word_two,
      (f.solved and f.type = 'connections' and coalesce((f.st ->> 'mistakes')::integer, 0) = 0) as flawless,
      -- A found word that uses all seven letters. A bee given up still keeps the pangram it found.
      (f.type = 'bee' and exists (
        select 1
        from jsonb_array_elements_text(coalesce(f.st -> 'found', '[]'::jsonb)) w
        where strpos(w, f.content ->> 'center') > 0
          and not exists (
            select 1 from jsonb_array_elements_text(f.content -> 'outer') l where strpos(w, l) = 0
          )
      )) as pangram,
      (f.solved and f.day < (now() at time zone 'utc')::date and not exists (
        select 1
        from public.plays o
        where o.challenge_day = f.day
          and o.status = 'solved'
          and o.user_id <> player
          and (o.time_ms, o.finished_at) < (f.time_ms, f.finished_at)
      )) as fastest
    from finished f
    join streaks s on s.played_on = f.day
  ),
  -- Each metric's running value after every finished day, so the first day it reaches a target is the day
  -- that achievement was earned.
  running as (
    select
      g.day,
      count(*) filter (where g.solved) over w as solves,
      g.streak,
      sum(g.frozen) over w as frozen,
      sum(g.first_of_type::integer) over w as types,
      count(*) filter (where g.clean) over (partition by g.clean_group order by g.day) as clean_run,
      count(*) filter (where g.clean) over (partition by date_trunc('week', g.day) order by g.day) as clean_week,
      sum(g.points) over w as points,
      sum(g.quick::integer) over w as quick,
      sum(g.quick_crossword::integer) over w as quick_crossword,
      sum(g.early::integer) over w as early,
      sum(g.word_two::integer) over w as word_two,
      sum(g.flawless::integer) over w as flawless,
      sum(g.pangram::integer) over w as pangram,
      sum(g.fastest::integer) over w as fastest
    from flagged g
    window w as (order by g.day)
  ),
  reached as (
    select v.id, v.value, r.day
    from running r
    cross join lateral (values
      ('first_solve', r.solves),
      ('solves_10', r.solves),
      ('solves_50', r.solves),
      ('solves_100', r.solves),
      ('streak_3', r.streak),
      ('streak_7', r.streak),
      ('streak_30', r.streak),
      ('streak_100', r.streak),
      ('freeze_saved', r.frozen),
      ('all_types', r.types),
      ('no_hints_10', r.clean_run),
      ('perfect_week', r.clean_week),
      ('points_1000', r.points),
      ('quick_60', r.quick),
      ('crossword_90', r.quick_crossword),
      ('early_bird', r.early),
      ('word_two', r.word_two),
      ('connections_flawless', r.flawless),
      ('bee_pangram', r.pangram),
      ('daily_best', r.fastest)
    ) as v (id, value)
  )
  select
    c.id,
    least(coalesce(max(r.value), 0), c.target)::integer,
    c.target,
    min(r.day) filter (where r.value >= c.target),
    case when player = (select auth.uid()) then exists (
      select 1 from public.achievement_views av where av.user_id = player and av.achievement = c.id
    ) end
  from public.achievement_catalog() c
  left join reached r on r.id = c.id
  where exists (select 1 from public.profiles pr where pr.id = player)
  group by c.id, c.target, c.sort_order
  order by c.sort_order;
$$;

revoke execute on function public.player_achievements(uuid) from public;
-- Achievements show on the public profile card, so signed-out visitors to the leaderboard can see them too.
grant execute on function public.player_achievements(uuid) to anon, authenticated;

-- Records that the caller has been shown these achievements, so they're celebrated only once. Only achievements
-- the caller has actually earned are recorded; anything else is ignored.
-- Security definer because players can't write achievement_views directly.
create function public.mark_achievements_seen(ids text[])
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.achievement_views (user_id, achievement)
  select (select auth.uid()), a.id
  from public.player_achievements((select auth.uid())) a
  where a.earned_on is not null and a.id = any (ids)
  on conflict do nothing;
$$;

revoke execute on function public.mark_achievements_seen(text[]) from public, anon;
grant execute on function public.mark_achievements_seen(text[]) to authenticated;
