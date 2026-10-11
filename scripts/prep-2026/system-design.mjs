// Full-stack system design (category 'system-design'): 6 new prompts, plus a
// "Full-stack extension" key point appended to every existing question
// (the API shape, data model, caching layer, auth and the scaling
// bottleneck a product-engineer loop asks about after the frontend part).

// Existing title → its full-stack extension (appended once, idempotent).
const EXTENSIONS = {
  'AI chat assistant frontend (e.g. ChatGPT-like)': 'POST /conversations/:id/messages streaming SSE, conversations + messages tables with parent_id for branches, token-usage and rate limits per user, LLM key behind the BFF, bottleneck is model latency and cost',
  'Analytics dashboard with charts and filters': 'GET /metrics?filters with server-side aggregation, pre-aggregated rollup tables or a columnar store, cache by filter hash with short TTL, row-level tenant auth, bottleneck is heavy aggregations',
  'Autocomplete': 'GET /search?q&limit with prefix index (trie, edge n-grams or pg_trgm), cache hot prefixes at the CDN/Redis, rate limit per client, bottleneck is query fan-out per keystroke',
  'Calendar app (e.g. Google Calendar)': 'events with RRULE recurrence + exceptions table, expand recurrences server-side per range, ETag sync tokens for incremental sync, sharing ACLs per calendar, bottleneck is recurrence expansion and invite fan-out',
  'Chat App (e.g. Messenger)': 'WebSocket gateway + REST history with cursor pagination, messages partitioned by conversation, presence in Redis, delivery/read receipts, bottleneck is fan-out to large groups',
  'Checkout flow (multi-step, payments)': 'cart and order APIs with idempotency keys, inventory reservation with expiry, payment intents and webhooks as source of truth, PCI scope kept in the provider iframe, bottleneck is inventory contention at sale peaks',
  'Component library / design system for many product teams': 'tokens published as a versioned package and JSON from a token service, docs site with usage telemetry, semver and codemods for breaking changes, bottleneck is coordinated upgrades across teams',
  'Data Table': 'GET /rows with cursor pagination, server-side sort/filter on indexed columns, total counts estimated or cached, column-level permissions, bottleneck is deep sorts on unindexed columns',
  'Design / Drawing Tool (e.g. Figma, Canva, Excalidraw)': 'document as a CRDT or OT op log over WebSocket, snapshots + op tail in storage, assets on a CDN, per-file ACLs, bottleneck is large documents and many concurrent editors',
  'Dropdown Menu': 'menu items driven by a permissions API (RBAC decides which actions render), feature flags per item, cached per role, bottleneck is fetching permissions on every page',
  'E-commerce Marketplace (e.g. Amazon)': 'product, inventory, cart, order services, search index (Elasticsearch) fed by change events, CDN-cached product pages with ISR, auth for sellers vs buyers, bottleneck is search and inventory consistency',
  'E-commerce search results page with faceted filters': 'GET /search with facets, search engine with facet aggregations, cache popular queries, personalization behind auth, bottleneck is facet counts on large catalogs',
  'Email Client (e.g. Microsoft Outlook)': 'mailbox sync via IMAP/Graph with delta tokens, threads and labels tables, full-text search index, OAuth per account, bottleneck is sync and search over large mailboxes',
  'Feature-flag and A/B testing client SDK': 'flag config service with streaming updates (SSE), evaluation at the edge for SSR, exposure events to an analytics pipeline, signed SDK keys, bottleneck is config fan-out and event volume',
  'File upload and storage UI (e.g. Dropbox / Google Drive)': 'presigned multipart upload URLs, files and folders metadata tables with path or parent ids, dedup by content hash, sharing ACLs, bottleneck is metadata queries on huge folders',
  'Form builder (e.g. Typeform / Google Forms)': 'form schema as versioned JSON, responses table (JSONB) keyed by form version, public submit endpoint with rate limiting and spam checks, bottleneck is analytics over millions of responses',
  'Frontend error-tracking and analytics SDK (e.g. Sentry-like)': 'ingest endpoint accepting batched events, queue then workers to group by fingerprint and symbolicate with source maps, DSN keys with rate limits and sampling, bottleneck is ingest spikes',
  'Google Docs': 'OT or CRDT ops over WebSocket with a document service as authority, snapshots + op log storage, presence channel, per-doc ACLs, bottleneck is hot documents with many editors',
  'Google Sheets': 'cell ops over WebSocket, sheet stored as sparse cells + op log, a server-side formula dependency graph, per-range permissions, bottleneck is recalculation on large sheets',
  'Image Carousel': 'image service with on-the-fly resizing and modern formats behind a CDN (srcset), metadata API, signed URLs for private media, bottleneck is image bytes, not the API',
  'In-browser code editor / playground (e.g. CodeSandbox)': 'project files API with versioned snapshots, dependency resolution and bundling service with a package cache, sandboxed preview origins, bottleneck is container/bundle cold starts',
  'Internationalization for a large app (20+ locales, RTL)': 'translation management system with keys and versions, locale bundles built per release and served from the CDN, locale from user profile and Accept-Language, bottleneck is translation turnaround, not runtime',
  'Kanban board (e.g. Trello)': 'boards, lists and cards tables with fractional index ordering, WebSocket per board for live moves, activity log, workspace RBAC, bottleneck is concurrent reorders on busy boards',
  'Maps and location search (e.g. Google Maps)': 'tile server and CDN, geospatial index (PostGIS, geohash) for viewport queries, geocoding with caching, API keys with quotas, bottleneck is tile and search traffic',
  'Micro-frontend shell for a large organization': 'remote manifest service (which version of each remote per environment), shared auth session via the shell, CDN-hosted remotes with immutable URLs, bottleneck is version skew and coordinated rollbacks',
  'Modal Dialog': 'modal content can need data from an API (lazy fetch on open with caching), destructive actions confirmed server-side with authorization, bottleneck is none — keep the API small',
  'Music Streaming (e.g. Spotify)': 'catalog and playlist APIs, audio segments via CDN with signed URLs and DRM, play events to an analytics pipeline for royalties and recommendations, bottleneck is CDN egress and recommendation compute',
  'News Feed (e.g. Facebook)': 'GET /feed?cursor, fan-out on write for normal users and on read for celebrities, feed cache per user in Redis, ranking service, bottleneck is fan-out and cache invalidation',
  'Notification center with real-time updates': 'notifications table per user with read state, WebSocket/SSE push plus REST for history, unread count cached in Redis, preferences and channel routing, bottleneck is fan-out for broadcast notifications',
  'Offline-first notes app (PWA)': 'sync API with change sets since a version cursor, conflict resolution (CRDT or last-write-wins per field), per-user encryption options, bottleneck is merge conflicts across devices',
  'Photo Sharing (e.g. Instagram)': 'presigned uploads to object storage, async thumbnail and transcode pipeline, posts and follows tables with a feed service, CDN for media, bottleneck is media processing and feed fan-out',
  'Pinterest': 'pins and boards with an image pipeline, masonry feed API with cursor pagination and precomputed recommendations, CDN images with dominant-color placeholders, bottleneck is recommendation and image egress',
  'Poll Widget': 'POST /polls/:id/votes with one vote per user (unique constraint, auth or a signed device id), counts via atomic increments or an aggregate table, live results over SSE, bottleneck is a hot poll counter',
  'Real-time stock ticker / trading dashboard': 'market-data gateway fanning out over WebSocket with per-symbol subscriptions, snapshot + delta protocol, order API with idempotency and auth, bottleneck is fan-out under bursty ticks',
  'Rich Text Editor': 'document stored as structured JSON (ProseMirror) not HTML, server-side sanitization on save, autosave with versions, collaboration via CRDT if multi-user, bottleneck is large documents and versions',
  'Sales-engagement CRM (e.g. Apollo: contacts, sequences, inbox)': 'contacts with custom fields (JSONB plus indexes), sequence scheduler as a job queue with idempotent sends, email provider webhooks, tenant RBAC and row-level security, bottleneck is filtering huge contact tables',
  'Threaded comments (e.g. Reddit)': 'comments with parent_id plus a materialized path or closure table, cursor pagination per level, vote counts cached and recomputed async, moderation and auth, bottleneck is hot threads and score updates',
  'Travel Booking (e.g. Airbnb)': 'search with geo + availability filters, calendar availability table, booking with holds and idempotent payments, reviews and messaging, bottleneck is availability search and double-booking races',
  'Video Conferencing (e.g. Zoom)': 'signaling over WebSocket, SFU media servers chosen by region, TURN for NAT traversal, meeting tokens with expiry, recordings to object storage, bottleneck is SFU capacity and bandwidth',
  'Video Streaming (e.g. Netflix)': 'transcode to HLS/DASH ladders, segments on CDN, playback API with DRM licences, watch-progress writes batched, bottleneck is CDN egress and transcode cost',
}

