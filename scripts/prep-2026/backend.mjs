// Backend & APIs (category 'backend') — 45 linkless Question Bank rows for
// full-stack "product engineer" loops. answer_hints = the 4–6 key points the
// scorecard grades against ("·" separates them). sort_order puts the
// must-haves first.

const q = (title, difficulty, topics, answer_hints) => ({ title, difficulty, topics, answer_hints })

const ROWS = [
  // ---- API design (8)
  q('Cursor vs offset pagination — when do you use which, and how do you implement a cursor?', 'medium', ['API design', 'Must-have'],
    'offset/limit is simple and allows page jumps but skips or duplicates rows when data changes and gets slow at deep offsets (the DB still scans skipped rows) · cursor = an opaque token encoding the last row\'s sort key plus a unique tiebreaker (created_at, id) · query WHERE (created_at, id) < (cursor) ORDER BY created_at DESC, id DESC LIMIT n+1 to know hasNext · needs a stable sort and a matching composite index · cursor fits infinite scroll and feeds, offset fits admin tables with page numbers'),
  q('REST vs GraphQL vs tRPC — how do you choose for a new product?', 'hard', ['API design', 'Must-have'],
    'REST: resource URLs, HTTP caching and CDNs work out of the box, simple for public APIs · GraphQL: client picks fields, one round trip for nested data, schema as contract, but caching, N+1 (needs DataLoader) and query-cost limits are on you · tRPC: end-to-end TypeScript types with no codegen, best when one team owns a TS client and server (monorepo), not for public or polyglot clients · decide by consumers (public, mobile, internal), team and caching needs'),
  q('What is an idempotency key and how would you implement one for a payment or order API?', 'hard', ['API design', 'Must-have'],
    'client sends a unique Idempotency-Key header per logical operation and reuses it on retries · server stores key + request hash + response (unique constraint) and returns the stored response on a repeat · a different body with the same key is rejected (409/422) · handle concurrent duplicates with a lock or insert-first, in-progress state · keys expire after a TTL (e.g. 24h) · makes retries after timeouts safe for POST'),
  q('How do you version a public API without breaking clients?', 'medium', ['API design'],
    'prefer additive, backward-compatible changes (new optional fields, never repurpose a field) · URL versioning (/v2) is explicit, header or date-based versioning (Stripe-style) keeps URLs stable · deprecation policy: announce, Deprecation/Sunset headers, usage metrics per version · contract tests and a changelog · only bump the major version for breaking changes'),
  q('Design an error contract for an API that a frontend consumes.', 'medium', ['API design', 'Must-have'],
    'correct HTTP status classes (400 validation, 401 unauthenticated, 403 forbidden, 404, 409 conflict, 422, 429 with Retry-After, 5xx) · a consistent JSON body (code, message, details, requestId), e.g. RFC 9457 problem+json · field-level validation errors the form can map to inputs · stable machine-readable codes the UI switches on, never parse messages · no stack traces or internals leaked · the requestId links the UI error to server logs'),
  q('Webhooks vs polling vs SSE — how do you get updates from another system?', 'medium', ['API design'],
    'polling is simple but wasteful and laggy, use backoff and ETags · webhooks push events to your endpoint: verify the HMAC signature, respond 2xx fast and process async, expect retries and duplicates (idempotent handlers, event ids), events can arrive out of order · SSE/WebSocket for pushing to browsers · usually a webhook into the backend, then SSE to the UI'),
  q('How do you design APIs that support optimistic UI?', 'hard', ['API design'],
    'client-generated ids (UUIDs) so the UI can create a row before the server answers · mutations return the full updated resource so the cache reconciles · version or updated_at for conflict detection (409 or If-Match/ETag) · idempotent retries · clear error codes so the UI can roll back with a precise message · batch or ordering semantics for rapid edits'),
  q('How do you let clients request only the fields they need from a REST API?', 'easy', ['API design'],
    'sparse fieldsets (?fields=id,name) or JSON:API style · include/expand for related resources to avoid extra round trips · whitelist allowed fields and depth to protect the DB · trade-off vs GraphQL · watch cache keys, since different field sets mean different responses'),

  // ---- Node / Next.js server (8)
  q('How does the Node.js event loop differ from the browser event loop?', 'hard', ['Node / Next.js server', 'Must-have'],
    'both run one JS thread with a task queue and microtasks (promises) drained after each task · Node (libuv) has phases: timers, pending callbacks, poll (I/O), check (setImmediate), close callbacks · process.nextTick runs before promise microtasks · the browser interleaves rendering (rAF, paint) between tasks, Node has no rendering · CPU-heavy work blocks every request in Node, so use worker_threads or a queue'),
  q('Explain Node streams and backpressure. When would you stream a response?', 'hard', ['Node / Next.js server'],
    'Readable, Writable, Transform, Duplex · backpressure: write() returns false when the buffer passes highWaterMark, wait for drain · pipeline() wires streams and propagates errors and cleanup · stream large files, CSV exports and LLM tokens instead of buffering everything in memory · Web Streams (ReadableStream) in Next route handlers'),
  q('Next.js route handlers vs server actions — when do you use each?', 'medium', ['Node / Next.js server', 'Must-have'],
    'server actions: mutations from your own React UI, form progressive enhancement, typed calls, revalidatePath/revalidateTag after writes · they are still public POST endpoints, so authenticate and validate inside every action · route handlers: a real HTTP API for webhooks, third-party or mobile clients, GET with caching, streaming, custom headers · actions run sequentially and are not meant for data fetching'),
  q('What is Next.js middleware good for, and what should you not do in it?', 'medium', ['Node / Next.js server'],
    'runs before routing on every matched request · good for auth redirects, rewrites, A/B buckets, geo and locale, headers · keep it fast: no heavy DB queries, limited APIs, use matcher config to skip static assets · it is not the only security layer, verify auth again in the data layer and server actions'),
  q('Edge runtime vs Node runtime — trade-offs?', 'medium', ['Node / Next.js server'],
    'edge: low latency close to users, fast cold starts, Web APIs only, no native Node modules, limited CPU time and bundle size · node: full Node APIs, DB drivers and TCP connections, longer execution · edge is near the user but often far from the database, so DB-heavy routes can be slower · choose per route'),
  q('How do you handle long-running work (emails, PDF generation, AI jobs) from a web request?', 'hard', ['Node / Next.js server', 'Must-have'],
    'never block the request: enqueue a job and return 202 with a job id · a queue plus workers (BullMQ/Redis, SQS, Inngest, QStash) with retries, backoff and a dead-letter queue · idempotent jobs · progress through polling or SSE · serverless timeouts mean the work must run outside the request · track status in the DB'),
  q('How do you shut down a Node server gracefully?', 'medium', ['Node / Next.js server'],
    'handle SIGTERM (orchestrators send it before SIGKILL) · stop accepting new connections (server.close), fail the readiness probe first so the load balancer drains · let in-flight requests finish with a timeout · close DB pools, queues and flush logs · then exit · in-flight jobs must be resumable or idempotent'),
  q('What is structured logging and what would you log in an API?', 'easy', ['Node / Next.js server'],
    'JSON logs (pino) with level, timestamp, message and fields, not string concatenation · a request id / trace id propagated through calls and returned to the client · log method, route, status, latency, user id (not PII) · redact tokens, passwords and PII · correlate with traces (OpenTelemetry) and send to a central store'),

  // ---- Auth & security (7)
  q('Sessions vs JWT for a web app — which do you pick and why?', 'hard', ['Auth & security', 'Must-have'],
    'server sessions: opaque id in an HttpOnly cookie, state in the DB or Redis, instant revocation · JWT: stateless and signed, good across services, but cannot be revoked before expiry without a denylist and is often too large · for a browser app prefer an HttpOnly, Secure, SameSite cookie, never localStorage (XSS can read it) · short-lived access token + refresh token if you use JWTs · validate signature, exp, aud and iss'),
  q('How does refresh token rotation work?', 'hard', ['Auth & security'],
    'short-lived access token (minutes) + long-lived refresh token · every refresh returns a new refresh token and invalidates the old one · reuse of an old refresh token means theft, so revoke the whole token family · store refresh tokens in HttpOnly cookies, hashed server-side · handle concurrent refreshes in the client (a single in-flight refresh promise)'),
  q('Explain OAuth 2.0 Authorization Code with PKCE for a single-page app.', 'hard', ['Auth & security', 'Must-have'],
    'SPAs cannot keep a client secret, so PKCE replaces it: random code_verifier, SHA-256 code_challenge sent on the authorize request · redirect back with a code, exchange code + verifier for tokens · the state parameter prevents CSRF on the callback · the implicit flow is deprecated · better still, a BFF does the exchange server-side and gives the browser an HttpOnly session cookie'),
  q('How do you protect a cookie-authenticated app against CSRF?', 'medium', ['Auth & security'],
    'CSRF works because the browser attaches cookies to cross-site requests · SameSite=Lax/Strict cookies block most of it · anti-CSRF tokens (synchronizer or double-submit) for state-changing requests · check the Origin/Referer header · never change state on GET · JSON APIs with custom headers are safer but not a full defense on their own'),
  q('How do you implement role-based access control across the API and the UI?', 'medium', ['Auth & security'],
    'enforce on the server for every request and every server action, the UI only hides things · roles map to permissions and code checks permissions, not role names · resource-level checks (does this user own this record) or Postgres RLS · send the permission set to the client to hide buttons and routes · audit log for admin actions · test the denied paths'),
  q('How do you call an LLM API from a frontend without exposing the API key?', 'medium', ['Auth & security', 'AI backend'],
    'never ship the key to the browser · route through a BFF/API route that holds the key in a server env var · authenticate the user and rate limit per user · validate and cap input size and output tokens · stream the response through · log usage and cost per user · restrict models and tools server-side'),
  q('How would you implement rate limiting for an API?', 'medium', ['Auth & security'],
    'algorithms: fixed window, sliding window, token bucket (allows bursts) · key by user id, API key or IP · shared store (Redis, Upstash) so it works across instances · return 429 with Retry-After and RateLimit headers · different limits per route (login and expensive AI calls are stricter) · clients back off exponentially with jitter'),

  // ---- Data (8)
  q('Design the database schema for a kanban board or a small CRM.', 'hard', ['Data', 'Must-have'],
    'tables: users, workspaces/orgs, memberships with roles, boards, columns, cards (or contacts, deals, activities), comments · foreign keys and indexes on them · card ordering with a float or fractional index (lexorank) so a move does not renumber everything · created_at/updated_at, soft delete where needed · multi-tenancy through workspace_id on every row (RLS) · activity/audit table'),
  q('How do database indexes work, and when do they hurt?', 'medium', ['Data', 'Must-have'],
    'B-tree indexes turn full scans into lookups for equality, range and ORDER BY · composite index column order matters (leftmost prefix) · covering indexes avoid table lookups · they slow down writes and use storage, so unused or duplicate indexes cost · low-selectivity columns rarely help · check with EXPLAIN ANALYZE'),
  q('What is the N+1 query problem and how do you fix it?', 'medium', ['Data', 'Must-have'],
    'one query for a list plus one query per item, e.g. posts then each author · fix with a JOIN, an IN (...) batch, or ORM eager loading (include/select_related) · in GraphQL use DataLoader to batch per request · spot it in query logs or APM traces · also happens on the frontend as waterfall fetches'),
  q('Explain transactions and isolation levels at a practical level.', 'hard', ['Data'],
    'ACID: a transaction is all or nothing · isolation levels: read committed (Postgres default), repeatable read, serializable · anomalies: dirty read, non-repeatable read, phantom, lost update · fix lost updates with SELECT ... FOR UPDATE, optimistic locking on a version column, or atomic UPDATE ... SET x = x + 1 · keep transactions short and never hold one across a network call'),
  q('SQL vs NoSQL — how do you choose for a new product?', 'medium', ['Data'],
    'relational (Postgres) by default: joins, constraints, transactions, flexible queries, and JSONB covers semi-structured data · document stores fit access patterns known up front, flexible schemas and very high write scale · key-value (Redis) for cache and sessions · choose by access patterns, consistency needs and team skills, not hype · many products are Postgres plus Redis'),
  q('How do you run a database migration with zero downtime?', 'hard', ['Data'],
    'expand and contract: add the new column (nullable or with a default), deploy code that writes both, backfill in batches, switch reads, then drop the old column in a later deploy · never rename or drop in the same deploy as the code change · build indexes concurrently · avoid long table locks · migrations must be backward compatible with the running version'),
  q('What are your options for full-text search in an app?', 'medium', ['Data'],
    'Postgres full-text search (tsvector, GIN index, ranking) is enough for many apps · trigram (pg_trgm) for fuzzy and typo-tolerant matching · a dedicated engine (Elasticsearch, Meilisearch, Typesense, Algolia) for facets, typo tolerance and scale, at the cost of syncing data · semantic search with embeddings (pgvector) or hybrid ranking · debounce and cancel requests on the client'),
  q('Soft delete vs hard delete — trade-offs?', 'easy', ['Data'],
    'soft delete (deleted_at) allows undo, audit and restores, but every query must filter it (views or RLS) and unique constraints need partial indexes · hard delete is simpler and helps GDPR erasure · consider an archive table or event log · cascade behavior and orphaned rows · data retention policy'),

  // ---- Caching & performance (6)
  q('Walk through HTTP caching end to end for a web app.', 'hard', ['Caching & performance', 'Must-have'],
    'Cache-Control: max-age, s-maxage for CDNs, private vs public, no-store, immutable for hashed assets · validation with ETag/If-None-Match and Last-Modified returns 304 · stale-while-revalidate and stale-if-error · Vary for content negotiation · hashed static assets cached forever, HTML short or revalidated · never publicly cache personalized responses'),
  q('CDN cache vs application cache vs Redis — what goes where?', 'medium', ['Caching & performance'],
    'CDN: static assets and public, cacheable HTML/API responses at the edge · in-process memory cache: fastest but per instance and lost on deploy · Redis: shared across instances for sessions, rate limits, computed results and hot keys · choose by who shares the data and how fresh it must be · plan invalidation for each layer'),
  q('How would you invalidate the cache for a social feed?', 'hard', ['Caching & performance'],
    'cache invalidation is the hard part: TTLs plus event-driven invalidation on writes · key design (per user, per page or cursor) · fan-out on write (precomputed feeds) vs fan-out on read · versioned keys instead of deletes · tolerate eventual consistency for the feed but read-your-own-writes for the author · avoid a thundering herd (request coalescing, jittered TTLs)'),
  q('Explain stale-while-revalidate on the server and on the client.', 'medium', ['Caching & performance'],
    'serve the cached (possibly stale) value immediately and refresh it in the background · HTTP: Cache-Control stale-while-revalidate=N at the CDN · client: SWR and TanStack Query return cached data, refetch on mount, focus or interval, and dedupe requests · trade freshness for speed · show a subtle refreshing state, not a spinner'),
  q('What are the caching layers in the Next.js App Router?', 'hard', ['Caching & performance'],
    'request memoization (the same fetch deduped within one render) · Data Cache (fetch results across requests, revalidate by time or tag) · Full Route Cache (static HTML and RSC payload at build time or ISR) · client Router Cache · invalidate with revalidatePath and revalidateTag, opt out with no-store or dynamic APIs (cookies, headers) · in Next 15, fetch and GET route handlers are no longer cached by default'),
  q('How do you measure and improve p95 latency of an API?', 'medium', ['Caching & performance'],
    'p95 = 95% of requests are faster than this, averages hide the tail · measure with APM or tracing histograms per route (OpenTelemetry) · find the slow spans: DB queries (EXPLAIN, missing indexes, N+1), external calls, cold starts · fixes: indexes, caching, batching, parallel calls, timeouts, moving work to queues · set an SLO and alert on it'),

  // ---- AI backend (8)
  q('How do you stream LLM tokens to the browser — SSE or WebSocket?', 'hard', ['AI backend', 'Must-have'],
    'SSE: one-way server-to-client over plain HTTP, simple, auto-reconnect, works through proxies, fits token streaming · WebSocket: bidirectional, for real-time collaboration or voice, more infrastructure · server reads the provider stream and forwards chunks (ReadableStream or text/event-stream) · client appends tokens, handles abort (AbortController) and errors mid-stream · disable proxy buffering and keep chunks small'),
  q('How do you make LLM calls reliable: retries, timeouts and fallbacks?', 'medium', ['AI backend'],
    'timeouts on every call, streaming with a first-token timeout · retry 429 and 5xx with exponential backoff and jitter, never retry non-idempotent tool side effects blindly · fallback to another model or provider when the primary fails · circuit breaker · validate structured output (JSON schema) and retry on parse failure · show a graceful degraded state in the UI'),
  q('How do you log prompts and responses safely when they may contain PII?', 'medium', ['AI backend'],
    'log metadata by default (model, tokens, latency, cost, user id, request id) · redact or hash PII before storing prompts (emails, phones, names) · retention limits and access control on logs · opt-out and data-processing agreements with providers · keep logs for debugging and evals, sample if volume is high'),
  q('Walk through a basic RAG pipeline end to end.', 'hard', ['AI backend', 'Must-have'],
    'ingest: load docs, split into chunks (size and overlap), embed, store vectors with metadata · query: embed the question, retrieve top-k (optionally hybrid with keyword search and a reranker), build a prompt with the retrieved context and citations · generate the answer, grounded, saying it does not know when context is missing · evaluate retrieval and answer quality · re-index on document changes'),
  q('pgvector vs a dedicated vector database — how do you choose?', 'medium', ['AI backend'],
    'pgvector: vectors live next to relational data, joins and filters, transactions, RLS, one system to run · HNSW or IVFFlat indexes · dedicated DBs (Pinecone, Weaviate, Qdrant) for very large scale, managed sharding and advanced filtering · start with pgvector unless the scale demands otherwise · metadata filtering and hybrid search matter more than raw speed'),
  q('How do you control the cost of LLM features in production?', 'medium', ['AI backend'],
    'route cheap models for simple or structured tasks and big models only where needed · cache responses for identical prompts and use provider prompt caching · cap input and output tokens, trim context, summarize history · per-user budgets and rate limits · track cost per feature and per user · rules before AI: do not call an LLM for deterministic work'),
  q('How would you build a tool-calling (function-calling) backend for an AI assistant?', 'hard', ['AI backend'],
    'define tools with JSON schemas, the model returns tool calls, the server validates arguments and executes, results go back to the model in a loop until a final answer · allowlist tools per user and authorize every call server-side · require human approval for destructive actions · step limits and timeouts · log every call · stream intermediate steps to the UI'),
  q('How do you run evals for an LLM feature in CI?', 'hard', ['AI backend'],
    'a golden dataset of inputs with expected outputs or rubrics · deterministic checks (schema validity, required facts, banned content) plus LLM-as-judge with a fixed rubric · track scores over time and block merges on regressions · pin model versions and temperature · sample production traffic into the dataset · measure cost and latency too'),
]

// Must-haves first, otherwise the order above.
const must = r => r.topics.includes('Must-have') ? 0 : 1
export default [...ROWS].sort((a, b) => must(a) - must(b)).map((r, i) => ({ ...r, sort_order: i + 1 }))
