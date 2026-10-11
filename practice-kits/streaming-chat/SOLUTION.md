# Solution — Streaming chat UI

## Planted bugs (Stage 1)
1. **Stale closure drops the user's message.** Inside the read loop, `setMessages([...messages, assistant])` uses `messages` captured before `userMsg` was added, so every token overwrites the list without the user's message. Fix: functional updates — append the user message and an empty assistant message once, then `setMessages(prev => …replace the last assistant…)`.
   *Reproduce:* send any message — it vanishes when the first token arrives.
2. **No cancellation: New chat resurrects the old conversation.** The stream keeps running after "New chat", and its stale `messages` closure writes the old messages back. Fix: an `AbortController` per request, aborted by New chat / unmount / Stop; ignore writes from a superseded request.
   *Reproduce:* send a message, wait for it to finish, send a second one and click New chat while it streams — the first exchange (minus your second message) reappears with the streaming answer.
3. **XSS.** Assistant content (which echoes user input) is rendered with `dangerouslySetInnerHTML` after a regex "markdown" pass, with no escaping. Fix: escape HTML before formatting, sanitize (DOMPurify), or render bold as React nodes; never trust model output as HTML.
   *Reproduce:* send `<img src=x onerror=alert('xss')>`.

## Expected feature (Stage 2)
- Stop: `AbortController.abort()`; the reader loop exits cleanly (catch `AbortError`), the partial answer is kept and marked as stopped, the Send button re-enables.
- Server: listen for `req.on('close')` and stop writing (the fake LLM loop must break), so a cancelled stream doesn't keep generating.
- Regenerate: drop the last assistant message and resend the conversation up to the last user message.

## Optimization / hardening (Stage 3)
- Batch token updates (accumulate in a ref, flush with `requestAnimationFrame` or every ~50 ms); memoize finished messages; stable ids instead of index keys.
- Stream parsing: `TextDecoder.decode(value, { stream: true })` and buffer partial lines across chunks — an SSE event can be split between reads; handle `res.ok === false` and network errors.
- Scroll anchoring: auto-scroll only when within ~40 px of the bottom.
- `aria-live="polite"` region (announce per sentence or on completion, not per token), a label for the input, focus returns to the input.

## What good AI judgment looks like
- Rejecting "just add `messages` to a dependency array" (there is no effect) or a `useRef` copy of messages that still races.
- Rejecting an XSS "fix" that strips `<script>` tags only (event-handler attributes still execute).
- Verifying the server stops by logging in the loop or watching the terminal after Stop.
