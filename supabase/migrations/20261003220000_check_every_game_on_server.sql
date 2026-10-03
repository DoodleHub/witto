-- Every game is now refereed by the database, not just riddles and math. Players only ever see a
-- challenge's public parts; their moves and hint requests go to play_move and take_hint, which check
-- them against the secret content and keep the verified record of the play in plays.server_state.
-- That's the only way a play gets a result or a hint, so neither can be faked, and nothing secret
-- (answers, solutions, hints not yet taken) reaches the browser before the player has earned it.

-- Verified moves, the hint taken and, once finished, the solution. Players can read it but not write it.
alter table public.plays add column server_state jsonb not null default '{}'::jsonb;

-- Players may still save their own UI state in game_state, but the outcome and hint flag are the server's.
revoke update (hint_used, status) on public.plays from authenticated;

-- Superseded by play_move.
drop function public.submit_answer(date, text);

-- Back to the original guard: with status no longer writable by players, the riddle check isn't needed.
create or replace function public.plays_guard_update()
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

-- What a player may see of a challenge while playing it.
create function public.challenge_public_content(c public.challenges)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when c.type = 'word' then '{}'::jsonb
    when c.type in ('riddle', 'math') then jsonb_build_object('prompt', c.content -> 'prompt')
    when c.type = 'fact' then jsonb_build_object('prompt', c.content -> 'prompt', 'options', c.content -> 'options')
    -- The grid's shape without its letters.
    when c.type = 'crossword' then jsonb_build_object(
      'grid', (
        select jsonb_agg(regexp_replace(g.line, '[^#]', '.', 'g') order by g.pos)
        from jsonb_array_elements_text(c.content -> 'grid') with ordinality as g (line, pos)
      ),
      'across', c.content -> 'across',
      'down', c.content -> 'down'
    )
    when c.type = 'bee' then jsonb_build_object(
      'center', c.content -> 'center',
      'outer', c.content -> 'outer',
      'goal', c.content -> 'goal',
      'total', jsonb_array_length(c.content -> 'words')
    )
    -- All sixteen words in a fixed per-day order that gives nothing away about the groups.
    when c.type = 'connections' then jsonb_build_object(
      'words', (
        select jsonb_agg(w.word order by md5(c.day::text || w.word))
        from jsonb_array_elements(c.content -> 'groups') as g (grp),
          jsonb_array_elements_text(g.grp -> 'words') as w (word)
      )
    )
  end;
$$;

-- What a player learns once they've finished: the answer, or how it all fits together.
create function public.challenge_solution(c public.challenges)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when c.type = 'word' then jsonb_build_object('answer', c.content -> 'answer')
    when c.type in ('riddle', 'math') then jsonb_build_object('reveal', c.content -> 'reveal')
    when c.type = 'fact' then jsonb_build_object('answer', c.content -> 'answer', 'explanation', c.content -> 'explanation')
    when c.type = 'crossword' then jsonb_build_object('grid', c.content -> 'grid')
    when c.type = 'connections' then jsonb_build_object('groups', c.content -> 'groups')
    else '{}'::jsonb
  end;
$$;

-- Word game tile colors for a guess, with standard duplicate-letter handling.
create function public.word_marks(guess text, answer text)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  marks text[] := array_fill('absent'::text, array[length(answer)]);
  unmatched text[] := '{}';
  i integer;
  j integer;
begin
  for i in 1..length(answer) loop
    if substr(guess, i, 1) = substr(answer, i, 1) then
      marks[i] := 'correct';
    else
      unmatched := unmatched || substr(answer, i, 1);
    end if;
  end loop;
  for i in 1..length(answer) loop
    if marks[i] <> 'correct' then
      j := array_position(unmatched, substr(guess, i, 1));
      if j is not null then
        marks[i] := 'present';
        unmatched[j] := null;
      end if;
    end if;
  end loop;
  return to_jsonb(marks);
end;
$$;

-- The crossword's letters, one per cell left to right and top to bottom, "#" for blocks.
create function public.crossword_cells(c public.challenges)
returns table (cell integer, letter text)
language sql
immutable
set search_path = ''
as $$
  select (s.pos - 1)::integer, s.ch
  from regexp_split_to_table(
    lower((select string_agg(g.line, '' order by g.pos) from jsonb_array_elements_text(c.content -> 'grid') with ordinality as g (line, pos))),
    ''
  ) with ordinality as s (ch, pos);
