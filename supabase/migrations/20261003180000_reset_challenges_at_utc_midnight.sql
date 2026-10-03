-- Every player shares one challenge day that rolls over at midnight UTC on the database's clock,
-- instead of each device's local date.
create function public.challenge_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'utc')::date;
$$;

-- The app syncs its clock to this so its day rolls over with the server's, whatever the device clock says.
create function public.server_now()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select now();
$$;

revoke execute on function public.challenge_today() from public;
revoke execute on function public.server_now() from public;
grant execute on function public.challenge_today() to anon, authenticated;
grant execute on function public.server_now() to anon, authenticated;

drop policy "Released challenges are viewable by everyone" on public.challenges;
create policy "Released challenges are viewable by everyone"
  on public.challenges for select
  to anon, authenticated
  using (day <= (select public.challenge_today()));

-- Only today's challenge can be started; a play already underway can still be finished after the rollover.
drop policy "Players can start today's challenge" on public.plays;
create policy "Players can start today's challenge"
  on public.plays for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and challenge_day = (select public.challenge_today())
  );
