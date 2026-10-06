<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# witto

witto is a daily puzzle app with one challenge per day, shared by every player. The challenge types are word, math, riddle, fact, mini crossword, spelling bee and connections. Players sign in, reveal the day's challenge (which starts their timer), play it, and climb a leaderboard ranked by solve time and points. It is installable as a PWA, with an optional push notification when the next challenge drops.

Stack: Next.js 16 (App Router, `proxy.ts` rather than `middleware.ts`), React 19, Tailwind v4, Supabase (Auth, Postgres, Edge Functions, pg_cron). There is no test suite. Check your work with `npm run lint`, `npx tsc --noEmit` and the running app.

## Layout

- `app/`: routes. `(today)/` is the home page with today's challenge, `(auth)/` holds login, signup and their Server Actions (`actions.ts`), `leaderboard/` is public, and `design-system/` is a gallery of the UI kit. `layout.tsx` is the app shell. `manifest.ts` is the PWA manifest.
- `components/`
  - `games/`: one component per game type (`answer-game.tsx` covers both riddle and math). Each one takes `GameProps<Content, Play>` from `types.ts`.
  - `today/`: the Today page. `today-view.tsx` loads the challenge and progress. `challenge-card.tsx` handles reveal and sends each type to its game.
  - `leaderboard/`, `auth/`: views for their routes.
  - `shell/`: the header, mobile tab bar, account menu, install/notification prompts, the in-app-browser notice and service worker registration.
  - `ui/`: shared primitives (Button, Card, Chip, TextInput, icons…) plus `cn()`. Reuse these before writing new ones.
- `lib/`
  - `share.ts`: the spoiler-free emoji summary of a finished play behind the result banner's Share button.
  - `challenges.ts`: challenge types, `TYPE_META`/`TYPE_GUIDE` copy, and the public `*Content` and verified `*Play` types for each game.
  - `progress.ts`: the client-side store of the player's plays (see below).
  - `today.ts`: the current challenge day and countdown, synced to the server clock.
  - `leaderboard.ts`, `push.ts`, `install.ts` (PWA install and in-app-browser detection), `theme.ts`, `date.ts`, `auth.ts`.
  - `supabase/`: `client.ts` (browser), `server.ts` (per request), `proxy.ts` (session refresh plus auth redirect), and the generated `database.types.ts`.
  - `content/words5.ts`: the list of five-letter words accepted as Word game guesses (checked on the client).
- `supabase/`: `migrations/` (the schema history and the source of truth for all game rules), `functions/daily-challenge-push/` (Deno Edge Function), `config.toml`.
- `public/sw.js`: a hand-written service worker. It caches static assets, serves the offline page and shows push notifications. It only registers in production builds.

## Application logic

**The challenge day is UTC.** Every player shares one day that rolls over at midnight UTC on the database clock (`public.challenge_today()`). The client never trusts the device's date. `lib/today.ts` measures an offset against `server_now()` and exposes `useToday()` / `useSecondsToNextChallenge()`, which are `null` during SSR and until the clock is synced. `?date=YYYY-MM-DD` pins the day for previewing each challenge type locally. Do not use `toDateKey(new Date())` for "today".

**The server is the referee.** The browser never receives answers, solutions or unused hints:

1. `challenge_for_day(on_day)` returns only the public content (`challenge_public_content`). Today's content stays sealed (`content: null`) until the player reveals it.
2. `reveal_challenge(on_day)` is the only way to start a play. It inserts the `plays` row, stamps `started_at` on the server and returns the content.
3. `play_move(on_day, move)` checks each move against the secret content, records it in `plays.server_state`, and sets `status` to `solved`/`failed` when the game ends. The move shapes for each game are documented above `play_move` in the latest migration that redefines it.
4. `take_hint(on_day, context)` records the hint in `server_state.hint` and sets `hint_used`. Asking again returns the same hint.
5. Once a play finishes, `server_state.solution` carries the answer. A finished play is final, and a trigger (`plays_guard_update`) freezes it.

Players can only write `plays.game_state`, which holds UI-only state such as typed letters or tile order. Status, hint use, timing and server state are server-only (enforced by column grants and the trigger).

**Client progress store** (`lib/progress.ts`): a module-level `useSyncExternalStore` cache that mirrors the player's `plays` rows. Writes go through a per-day promise queue, so a play is always created before it is updated. Use `playMove`, `takeHint` and `useGameState` from game components. Never update `plays` directly. `refreshPlay` re-reads a day when the tab becomes visible, because the play may have moved on in another tab or on another device.

**Scoring** (`leaderboard()` SQL function): "today" ranks by fastest solve time. "week" (weeks start on Monday) and "all" rank by points: 100 minus 1 per 6 seconds, minus 20 for a hint, with a floor of 20 for any solve. Streaks count consecutive finished days ending today or yesterday. Every 7th day played earns a streak freeze (up to 2 banked), which covers a missed day without adding to the streak. Freezes are never stored: `streak_walk()` replays them from the player's finished plays, and `streakFor` in `lib/progress.ts` mirrors it for the Today page, so keep the two in sync.

