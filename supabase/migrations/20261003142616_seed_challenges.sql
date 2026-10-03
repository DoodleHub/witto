-- Year one of daily challenges (Oct 1 2026 to Sep 30 2027). The seven types rotate daily and
-- each type steps through its pool once per week: challenge n is type (n - 1) % 7, entry ((n - 1) / 7) % pool size.
with pool (type, idx, content) as (
  values
    ('word', 0, '{"answer":"spark"}'::jsonb),
    ('word', 1, '{"answer":"witty"}'::jsonb),
    ('word', 2, '{"answer":"plume"}'::jsonb),
    ('word', 3, '{"answer":"brisk"}'::jsonb),
    ('word', 4, '{"answer":"glade"}'::jsonb),
    ('math', 0, '{"prompt":"A bat and a ball cost $1.10 together. The bat costs $1.00 more than the ball. How many cents does the ball cost?","answers":["5","5 cents","0.05","$0.05","five"],"hint":"If the ball were 10¢, the bat would be $1.10 — too much in total.","reveal":"5¢ — the bat is $1.05."}'::jsonb),
    ('math', 1, '{"prompt":"What comes next in the sequence: 2, 6, 12, 20, 30, …?","answers":["42","forty two","fortytwo"],"hint":"Look at the gaps between each number.","reveal":"42 — the gaps grow by 2 each time (4, 6, 8, 10, 12)."}'::jsonb),
    ('math', 2, '{"prompt":"If 3 cats catch 3 mice in 3 minutes, how many cats are needed to catch 100 mice in 100 minutes?","answers":["3","three","3 cats"],"hint":"How long does it take one cat to catch one mouse?","reveal":"3 — each cat catches one mouse every 3 minutes."}'::jsonb),
    ('riddle', 0, '{"prompt":"What has keys but no locks, space but no room, and lets you enter but never go inside?","answers":["keyboard","computer keyboard","a keyboard","keyboards"],"hint":"You might be looking right at it.","reveal":"A keyboard."}'::jsonb),
    ('riddle', 1, '{"prompt":"What gets wetter the more it dries?","answers":["towel","a towel","towels"],"hint":"You''ll find one in the bathroom.","reveal":"A towel."}'::jsonb),
    ('riddle', 2, '{"prompt":"I have cities but no houses, forests but no trees, and water but no fish. What am I?","answers":["map","a map","maps","atlas"],"hint":"Explorers never leave home without one.","reveal":"A map."}'::jsonb),
    ('fact', 0, '{"prompt":"How many hearts does an octopus have?","options":["One","Two","Three","Eight"],"answer":2,"explanation":"Two hearts pump blood through the gills; a third pumps it to the rest of the body."}'::jsonb),
    ('fact', 1, '{"prompt":"Which planet has the shortest day in our solar system?","options":["Mercury","Earth","Jupiter","Neptune"],"answer":2,"explanation":"Jupiter spins once roughly every 10 hours, despite being the largest planet."}'::jsonb),
    ('fact', 2, '{"prompt":"Botanically speaking, which of these is a berry?","options":["Strawberry","Banana","Raspberry","Blackberry"],"answer":1,"explanation":"Bananas are true berries. Strawberries and raspberries are not."}'::jsonb),
    ('crossword', 0, '{"grid":["#MUST","LANCE","INDEX","AGENT","RARE#"],"across":{"1":"Has to","5":"Jousting weapon","6":"Alphabetical list at the back of a book","7":"Secret ___ (spy)","8":"Seldom seen"},"down":{"1":"Japanese comics","2":"Beneath","3":"Part of a play''s act","4":"Message sent from a phone","5":"Pinocchio, famously"}}'::jsonb),
    ('crossword', 1, '{"grid":["#SCAR","STAGE","PANEL","IRONY","TENT#"],"across":{"1":"Mark left by a healed wound","5":"Where actors perform","6":"Group of experts at a conference","7":"A fire station burning down, for one","8":"Campsite shelter"},"down":{"1":"Look without blinking","2":"Official body of works","3":"Hollywood dealmaker","4":"Depend (on)","5":"Rotisserie rod"}}'::jsonb),
    ('bee', 0, '{"center":"c","outer":["k","i","t","h","e","n"],"goal":10,"words":["nice","check","cent","kick","tech","kitchen","chicken","neck","ticket","nick","inch","thick","hence","ethnic","chick","heck","chin","cheek","niche","niece","tick","chic","cite","ethic","kinetic","hitch","itch","hectic"]}'::jsonb),
    ('bee', 1, '{"center":"b","outer":["l","a","n","k","e","t"],"goal":10,"words":["been","able","bank","table","ball","beat","battle","bell","label","belt","enable","beaten","beta","blank","babe","blanket","tablet","banana","bent","bean","ballet","bake","belle","bale","beetle","blatant","bleak","beak"]}'::jsonb),
    ('bee', 2, '{"center":"a","outer":["h","i","r","c","u","t"],"goal":10,"words":["that","hair","catch","chair","chat","chart","attract","cart","hatch","attach","tactic","tract","trait","attic","circa","aura","char","aria","tart","archaic","chai","haircut","arch","arctic"]}'::jsonb),
    ('connections', 0, '{"groups":[{"theme":"Coffee orders","words":["LATTE","MOCHA","ESPRESSO","CORTADO"]},{"theme":"Candy bars","words":["MARS","TWIX","SNICKERS","KIT KAT"]},{"theme":"Planets","words":["VENUS","SATURN","MERCURY","NEPTUNE"]},{"theme":"___cake","words":["CUP","PAN","CHEESE","SPONGE"]}]}'::jsonb),
    ('connections', 1, '{"groups":[{"theme":"Fish","words":["TUNA","COD","TROUT","HALIBUT"]},{"theme":"Shades of pink","words":["SALMON","CORAL","ROSE","BLUSH"]},{"theme":"Singing voices","words":["BASS","TENOR","ALTO","SOPRANO"]},{"theme":"Card games","words":["SNAP","POKER","BRIDGE","RUMMY"]}]}'::jsonb)
),
types (type, pos) as (
  select type, pos - 1 from unnest(array['word', 'math', 'riddle', 'fact', 'crossword', 'bee', 'connections']) with ordinality as t (type, pos)
),
sizes as (
  select type, count(*)::integer as size from pool group by type
),
days as (
  select n, date '2026-10-01' + (n - 1) as day from generate_series(1, 365) as n
)
insert into public.challenges (day, number, type, content)
select d.day, d.n, t.type, p.content
from days d
join types t on t.pos = (d.n - 1) % 7
join sizes s on s.type = t.type
join pool p on p.type = t.type and p.idx = ((d.n - 1) / 7) % s.size
order by d.n;
