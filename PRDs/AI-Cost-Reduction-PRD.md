# Vinay AI OS — AI Cost Reduction & Best Practices PRD

## Diagnosis (read this before implementing anything below)

Queried `ai_usage_logs` directly before writing this spec, since "reduce it" needs a real baseline, not guesses:

```
total_calls: 92        total_cost_usd: $0.1045       active_days: 4 (2026-07-08 → 2026-07-11)
```

Per-task breakdown (all calls, all time):

| task | model | calls | cache hit % | avg output tokens | max output tokens | total cost | avg cost/call |
|---|---|---|---|---|---|---|---|
| `telegram_intent` | Haiku | 81 | 0% | 38 | 152 | $0.0583 | $0.00072 |
| `finance_advisor` | Sonnet | 3 | 0% | 236 | 247 | $0.0120 | $0.00401 |
| `interview_questions` | Sonnet | 1 | 0% | 644 | 644 | $0.0099 | $0.00994 |
| `module_recommendations` | Sonnet | 3 | 33.3% | 178 | 271 | $0.0093 | $0.00310 |
| `study_plan` | Sonnet | 2 | 0% | 229 | 239 | $0.0084 | $0.00422 |
| `health_daily_plan` | Sonnet | 1 | 0% | 262 | 262 | $0.0049 | $0.00491 |
| `telegram_vision` | Sonnet | 1 | 0% | 37 | 37 | $0.0016 | $0.00156 |

**Conclusion: this app's own AI Gateway usage is not high.** $0.10 over 4 days is nowhere near the $3/day or $50/month ceilings — the budget system has never once triggered. No output is anywhere close to the fixed 4096-token cap (worst case seen: 644 tokens, on one `interview_questions` call). No runaway loop, no obvious bug.

**This means the "high token and Anthropic key usage" being observed almost certainly isn't coming from this app's gateway calls.** The most likely explanation: the `ANTHROPIC_API_KEY` used by this app is the same key used elsewhere — most plausibly Claude Code CLI sessions (including the one that wrote this spec), or any other local script/project pointed at the same key. The Anthropic Console's usage view aggregates *all* traffic on a key; it can't distinguish "vinay-ai-os" from "everything else using this key" unless they're different keys.

**Requirement 0 (do this first, before any code change below):** generate a **separate, dedicated API key** for vinay-ai-os in the Anthropic Console, and point `ANTHROPIC_API_KEY` in `.env.local`/Vercel at it exclusively. Keep whatever key Claude Code CLI or other tools use separate. This turns "usage looks high" from a guess into a directly verifiable number — the Console's per-key view will show exactly what this app spends, and it should track closely with the Settings page's AI Budget card and the query above. If, after that split, the *vinay-ai-os key specifically* is still spending more than the numbers above suggest it should, that's a real signal to come back and re-diagnose — not before.

Everything below is still worth doing — the app is at $0.10/4 days now, but usage will grow as more Telegram logging replaces manual entry, and closing these gaps is cheap while the stakes are low. None of it is an emergency fix.

---

## 1. Per-task cost visibility in Settings

## Goal
Answering "what's actually expensive" currently requires hand-writing SQL against `ai_usage_logs` (as done above). That diagnostic should be a standing feature, not a one-off query.

### Requirements
- Extend `getAiBudgetStatus()` (or add a sibling action) in `src/features/settings/actions.ts` to also return a per-task breakdown for the current month: `{ task, calls, totalCost, avgCost, cacheHitPct }[]`, sorted by `totalCost` descending — the same shape as the diagnostic table above, computed live.
- Settings' AI Budget card gets a small expandable "By task" table underneath the existing daily/monthly progress bars. Read-only, matching the card's existing style.

### Acceptance Criteria
- Settings shows this month's spend broken down by task without needing to open Supabase.
- No new AI call introduced — this is a read over an existing table.

---

## 2. Model routing: move mechanical JSON-generation tasks to Haiku

## Goal
The AI-Foundation-PRD's own routing rule (§3) puts "JSON generation, Classification" on the cheap model and reserves the premium model for "coaching," "chat," and similar reasoning tasks. `interview_questions`, `resource_quiz`, and `module_recommendations` are structured JSON generation from a well-defined prompt — not open-ended reasoning — and don't currently follow that rule.