**Auth**: email and password with a unique display name (3–24 characters, unique regardless of case). A trigger on `auth.users` creates the `profiles` row in the same transaction, so a duplicate name aborts the signup. The proxy redirects signed-out visitors to `/login?next=…`, except on `/login`, `/signup` and `/leaderboard`. Use `getSessionUser()` (based on `getClaims()`) to read the user on the server. Use `safeNext()` for redirects.

## Supabase

- The Supabase MCP server is configured in `.mcp.json`. Credentials live in `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`), which is gitignored. Load the `supabase` / `supabase-postgres-best-practices` skills before any database work.
- **Every schema change is a new migration** in `supabase/migrations/` (`YYYYMMDDHHMMSS_name.sql`). Never edit an applied one. To change a function, `create or replace` it in a new migration and copy its doc comment along with it.
- After a schema change, regenerate `lib/supabase/database.types.ts`. The generated types claim some columns are non-null when they can be null (see `fetchBoard`), so cast with a comment explaining why.
- Database conventions, which every migration follows:
  - Enable RLS on every table.
  - The project's default privileges grant anon and authenticated full access to new tables, so always `revoke all` and then grant only the columns and privileges the app needs.
  - Functions use `set search_path = ''` and fully qualified names.
  - Revoke `execute` from `public` (and from `anon` where it doesn't apply), then grant it explicitly.
  - Use `security definer` only where a function must read secrets or other players' rows, and return only safe data.
  - Wrap `auth.uid()` as `(select auth.uid())` in policies.
  - Comment the *why* above each object.
- Challenges are seeded a year ahead (`seed_challenges.sql`): types rotate daily, and each type steps through its own pool. Secret fields such as `answer`, `answers`, `words` and `groups` live in `challenges.content` and must stay out of `challenge_public_content`.
- `daily-challenge-push` runs at 00:00 UTC through pg_cron. A second job at 20:00 UTC calls it with `{"kind": "streak"}` to remind players whose streak of 3 or more would end tonight (`streak_reminders()`). It authenticates with `DAILY_PUSH_SECRET`, which is stored in Vault as `daily_push_secret`, and uses the service role key to send Web Push (VAPID). It also prunes subscriptions that come back 410. Its `TYPE_META` duplicates the one in `lib/challenges.ts`, so keep the two in sync.

## Constraints and conventions

- **Never send secrets to the client.** Any new game, hint or field must be checked in SQL (`play_move`/`take_hint`), with only the public parts exposed. Client-side checks (such as `VALID_GUESSES`) are there for UX only.
- **Don't trust the client clock or client-reported results.** Timing comes from `started_at`/`finished_at` on the server.
- Adding a challenge type touches the `type` check constraint, `challenge_public_content`, `challenge_solution`, `play_move`, `take_hint`, `CHALLENGE_TYPES`/`TYPE_META`/`TYPE_GUIDE` and the `*Content`/`*Play` types, a game component, the dispatch in `challenge-card.tsx`, and the push function's `TYPE_META`.
- Pages are Server Components that read the session and hand off to `"use client"` views, which fetch through the browser Supabase client. Mutations go through RPCs or Server Actions, never through raw table writes beyond `game_state`.
- Style with the semantic tokens in `app/globals.css` (`bg-canvas`, `text-ink`, `bg-brand`, `--tile-*`, `--cat-*`…) and never with raw hex values. Theme: `data-theme` on `<html>` (set before paint by `THEME_SCRIPT`) wins, and the OS preference applies otherwise. Both light and dark must work.
- The app is mobile-first and installable: test layouts at phone width, and check iOS behaviour on a real device (see below).
- Comments explain why rather than what, in full sentences. Match the existing tone, which uses plain user-facing copy and sentence case.

# Project learnings

## Styling (Tailwind v4)

- Global rules in `app/globals.css` that aren't inside an `@layer` beat every Tailwind utility, however specific the utility is. Put element-wide defaults (like the `:focus-visible` outline) in `@layer base` so utilities such as `outline-none` can override them.
- The theme overrides Tailwind's radius scale (`rounded-xl` is 20px, not 12px). Check the `--radius-*` tokens in `globals.css` before matching a radius by hand, and prefer `calc(var(--radius-xl) - 2px)` over a hard-coded pixel value.

## Tappable text fields on iOS (installed app)

The crossword grid (`components/games/crossword-game.tsx`) is a grid of `<input>`s, and iOS Safari fought it at every step. What works:

- **Let the wrapper take the tap, not the input.** Give the inputs `pointer-events-none` and put the tap handlers on the square around them, which focuses its input from code. Any tap or double tap on an already-focused input makes iOS show its Paste/AutoFill edit menu, and no `preventDefault` stops it.
- **Focus with `focus({ preventScroll: true })`.** A plain focus scrolls the page to the field, so moving between squares made the screen jump. Calling it from a `touchend` or `mousedown` handler still opens the keyboard.
- **Never cancel `touchstart` to block a gesture.** It also cancels scrolling. Cancelling `touchend` is safe.
- **Put the gesture CSS on whatever receives the touch** (`touch-manipulation select-none [-webkit-touch-callout:none]`).
- **`autoComplete="off"` doesn't stop iOS AutoFill.** iOS ignores it.

None of this shows up in desktop browsers or their mobile emulation. Confirm iOS behaviour on a real device (ideally the installed app) before calling it fixed.
