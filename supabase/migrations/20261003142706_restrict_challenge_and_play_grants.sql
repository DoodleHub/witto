-- The project's default privileges grant every table in public to anon and authenticated in full, which
-- overrides the column-level grants on plays. Reset both tables to exactly the access the app needs.
revoke all on public.challenges from anon, authenticated;
grant select on public.challenges to anon, authenticated;

revoke all on public.plays from anon, authenticated;
grant select on public.plays to authenticated;
grant insert (challenge_day) on public.plays to authenticated;
grant update (game_state, hint_used, status) on public.plays to authenticated;
