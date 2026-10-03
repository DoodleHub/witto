-- The clock starts when a player reveals the challenge, not when the page loads. Today's content stays
-- sealed until then, and reveal_challenge is the only way to start a play, so the content can't be read
-- off the network ahead of the timer.

-- Plays are started by reveal_challenge alone.
revoke insert on public.plays from authenticated;
drop policy "Players can start today's challenge" on public.plays;

-- A released challenge. Its content is sealed (null) until the caller has started it, except for past
-- days, which can no longer be started.
create or replace function public.challenge_for_day(on_day date)
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
      when c.day < (select public.challenge_today())
        or exists (
          select 1
          from public.plays p
          where p.user_id = (select auth.uid()) and p.challenge_day = c.day
        )
      then public.challenge_public_content(c)
    end
  from public.challenges c
  where c.day = on_day
    and c.day <= (select public.challenge_today());
$$;

-- Starts the caller's play of today's challenge (the server stamps started_at) and returns the challenge
-- with its content. Revealing a play that's already underway leaves it alone.
create function public.reveal_challenge(on_day date)
returns table (number integer, type text, content jsonb)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if on_day = (select public.challenge_today()) then
    insert into public.plays (user_id, challenge_day)
    select (select auth.uid()), c.day
    from public.challenges c
    where c.day = on_day
    on conflict (user_id, challenge_day) do nothing;
  end if;
  return query select * from public.challenge_for_day(on_day);
end;
$$;

revoke execute on function public.reveal_challenge(date) from public, anon;
grant execute on function public.reveal_challenge(date) to authenticated;