export async function patch(db) {
  let n = 0
  const { data, error } = await db.from('coding_questions').select('id, title, answer_hints').eq('category', 'system-design')
  if (error) throw new Error(error.message)
  for (const r of data) {
    const ext = EXTENSIONS[r.title]
    if (!ext || (r.answer_hints ?? '').includes('Full-stack extension')) continue
    const hints = r.answer_hints ? `${r.answer_hints} · Full-stack extension: ${ext}` : `Full-stack extension: ${ext}`
    const res = await db.from('coding_questions').update({ answer_hints: hints }).eq('id', r.id)
    if (res.error) throw new Error(res.error.message)
    n++
  }
  return n
}

const q = (title, difficulty, topics, points) => ({ title, difficulty, topics: ['System Design', 'Full-stack', ...topics], answer_hints: points.join(' · ') })

const ROWS = [
  q('Design an AI chat app with RAG over your company docs', 'hard', ['AI'], [
    'requirements: grounded answers with citations, per-team document permissions, streaming responses, feedback on answers',
    'ingestion pipeline: connectors, chunking with overlap, embeddings, a vector index (pgvector) with ACL metadata, re-index on change',
    'query path: embed the question, permission-filtered retrieval, optional reranker, a prompt with sources, streamed answer over SSE',
    'frontend: streaming message list, citation chips that open the source, stop and regenerate, thumbs feedback, conversation history',
    'quality and cost: evals on a golden set, caching, model routing, per-user rate limits, an "I do not know" path',
    'Full-stack extension: conversations/messages tables, BFF holds the LLM key, retrieval latency and index freshness are the bottlenecks',
  ]),
  q('Design an AI agent UI with tool calls and human approvals', 'hard', ['AI'], [
    'requirements: an agent that plans and calls tools (search, send email, update CRM), with approval for risky actions',
    'agent loop on the server: model → tool calls validated against JSON schemas → results → model, step and time limits',
    'approvals: risky tools pause the run in a pending state, the UI shows the exact action diff, approve / edit / reject, resumable runs',
    'frontend: streamed step timeline (thinking, tool call, result), cancellable runs, clear errors and retries',
    'safety and auth: per-user tool allowlists, server-side authorization on every call, audit log, idempotent side effects',
    'Full-stack extension: runs and steps tables, a job queue for long runs, SSE for progress; bottleneck is long-running runs and tool latency',
  ]),
  q('Design LLM-powered search with fallbacks', 'hard', ['AI'], [
    'requirements: natural-language search over products or docs, fast first results, answers when the LLM is down',
    'hybrid retrieval: keyword (BM25) + vector search merged and reranked, filters and permissions applied before ranking',
    'LLM layer: query rewriting and an answer summary with citations, streamed, behind a timeout',
    'fallbacks: show keyword results immediately, degrade to no summary on LLM timeout or budget, a cheaper model as backup, circuit breaker',
    'frontend: instant results then an answer card that streams in, skeletons, cancel stale queries, explain why a result matched',
    'Full-stack extension: search API with cache for popular queries, cost tracking per query; bottleneck is LLM latency and cost per query',
  ]),
  q('Design a real-time collaborative editor', 'hard', ['Real-time'], [
    'requirements: multiple people editing the same document, presence cursors, offline edits that merge, history',
    'consistency model: CRDT (Yjs / Automerge) vs OT with a central server, and why',
    'transport: WebSocket per document room, awareness/presence channel, reconnect with resync of missed updates',
    'persistence: snapshots plus an update log, compaction, version history and restore',
    'frontend: editor binding (ProseMirror or similar), remote cursors, undo per user, large-document performance',
    'Full-stack extension: per-document ACLs checked on join, sticky routing of a doc to one server; bottleneck is hot documents with many editors',
  ]),
  q('Design a notification service (backend and UI)', 'hard', ['Real-time'], [
    'requirements: in-app, email and push notifications, user preferences, digests, unread counts',
    'pipeline: events → notification service → preference and dedupe rules → channel workers (queue per channel) with retries',
    'storage: notifications table per user with read state, templates per channel and locale',
    'delivery: WebSocket/SSE for in-app, provider APIs with webhooks for email/push status, rate limits per user',
    'frontend: bell with unread count, paginated center, optimistic mark-as-read, real-time updates, preferences page',
    'Full-stack extension: idempotency keys per event, Redis for unread counts; bottleneck is fan-out for broadcast notifications',
  ]),
  q('Design a SaaS admin dashboard with RBAC', 'medium', ['Security'], [
    'requirements: organizations, members, roles, audit log, billing, usage analytics',
    'authorization model: roles mapped to permissions, resource-level checks, enforced in every API and server action, tenancy via org_id (RLS)',
    'APIs: members and invitations, role changes, audit log with cursor pagination, usage aggregates',
    'frontend: permission-aware navigation and actions (hidden and disabled states), tables with server-side filters, confirmation for destructive actions',
    'security: invite tokens with expiry, SSO/SAML for enterprise, session and API keys management, audit every admin action',
    'Full-stack extension: cache permissions per session with invalidation on role change; bottleneck is permission checks and large org tables',
  ]),
]

export default ROWS.map((r, i) => ({ ...r, sort_order: 100 + i }))
