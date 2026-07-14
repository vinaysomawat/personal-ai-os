-- Coding + Health "tip of the day": static curated pools (same pattern as
-- coding_questions / workout_library — global, no user_id, read-only,
-- rotated by deterministic app logic) plus one shared per-user log tracking
-- which tip was shown on which day, for either category.
create table if not exists coding_tips (
  id uuid primary key default gen_random_uuid(),
  tip text not null,
  created_at timestamptz not null default now()
);
alter table coding_tips enable row level security;
create policy "authenticated can read coding_tips" on coding_tips
  for select using (auth.role() = 'authenticated');

create table if not exists health_tips (
  id uuid primary key default gen_random_uuid(),
  tip text not null,
  created_at timestamptz not null default now()
);
alter table health_tips enable row level security;
create policy "authenticated can read health_tips" on health_tips
  for select using (auth.role() = 'authenticated');

create table if not exists daily_tips_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  category text not null check (category in ('coding', 'health')),
  tip_id uuid not null,
  assigned_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, category, assigned_date)
);
create index if not exists daily_tips_log_user_category_idx on daily_tips_log (user_id, category);

alter table daily_tips_log enable row level security;
create policy "select own daily_tips_log" on daily_tips_log
  for select using (auth.uid() = user_id);
create policy "insert own daily_tips_log" on daily_tips_log
  for insert with check (auth.uid() = user_id);
create policy "update own daily_tips_log" on daily_tips_log
  for update using (auth.uid() = user_id);
create policy "delete own daily_tips_log" on daily_tips_log
  for delete using (auth.uid() = user_id);

-- Career job alerts: dedupe log of postings already alerted on, from public
-- Greenhouse/Lever job-board APIs (same "free public API + cron + dedupe"
-- pattern as trending_readings' Hacker News integration).
create table if not exists job_alerts_seen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  source text not null check (source in ('greenhouse', 'lever')),
  company text not null,
  external_id text not null,
  title text not null,
  url text not null,
  created_at timestamptz not null default now(),
  unique (user_id, source, external_id)
);

alter table job_alerts_seen enable row level security;
create policy "select own job_alerts_seen" on job_alerts_seen
  for select using (auth.uid() = user_id);
create policy "insert own job_alerts_seen" on job_alerts_seen
  for insert with check (auth.uid() = user_id);
create policy "update own job_alerts_seen" on job_alerts_seen
  for update using (auth.uid() = user_id);
create policy "delete own job_alerts_seen" on job_alerts_seen
  for delete using (auth.uid() = user_id);

-- Seed coding tips (30 to start — expand the pool by hand later; it's a
-- flat table, not code, so growing it needs no app changes).
insert into coding_tips (tip) values
('Array.prototype.at(-1) gets the last element without computing arr.length - 1 — works with negative indices like Python.'),
('structuredClone(obj) does a real deep clone natively — no more JSON.parse(JSON.stringify(obj)) hacks that silently drop functions and Dates.'),
('CSS :has() lets you style a parent based on its children, e.g. .card:has(img) — finally a real parent selector in CSS.'),
('Object.groupBy(items, fn) (ES2024) replaces the reduce-into-an-object pattern for grouping arrays — native, faster to read.'),
('Optional chaining short-circuits the whole chain: a?.b.c() never evaluates .c() if a is nullish, even though c is not itself preceded by ?.'),
('useEffect cleanup functions run before the NEXT effect, not just on unmount — easy to forget when debugging a "runs twice" bug.'),
('CSS container queries (@container) let a component respond to its own container width, not just the viewport — real component-level responsiveness.'),
('Array.prototype.toSorted()/toReversed()/toSpliced() (ES2023) return a new array instead of mutating — no more [...arr].sort() workarounds.'),
('React keys only need to be unique among siblings, not globally — using array index as a key is fine for lists that never reorder or filter.'),
('CSS clamp(min, preferred, max) does responsive typography in one line without a single media query.'),
('The Intl API (Intl.NumberFormat, Intl.DateTimeFormat) handles locale-aware formatting correctly — hand-rolled currency/date formatting almost always has edge-case bugs Intl already solved.'),
('AbortController cancels a fetch AND removes its event listeners in one shot — pass the same signal to multiple APIs to cancel them all together.'),
('CSS :is() and :where() reduce selector repetition; :where() has zero specificity, so it never fights your other rules.'),
('WeakRef and FinalizationRegistry exist for advanced memory management, but 99% of "I need a WeakMap" cases are just "I want to associate data with an object without preventing garbage collection."'),
('Array.prototype.flatMap() is map() + flat(1) fused — useful when a map callback can return zero, one, or many items per input.'),
('The nullish coalescing operator ?? only falls through on null/undefined, unlike || which also triggers on 0, "", and false — a common source of subtle bugs when || is used for defaults on numeric values.'),
('CSS subgrid lets a nested grid inherit its parent''s track sizing — solves the "align nested card contents across a grid" problem that used to need JS.'),
('Promise.any() resolves as soon as ANY promise fulfills (ignoring rejections until all reject) — the inverse of Promise.race(), useful for "try multiple sources, take whichever succeeds first."'),
('React''s key prop forces remount when changed — deliberately changing a key (e.g. key={formId}) is a legitimate way to reset all internal state of a component tree.'),
('CSS aspect-ratio replaces the old "padding-top: 56.25% hack" for maintaining aspect ratios without JS.'),
('Array destructuring with holes skips elements: const [, second] = arr — useful for regex match results where you only want a later capture group.'),
('The structuredClone-adjacent trick: crypto.randomUUID() is a built-in, no-dependency way to generate a UUID v4 in both browser and Node.'),
('CSS :focus-visible only shows focus rings for keyboard navigation, not mouse clicks — fixes the "ugly focus ring on every click" complaint without removing focus indicators for accessibility.'),
('Array.prototype.includes() correctly matches NaN (unlike indexOf, which can''t find NaN because NaN !== NaN).'),
('The URL and URLSearchParams constructors parse and build query strings correctly, including encoding — safer than string concatenation for building URLs.'),
('React Suspense boundaries catch any lazy-loaded or data-fetching child that "suspends," not just React.lazy() components — libraries can opt into the same mechanism.'),
('CSS logical properties (margin-inline, padding-block) automatically flip for RTL languages — better default than margin-left/right if internationalization is ever a possibility.'),
('Array.prototype.findLast() and findLastIndex() (ES2023) search from the end — clearer than reversing an array just to find the last match.'),
('requestIdleCallback schedules low-priority work for the browser''s idle time — useful for analytics or prefetching that shouldn''t compete with rendering.'),
('The in operator checks for a key''s existence including inherited properties — "key" in obj differs from obj.hasOwnProperty("key") when prototypes are involved.')
on conflict do nothing;

