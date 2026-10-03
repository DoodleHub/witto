create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null
    check (display_name = btrim(display_name) and char_length(display_name) between 3 and 24),
  created_at timestamptz not null default now()
);

-- Display names are unique regardless of case ("Alex" and "alex" collide).
create unique index profiles_display_name_key on public.profiles (lower(display_name));

alter table public.profiles enable row level security;

grant select on public.profiles to anon, authenticated;

-- Display names are public (shown on the leaderboard); rows are only written by the signup trigger.
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  to anon, authenticated
  using (true);

-- Creates the profile in the same transaction as the auth user, so a duplicate display name
-- aborts the signup instead of leaving a user without a profile.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, btrim(new.raw_user_meta_data ->> 'display_name'));
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets the signup form report a taken display name before attempting signup.
create function public.display_name_available(name text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select not exists (select 1 from public.profiles where lower(display_name) = lower(btrim(name)));
$$;
