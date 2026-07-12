# Vinay AI OS V2 - Foundation PRD (Phase 1)

## Objective
Reduce Anthropic API costs by 70–90% while improving performance, reliability, and maintainability.

### Principles
- Preserve all existing functionality.
- Refactor architecture, not features.
- Route every AI request through one gateway.
- Prefer deterministic logic over LLMs.

# 1. AI Gateway
## Goal
Create one entry point for every AI request.

### Requirements
- Remove direct `aiText()` usage across modules.
- Create `askAI()` service.
- Gateway responsibilities:
  - Provider/model selection
  - Retry & timeout
  - Logging
  - Budget validation
  - Cache lookup
  - Rule-engine fallback

### Acceptance Criteria
- No module imports `aiText()` directly.
- Providers can be swapped without module changes.

# 2. Rule Engine
## Goal
Avoid AI if deterministic logic is sufficient.

### Convert to rules
- Planner prioritization
- Health recommendations
- Budget analysis
- Expense warnings
- Goal progress
- Dashboard summaries
- Coding reminders
- Learning reminders
- Habit reminders
- Life Score explanations

### Acceptance Criteria
- 80%+ recommendations generated without AI.

# 3. Model Routing
## Goal
Use the cheapest model that meets quality requirements.

### Cheap model
- Intent parsing
- JSON generation
- Classification
- Telegram commands
- Short summaries

### Premium model
- Resume review
- Career coaching
- Finance coaching
- Health coaching
- AI chat
- Project review

### Acceptance Criteria
- No hardcoded model names in modules.
- Routing is configurable.

# 4. Prompt + Context Cache
## Goal
Never regenerate identical results.

### Cache Key
SHA256(prompt + systemPrompt + contextVersion + model)

### Requirements
- Cache prompt + context
- Invalidate when data changes
- Long TTL for summaries
- Medium TTL for recommendations
- No cache for chat

### Acceptance Criteria
- Identical requests return cached responses.
- Document summaries regenerate only after content changes.

# 5. AI Budget Manager
## Goal
Prevent unexpected API costs.

### Track
- Daily/monthly calls
- Input/output tokens
- Estimated cost
- Cache hit rate
- Cost by feature

### Settings
- Monthly budget
- Daily limit
- Emergency stop
- Per-feature limits

### Fallback
1. Rule engine
2. Cache
3. Friendly fallback response

### Acceptance Criteria
- User always sees AI spend.
- Budget exhaustion never breaks the app.

# Implementation Order
1. AI Gateway
2. Rule Engine
3. Model Routing
4. Prompt + Context Cache
5. AI Budget Manager

Do not start new feature development until these five foundations are complete.