-- Seed health tips (30 to start).
insert into health_tips (tip) values
('Protein synthesis stays elevated for ~24-48h after resistance training — spreading protein across 3-4 meals matters more than perfect post-workout timing.'),
('A 10-minute walk after a meal measurably blunts the blood sugar spike compared to sitting — timing matters as much as the walk itself.'),
('Sleep debt doesn''t fully "pay off" with one long recovery night — consistent sleep duration beats occasional catch-up sleep for most metabolic markers.'),
('Strength training burns fewer calories per session than cardio, but raises resting metabolic rate for longer afterward via muscle maintenance cost.'),
('Hydration needs scale with body weight and activity, not a flat "8 glasses a day" — a simpler check is urine color: pale yellow is the target.'),
('Progressive overload doesn''t require adding weight every session — more reps, better range of motion, or slower tempo at the same weight all count.'),
('Caffeine''s half-life is roughly 5-6 hours — a 3pm coffee can still measurably disrupt sleep onset at 11pm even if you don''t feel "wired."'),
('Muscle soreness (DOMS) isn''t a reliable indicator of workout quality — you can build strength and size with minimal soreness once adapted to a routine.'),
('Fiber slows glucose absorption and increases satiety — pairing carbs with fiber (fruit vs. fruit juice) meaningfully changes how a meal affects blood sugar and hunger.'),
('Resting heart rate is one of the simplest recovery signals available without any equipment — a noticeably elevated morning RHR is a common early sign of under-recovery or illness.'),
('Static stretching before strength training can temporarily reduce max force output — dynamic warm-ups (movement-based) are generally better pre-lift, static stretching post-workout.'),
('Sarcopenia (age-related muscle loss) starts as early as the 30s without resistance training — "use it or lose it" is not just a saying for muscle mass.'),
('Cortisol follows a natural daily rhythm, peaking shortly after waking — this is normal and different from chronically elevated cortisol from ongoing stress.'),
('NEAT (non-exercise activity thermogenesis — fidgeting, walking, standing) can vary by hundreds of calories/day between people of similar size and explains a lot of "why doesn''t my friend gain weight" mysteries.'),
('A calorie deficit that''s too aggressive accelerates muscle loss alongside fat loss — a moderate, sustainable deficit preserves more lean mass during a cut.'),
('Grip strength is a genuine longevity biomarker in population studies — deadlifts, farmer''s carries, and dead hangs all build it as a side effect.'),
('Blue light exposure suppresses melatonin production, but the bigger sleep disruptor for most people is the mental stimulation of screens, not just the light itself.'),
('Alcohol significantly reduces REM sleep quality even at moderate amounts — you can sleep 8 hours after drinking and still wake up unrecovered.'),
('The "afterburn effect" (EPOC) from a hard workout typically burns an extra 6-15% of the workout''s calories over the following hours — real, but smaller than most people assume.'),
('Creatine monohydrate is one of the most-studied supplements with a strong safety profile — the "it damages your kidneys" claim isn''t supported in healthy individuals at standard doses.'),
('Standing desks reduce sedentary time but don''t meaningfully raise calorie burn compared to sitting — the real benefit is postural variety and mild NEAT, not weight loss.'),
('Sleep position affects sleep apnea risk (back-sleeping worsens it for some) more than sleep quality metrics for most healthy sleepers.'),
('Muscle can''t turn into fat and vice versa — they''re different tissue types; "muscle turning to fat" after stopping training is actually muscle atrophy plus fat gain happening in parallel.'),
('Zone 2 cardio (conversational-pace effort) builds mitochondrial density and aerobic base more efficiently over time than constantly training at high intensity.'),
('A protein intake around 1.6-2.2g/kg bodyweight covers muscle-building needs for most lifters — intakes far beyond that show diminishing returns in research.'),
('Delayed onset muscle soreness peaks 24-72 hours after a workout, not immediately after — so "not sore the next day" doesn''t mean the session was ineffective.'),
('Micronutrient deficiencies (iron, vitamin D, B12) commonly present as fatigue and are worth ruling out via bloodwork before assuming low energy is just "needing more sleep."'),
('Water intake needs rise with caffeine and alcohol consumption, both of which have mild diuretic effects — not a 1:1 offset, but worth accounting for.'),
('Consistent sleep and wake times (even on weekends) improve sleep quality more than total hours alone — irregular sleep timing is its own risk factor independent of duration.'),
('Post-exercise muscle protein synthesis has a wider "anabolic window" than the old 30-minute myth suggests — getting adequate protein anytime within a few hours of training is sufficient for most people.')
on conflict do nothing;
