-- An evening nudge for players about to lose a streak. A second cron job asks the daily-challenge-push Edge
-- Function to remind every subscriber who hasn't finished today's challenge, whose streak is at least 3
-- days and who has no freeze left to cover today (see streak_walk). Missing today would end their streak.

-- The push subscriptions of players whose streak ends if they don't finish `on_day`'s challenge, with the
-- streak they stand to lose.
-- Security definer because it reads every player's plays and subscriptions; only the service role (the
-- Edge Function) may call it.
create function public.streak_reminders(on_day date)
returns table (endpoint text, p256dh text, auth text, streak integer)
language sql
stable
security definer
set search_path = ''
as $$
  with players as (
    select distinct s.user_id
    from public.push_subscriptions s
    where not exists (
      select 1
      from public.plays p
      where p.user_id = s.user_id and p.challenge_day = on_day and p.status is not null
    )
  ),
  at_risk as (
    select pl.user_id, w.streak
    from players pl
    cross join lateral public.streak_walk(
      array(
        select p.challenge_day
        from public.plays p
        where p.user_id = pl.user_id and p.status is not null and p.challenge_day < on_day
        order by p.challenge_day
      ),
      on_day
    ) w
    -- Streaks shorter than 3 days aren't worth an interruption, and a banked freeze will cover today.
    where w.streak >= 3 and w.freezes = 0
  )
  select s.endpoint, s.p256dh, s.auth, r.streak
  from at_risk r
  join public.push_subscriptions s on s.user_id = r.user_id;
$$;

revoke execute on function public.streak_reminders(date) from public, anon, authenticated;
grant execute on function public.streak_reminders(date) to service_role;

-- 20:00 UTC, four hours before the day rolls over (public.challenge_today()). The deadline is the same
-- instant for every player, so the reminder is too.
select cron.schedule(
  'streak-reminder-push',
  '0 20 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/daily-challenge-push',
    body := '{"kind": "streak"}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'daily_push_secret')
    ),
    timeout_milliseconds := 120000
  );
  $$
);