### Requirements
- In `TASK_CONFIG` (`src/lib/ai-gateway.ts`), change the model for `interview_questions`, `resource_quiz`, and `module_recommendations` from Sonnet to Haiku.
- Before flipping the switch permanently: spot-check a handful of real outputs from each on Haiku vs. the current Sonnet output for quality (5 interview Q&A pairs, 5 quiz questions, 3 recommendation items — all short, structured, low-ambiguity asks, so Haiku should be sufficient, but verify rather than assume).
- Leave `doc_qa`, `career_mentor`, `finance_advisor`, `health_report`, `health_daily_plan`, `study_plan`, `daily_briefing`, `weekly_digest`, `telegram_vision` on Sonnet — these involve either open-ended reasoning/coaching or (for `telegram_vision`) reading a receipt/meal photo where a misread has a real cost (wrong expense amount), so correctness outweighs the small savings.

### Acceptance Criteria
- `interview_questions` (today's single most expensive call at $0.0099, driven by 644 Sonnet output tokens) drops to roughly a third of that cost on Haiku, with no perceptible quality loss in the generated questions.
- No change to any Sonnet-routed task.

---

## 3. Right-size `max_tokens` per task instead of a flat 4096 ceiling

## Goal
Every task currently shares one `max_tokens: 4096` cap in `callClaude()`, regardless of the fact that most prompts explicitly ask for &lt;150–250 words (≈200–350 tokens). Nothing has hit this ceiling yet (today's worst case is 644 tokens), but it's a wide-open worst-case: if a model ever ignores a word-limit instruction on a Sonnet call, the bill for that single call could be ~10x a typical one with no code-level guard against it.

### Requirements
- Add a per-task `maxOutputTokens` field to `TASK_CONFIG`, sized with headroom over the task's requested word limit:
  - ~600 tokens for tasks asking for &lt;150 words (`health_daily_plan`, `study_plan`, `daily_briefing`, `finance_advisor`'s "under 200 words" ask, `weekly_digest`'s "under 80 words")
  - ~900 tokens for tasks asking for &lt;250 words (`career_mentor`, `health_report`)
  - Keep ~4096 only for the JSON-array tasks that legitimately need room for multiple structured items (`interview_questions`, `resource_quiz`) and for `doc_qa`/`doc_summary`, which have no fixed word limit today
- `callClaude()` reads this per-call instead of a hardcoded constant.

### Acceptance Criteria
- Typical-case cost is unaffected (every task observed today is already well under its new cap).
- Worst-case cost per call is now bounded close to what the prompt actually asked for, closing the gap between "instructed length" and "billed length."

---

## 4. Extend full-response caching to safe, repeatable Q&A calls

## Goal
Of the 7 task types with any traffic, only `module_recommendations` has ever recorded a cache hit (1 of 3 calls). `career_mentor`, `finance_advisor`, and `doc_qa` currently have no cache TTL at all (`cacheTTLSeconds: null`), meaning clicking the same canned quick-prompt chip twice in a session (e.g. Finance's "Can I afford a car?") re-runs the full call even though the underlying data hasn't changed.

### Requirements
- Give `career_mentor`, `finance_advisor`, and `doc_qa` a short cache TTL — 15–30 minutes is enough to absorb accidental double-clicks and repeated canned-prompt taps within a session without serving meaningfully stale financial/career advice.
- **Do not** add caching to `interview_questions` or `resource_quiz` — these exist specifically to generate *fresh* variety each time "Generate"/"Quiz me" is pressed; caching them would silently return identical questions on a second click, which is a correctness regression disguised as a cost win. This is intentional, not an oversight — worth stating explicitly so a future pass doesn't "fix" it.
- `daily_briefing` and `weekly_digest` are cron-driven once a day/week but can also be triggered on demand via Telegram ("how am I doing" / "how was my week"). Give `daily_briefing` a same-day TTL (cache until midnight) and `weekly_digest` a 24-hour TTL, so an on-demand trigger shortly after the cron run reuses the cron's result instead of regenerating.

### Acceptance Criteria
- Re-asking an identical canned question within the TTL window returns the cached answer (verify via the `cache_hit` flag in `ai_usage_logs`).
- Asking a *different* free-text question is unaffected (cache key includes the full prompt, so it only hits on an exact repeat).
- Clicking "AI Generate"/"Quiz me" twice in a row still produces two different sets of questions.

---

## 5. Anthropic native prompt caching on Telegram system prompts

## Goal
`telegram_intent` is 88% of all call volume (81 of 92 calls) and the single largest cost line ($0.0583, more than all other tasks combined) purely from volume, not per-call size. Every message to a given bot resends that bot's full system prompt (action grammar + example phrases) from scratch — none of it is currently eligible for the app's own `ai_cache` table, because the *user's message* (the part that varies) is baked into the same cache key as the system prompt, so a full-response cache never helps here by design (each message is legitimately different — this is correctly configured, not a bug). What's missed is Anthropic's own **native prompt caching** (`cache_control: {type: "ephemeral"}` on a message block), which is a separate mechanism from this app's `ai_cache` table and caches the repeated *prefix* (the system prompt) server-side across calls, independent of what varies after it.

### Requirements
- In `callClaude()` (`src/lib/anthropic.ts`), mark the `system` prompt block with `cache_control: {type: "ephemeral"}` when its length exceeds the model's minimum cacheable-prefix threshold (verify the current exact minimum for `claude-sonnet-4-6`/`claude-haiku-4-5` against Anthropic's docs at implementation time — this has historically been on the order of ~1–2K tokens depending on model tier, and is worth confirming rather than assuming, since undershooting it silently disables caching with no error).
- This applies automatically to every task, but the payoff is concentrated in `telegram_intent`/`telegram_vision` (called repeatedly per bot per day with a near-identical system prompt) — the other tasks are called too infrequently today for this to matter much yet.
- No change to the app's own `ai_cache` full-response cache (§4 above) — the two mechanisms are complementary: `ai_cache` skips the API call entirely on an exact repeat; native prompt caching discounts the *input* tokens of the unavoidable repeated prefix on calls that aren't exact repeats.

### Acceptance Criteria
- Anthropic's response usage metadata shows `cache_read_input_tokens` &gt; 0 on the second and later `telegram_intent` calls to the same bot within the cache window.
- No behavior change to responses — this only affects billing, not output.
- Low absolute dollar impact at current volume (today's `telegram_intent` input-token total is ~43K tokens ≈ $0.043 before any caching) — this is a structural fix sized for when Telegram usage grows, not a fix for an existing overspend.

---

## 6. Make silent logging failures discoverable

## Goal
`ai_usage_logs` writes are explicitly non-fatal on failure (a deliberate, correct choice — a logging hiccup shouldn't break an AI feature). The failure mode this creates: if writes started silently failing, the budget system would go blind — spend tracking, the Settings card, and the ceilings in §12 of README would all understate real usage with zero visible signal. This is a latent risk regardless of whether it's happening today (the diagnostic above found no evidence it currently is).

### Requirements
- Where the usage-log insert's `catch` block currently swallows the error, add a `console.error` (visible in Vercel function logs) rather than a bare no-op. Do not make this user-facing or retry it — the point is discoverability for whoever's debugging, not resilience.

### Acceptance Criteria
- A logging failure is now visible in Vercel logs; the AI feature itself still succeeds and returns its answer exactly as before.

---

## Non-Goals
- No change to `TELEGRAM_DAILY_AI_CAP` (default 300/day) — actual average is ~23 calls/day across all 7 bots combined; the existing cap has ~13x headroom and isn't the bottleneck.
- No change to the Life Score / rule-engine-first architecture — the diagnostic found zero evidence of AI being called where deterministic code would do (Product Principle 2 is already being followed correctly here).
- Not building a UI to let the ceilings (`AI_DAILY_BUDGET_USD`/`AI_MONTHLY_BUDGET_USD`) be edited from Settings — env-var-only remains fine at this volume.
- Not adding per-feature budget sub-limits (mentioned as an aspiration in the original AI-Foundation-PRD) — no task is anywhere near the aggregate ceiling, so finer-grained limits would add complexity without solving a real problem yet.

## Implementation Order
1. **Requirement 0 — split the API key.** Do this before anything else; it's the step that actually explains the observed symptom and costs nothing to do.
2. §3 (max_tokens right-sizing) and §6 (log failure visibility) — cheapest, lowest-risk, do together.
3. §2 (Haiku for JSON-generation tasks) — verify output quality on the three affected tasks before merging.
4. §4 (extend caching to Q&A tasks) — verify cache hits actually occur without staleness complaints.
5. §5 (native prompt caching on system prompts) — highest effort of the set (requires confirming Anthropic's current cacheable-prefix minimums), lowest urgency given current volume; do this once Telegram usage has grown enough to matter, or opportunistically if it's cheap to bundle with other `anthropic.ts` work.
6. §1 (Settings per-task breakdown) — do last; it's a visibility feature, not a cost fix, and is most useful once the above changes give it something interesting to show.
