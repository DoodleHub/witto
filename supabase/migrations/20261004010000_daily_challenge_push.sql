-- Web Push for the daily rollover: each browser that opts in stores its push subscription here, and a cron
-- job at midnight UTC (when challenge_today() rolls over) asks the daily-challenge-push Edge Function to
-- notify every subscriber.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- One row per browser. The endpoint is the push service URL that identifies the subscription.
create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Players can see and remove their own subscriptions; saving goes through save_push_subscription.
revoke all on public.push_subscriptions from anon, authenticated;
grant select, delete on public.push_subscriptions to authenticated;

create policy "Players can view their own push subscriptions"
  on public.push_subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Players can remove their own push subscriptions"
  on public.push_subscriptions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Saves this browser's subscription for the caller. A browser keeps one endpoint across sign-ins, so a
-- subscription saved by someone else on the same device moves to the caller, who evidently holds it.
-- Security definer because RLS can't let a player take over a row they don't own.
create function public.save_push_subscription(sub_endpoint text, sub_p256dh text, sub_auth text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if sub_endpoint !~ '^https://' or length(sub_endpoint) > 1024
    or length(sub_p256dh) > 256 or length(sub_auth) > 256 then
    raise exception 'Invalid push subscription' using errcode = '22023';
  end if;

  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth)
  values (sub_endpoint, (select auth.uid()), sub_p256dh, sub_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth;
end;
$$;

revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

-- pg_cron runs on UTC, so this fires as the new challenge is released. The project URL and the shared
-- secret the Edge Function checks (its DAILY_PUSH_SECRET) live in Vault as project_url and daily_push_secret.
select cron.schedule(
  'daily-challenge-push',
  '0 0 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/daily-challenge-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'daily_push_secret')
    ),
    timeout_milliseconds := 120000
  );
  $$
);