$$;

revoke execute on function public.challenge_public_content(public.challenges) from public, anon, authenticated;
revoke execute on function public.challenge_solution(public.challenges) from public, anon, authenticated;
revoke execute on function public.word_marks(text, text) from public, anon, authenticated;
revoke execute on function public.crossword_cells(public.challenges) from public, anon, authenticated;

-- A released challenge, as players see it while playing.
create or replace function public.challenge_for_day(on_day date)
returns table (number integer, type text, content jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select c.number, c.type, public.challenge_public_content(c)
  from public.challenges c
  where c.day = on_day
    and c.day <= (select public.challenge_today());
$$;

-- What play_move and take_hint return: game-specific feedback plus the play as it now stands.
create function public.play_snapshot(p public.plays, feedback jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'feedback', feedback,
    'status', p.status,
    'time_ms', p.time_ms,
    'hint_used', p.hint_used,
    'state', p.server_state
  );
$$;

revoke execute on function public.play_snapshot(public.plays, jsonb) from public, anon, authenticated;

-- Applies one move to the caller's play of `on_day` and returns the feedback and updated play.
--   any game:     {"give_up": true}
--   riddle, math: {"guess": "..."}            → {"correct": bool}
--   word:         {"guess": "spark"}          → {"marks": [...]}, guesses kept in state.guesses / state.marks
--   fact:         {"pick": 2}                 → {}, the pick kept in state.picked
--   crossword:    {"entries": ["", "m", ...]} → {"wrong": [cells that don't match]}
--   bee:          {"word": "..."}             → {"accepted": bool}, words kept in state.found (also after solving)
--   connections:  {"words": [four words]}     → {"correct": bool, "one_away": bool, "repeat": bool},
--                                               state.solved / state.mistakes / state.tried
create function public.play_move(on_day date, move jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c public.challenges;
  p public.plays;
  st jsonb;
  feedback jsonb := '{}'::jsonb;
  outcome text;
  guess text;
  marks jsonb;
  wrong jsonb;
  picked integer;
  tried_key text;
  best_group integer;
  best_count integer;
begin
  select * into c from public.challenges ch where ch.day = on_day;
  select * into p from public.plays pl
  where pl.user_id = (select auth.uid()) and pl.challenge_day = on_day
  for update;
  if c.day is null or p.user_id is null then
    raise exception 'No play started for %', on_day using errcode = 'P0002';
  end if;
  -- The bee carries on after its goal is reached; everything else is over once finished.
  if p.status is not null and not (c.type = 'bee' and move ? 'word') then
    raise exception 'The play for % is already finished', on_day using errcode = '22023';
  end if;
  st := p.server_state;

  if move ? 'give_up' then
    outcome := 'failed';

  elsif c.type in ('riddle', 'math') then
    feedback := jsonb_build_object('correct', exists (
      select 1
      from jsonb_array_elements_text(c.content -> 'answers') a
      where public.normalize_answer(a) = public.normalize_answer(move ->> 'guess')
    ));
    if (feedback ->> 'correct')::boolean then
      outcome := 'solved';
    end if;

  elsif c.type = 'word' then
    guess := lower(move ->> 'guess');
    if guess is null or length(guess) <> length(c.content ->> 'answer') or guess !~ '^[a-z]+$' then
      raise exception 'A guess must be a % letter word', length(c.content ->> 'answer') using errcode = '22023';
    end if;
    if jsonb_array_length(coalesce(st -> 'guesses', '[]'::jsonb)) >= 5 then
      raise exception 'No guesses left' using errcode = '22023';
    end if;
    marks := public.word_marks(guess, c.content ->> 'answer');
    st := st || jsonb_build_object(
      'guesses', coalesce(st -> 'guesses', '[]'::jsonb) || jsonb_build_array(guess),
      'marks', coalesce(st -> 'marks', '[]'::jsonb) || jsonb_build_array(marks)
    );
    feedback := jsonb_build_object('marks', marks);
    if guess = c.content ->> 'answer' then
      outcome := 'solved';
    elsif jsonb_array_length(st -> 'guesses') >= 5 then
      outcome := 'failed';
    end if;

  elsif c.type = 'fact' then
    picked := (move ->> 'pick')::integer;
    if picked is null or picked < 0 or picked >= jsonb_array_length(c.content -> 'options') then
      raise exception 'Pick one of the options' using errcode = '22023';
    end if;
    st := st || jsonb_build_object('picked', picked);
    outcome := case when picked = (c.content ->> 'answer')::integer then 'solved' else 'failed' end;

  elsif c.type = 'crossword' then
    if jsonb_typeof(move -> 'entries') is distinct from 'array' then
      raise exception 'Send the grid entries' using errcode = '22023';
    end if;
    select coalesce(jsonb_agg(x.cell order by x.cell), '[]'::jsonb) into wrong
    from public.crossword_cells(c) x
    where x.letter <> '#' and coalesce(lower(move -> 'entries' ->> x.cell), '') <> x.letter;
    feedback := jsonb_build_object('wrong', wrong);
    if jsonb_array_length(wrong) = 0 then
      outcome := 'solved';
    end if;

  elsif c.type = 'bee' then
    guess := lower(move ->> 'word');
    feedback := jsonb_build_object(
      'accepted',
      coalesce((c.content -> 'words') ? guess and not coalesce(st -> 'found', '[]'::jsonb) ? guess, false)
    );
    if (feedback ->> 'accepted')::boolean then
      st := st || jsonb_build_object('found', coalesce(st -> 'found', '[]'::jsonb) || jsonb_build_array(guess));
      if p.status is null and jsonb_array_length(st -> 'found') >= (c.content ->> 'goal')::integer then
        outcome := 'solved';
      end if;
    end if;

  elsif c.type = 'connections' then
    if jsonb_typeof(move -> 'words') is distinct from 'array'
      or jsonb_array_length(move -> 'words') <> 4
      or (select count(distinct w) from jsonb_array_elements_text(move -> 'words') w) <> 4
      or exists (
        select 1 from jsonb_array_elements_text(move -> 'words') w
        where not exists (
          select 1 from jsonb_array_elements(c.content -> 'groups') g where (g -> 'words') ? w
        )
      )
    then
      raise exception 'Pick four different words from the puzzle' using errcode = '22023';
    end if;
    select string_agg(w, '|' order by w) into tried_key from jsonb_array_elements_text(move -> 'words') w;

    if coalesce(st -> 'tried', '[]'::jsonb) ? tried_key then
      feedback := jsonb_build_object('repeat', true);
    else
      st := st || jsonb_build_object('tried', coalesce(st -> 'tried', '[]'::jsonb) || jsonb_build_array(tried_key));
      select (g.pos - 1)::integer, count(*)::integer into best_group, best_count
      from jsonb_array_elements(c.content -> 'groups') with ordinality as g (grp, pos),
        jsonb_array_elements_text(move -> 'words') w
      where (g.grp -> 'words') ? w
      group by g.pos
      order by count(*) desc
      limit 1;

      if best_count = 4 then
        st := st || jsonb_build_object(
          'solved',
          coalesce(st -> 'solved', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
            'group', best_group,
            'theme', c.content -> 'groups' -> best_group -> 'theme',
            'words', c.content -> 'groups' -> best_group -> 'words'
          ))
        );
        feedback := jsonb_build_object('correct', true);
        if jsonb_array_length(st -> 'solved') = jsonb_array_length(c.content -> 'groups') then
          outcome := 'solved';
        end if;
      else
        st := st || jsonb_build_object('mistakes', coalesce((st ->> 'mistakes')::integer, 0) + 1);
        feedback := jsonb_build_object('correct', false, 'one_away', best_count = 3);
        if (st ->> 'mistakes')::integer >= 4 then
          outcome := 'failed';
        end if;
      end if;
    end if;

  else
    raise exception 'Unsupported move for a % puzzle', c.type using errcode = '22023';
  end if;

  if outcome is not null and p.status is null then
    st := st || jsonb_build_object('solution', public.challenge_solution(c));
  end if;

  -- The guard trigger stamps finished_at when the status is first set.
  update public.plays pl
  set server_state = st, status = coalesce(p.status, outcome)
  where pl.user_id = p.user_id and pl.challenge_day = on_day
  returning * into p;

  return public.play_snapshot(p, feedback);
end;
$$;

-- Gives the caller a hint for their unfinished play of `on_day`, costing them the hint penalty, and
-- returns the play with it in state.hint. Asking again returns the same hint.
--   riddle, math: {"text"}         word: {"position", "letter"}     fact: {"eliminated"}
--   crossword:    {"cell", "letter"}, preferring a wrong cell among context.pool given context.entries
--   bee:          {"length", "start"} of a word not found yet     connections: {"theme"} of an unsolved group
create function public.take_hint(on_day date, context jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c public.challenges;
  p public.plays;
  hint jsonb;
  pos integer;
  word text;
begin
  select * into c from public.challenges ch where ch.day = on_day;
  select * into p from public.plays pl
  where pl.user_id = (select auth.uid()) and pl.challenge_day = on_day
  for update;
  if c.day is null or p.user_id is null then
    raise exception 'No play started for %', on_day using errcode = 'P0002';
  end if;
  if p.status is not null then
    raise exception 'The play for % is already finished', on_day using errcode = '22023';
  end if;
  if p.server_state ? 'hint' then
    return public.play_snapshot(p, '{}'::jsonb);
  end if;

  if c.type in ('riddle', 'math') then
    hint := jsonb_build_object('text', c.content -> 'hint');

  elsif c.type = 'word' then
    -- The first position no guess has nailed yet.
    select coalesce(min(i), 0) into pos
    from generate_series(0, length(c.content ->> 'answer') - 1) i
    where not exists (
      select 1 from jsonb_array_elements(coalesce(p.server_state -> 'marks', '[]'::jsonb)) m where m ->> i = 'correct'
    );
    hint := jsonb_build_object('position', pos, 'letter', substr(c.content ->> 'answer', pos + 1, 1));

  elsif c.type = 'fact' then
    -- Rules out the first wrong option.
    hint := jsonb_build_object('eliminated', case when (c.content ->> 'answer')::integer = 0 then 1 else 0 end);

  elsif c.type = 'crossword' then
    select x.cell into pos
    from public.crossword_cells(c) x
    left join jsonb_array_elements_text(coalesce(context -> 'pool', '[]'::jsonb)) with ordinality as pl (cell, rank)
      on pl.cell::integer = x.cell
    where x.letter <> '#' and coalesce(lower(context -> 'entries' ->> x.cell), '') <> x.letter
    order by pl.rank nulls last, x.cell
    limit 1;
    if pos is null then
      raise exception 'Nothing left to reveal' using errcode = '22023';
    end if;
    hint := jsonb_build_object('cell', pos, 'letter', (select x.letter from public.crossword_cells(c) x where x.cell = pos));

  elsif c.type = 'bee' then
    -- A longer word the player hasn't found, else any.
    select w.word into word
    from jsonb_array_elements_text(c.content -> 'words') with ordinality as w (word, pos)
    where not coalesce(p.server_state -> 'found', '[]'::jsonb) ? w.word
    order by length(w.word) < 5, w.pos
    limit 1;
    if word is null then
      raise exception 'Every word is already found' using errcode = '22023';
    end if;
    hint := jsonb_build_object('length', length(word), 'start', left(word, 2));

  elsif c.type = 'connections' then
    select jsonb_build_object('theme', g.grp -> 'theme') into hint
    from jsonb_array_elements(c.content -> 'groups') with ordinality as g (grp, pos)
    where not exists (
      select 1 from jsonb_array_elements(coalesce(p.server_state -> 'solved', '[]'::jsonb)) s
      where (s ->> 'group')::integer = g.pos - 1
    )
    order by g.pos
    limit 1;
  end if;

  update public.plays pl
  set hint_used = true, server_state = p.server_state || jsonb_build_object('hint', hint)
  where pl.user_id = p.user_id and pl.challenge_day = on_day
  returning * into p;

  return public.play_snapshot(p, '{}'::jsonb);
end;
$$;

revoke execute on function public.play_move(date, jsonb) from public, anon;
revoke execute on function public.take_hint(date, jsonb) from public, anon;
grant execute on function public.play_move(date, jsonb) to authenticated;
grant execute on function public.take_hint(date, jsonb) to authenticated;

-- Carry existing plays over: finished ones get their solution, and a riddle or math hint already taken
-- gets its text, so they still show after this change.
update public.plays p
set server_state = p.server_state
  || case when p.status is not null then jsonb_build_object('solution', public.challenge_solution(c)) else '{}'::jsonb end
  || case when p.hint_used and c.type in ('riddle', 'math') then jsonb_build_object('hint', jsonb_build_object('text', c.content -> 'hint')) else '{}'::jsonb end
from public.challenges c
where c.day = p.challenge_day
  and (p.status is not null or (p.hint_used and c.type in ('riddle', 'math')));
