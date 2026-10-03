-- One puzzle per calendar day. `content` holds the type-specific payload the game components render.
create table public.challenges (
  day date primary key,
  number integer not null unique check (number > 0),
  type text not null
    check (type in ('word', 'math', 'riddle', 'fact', 'crossword', 'bee', 'connections')),
  content jsonb not null check (jsonb_typeof(content) = 'object')
);

alter table public.challenges enable row level security;

grant select on public.challenges to anon, authenticated;

-- Players pick "today" by their local date, which runs up to a day ahead of UTC (UTC+14).
-- Anything later stays hidden so nobody can peek at upcoming puzzles.
create policy "Released challenges are viewable by everyone"
  on public.challenges for select
  to anon, authenticated
  using (day <= (now() at time zone 'utc')::date + 1);

-- A player's attempt at one day's challenge: timing, hint use, in-progress game state and the outcome.
create table public.plays (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  challenge_day date not null references public.challenges (day),
  started_at timestamptz not null default now(),
  hint_used boolean not null default false,
  game_state jsonb,
  status text check (status in ('solved', 'failed')),
  finished_at timestamptz,
  time_ms integer generated always as ((extract(epoch from finished_at - started_at) * 1000)::integer) stored,
  primary key (user_id, challenge_day),
  check ((status is null) = (finished_at is null))
);

-- Leaderboard scans solved plays by day.
create index plays_solved_day_idx on public.plays (challenge_day) where status = 'solved';

alter table public.plays enable row level security;

-- Clients may only start a play and update its game state, hint flag and outcome.
-- started_at and finished_at are server clocks, so solve times can't be forged.
grant select on public.plays to authenticated;
grant insert (challenge_day) on public.plays to authenticated;
grant update (game_state, hint_used, status) on public.plays to authenticated;

create policy "Players can view their own plays"
  on public.plays for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Only the current day (in any timezone) can be started: no back-filling a streak.
create policy "Players can start today's challenge"
  on public.plays for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and challenge_day between (now() at time zone 'utc')::date - 1 and (now() at time zone 'utc')::date + 1
  );

create policy "Players can update their own plays"
  on public.plays for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- A finished play is final: the outcome and hint flag freeze, and the finish time comes from the server.
create function public.plays_guard_update()
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
    new.finished_at := now();
  end if;
  -- A hint, once taken, stays taken.
  new.hint_used := old.hint_used or new.hint_used;
  return new;
end;
$$;

revoke execute on function public.plays_guard_update() from public, anon, authenticated;

create trigger plays_guard_update
  before update on public.plays
  for each row execute function public.plays_guard_update();

-- Rankings for a period ending on `on_day`: the top `max_rows` players plus the caller.
-- "today" ranks by solve time; "week" (Monday-first) and "all" by points. Streaks count consecutive
-- played days ending on `on_day` or the day before. A caller who hasn't scored gets a row with a null rank.
-- Security definer because it reads every player's plays, but it returns only these public aggregates.
create function public.leaderboard(period text, on_day date, max_rows integer default 10)
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
  -- Gaps and islands: consecutive days share the same (day - row_number) group.
  islands as (
    select
      f.user_id,
      f.challenge_day,
      f.challenge_day - (row_number() over (partition by f.user_id order by f.challenge_day))::integer as grp
    from finished f
    where f.user_id in (select picked.user_id from picked)
  ),
  streaks as (
    select i.user_id, count(*)::integer as streak
    from islands i
    group by i.user_id, i.grp
    having max(i.challenge_day) >= on_day - 1
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

revoke execute on function public.leaderboard(text, date, integer) from public;
grant execute on function public.leaderboard(text, date, integer) to anon, authenticated;
