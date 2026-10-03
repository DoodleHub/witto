-- The spelling bee now ends at its goal like every other game. Words found past the goal earned nothing
-- (scores only count the solve, its time and the hint), so a finished play takes no more moves at all.

-- Applies one move to the caller's play of `on_day` and returns the feedback and updated play.
--   any game:     {"give_up": true}
--   riddle, math: {"guess": "..."}            → {"correct": bool}
--   word:         {"guess": "spark"}          → {"marks": [...]}, guesses kept in state.guesses / state.marks
--   fact:         {"pick": 2}                 → {}, the pick kept in state.picked
--   crossword:    {"entries": ["", "m", ...]} → {"wrong": [cells that don't match]}
--   bee:          {"word": "..."}             → {"accepted": bool}, words kept in state.found
--   connections:  {"words": [four words]}     → {"correct": bool, "one_away": bool, "repeat": bool},
--                                               state.solved / state.mistakes / state.tried
create or replace function public.play_move(on_day date, move jsonb)
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
  -- Every game, the bee included, is over once finished.
  if p.status is not null then
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
      if jsonb_array_length(st -> 'found') >= (c.content ->> 'goal')::integer then
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
