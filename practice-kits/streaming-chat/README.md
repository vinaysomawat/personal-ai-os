# Kit: Streaming chat UI

A Vite + React + TypeScript chat client and a tiny Express API (`server/index.js`) that streams a fake LLM reply as Server-Sent Events.
Work in your own editor **with an AI assistant** (60 minutes, 20 per stage) and verify what it suggests.

```bash
npm install
npm run api        # terminal 1 — http://localhost:3001
npm run dev        # terminal 2 — http://localhost:5173 (proxies /api)
```

## Stage 1 — Fix the bugs (20 min)
Users report:
- "My message disappears from the chat as soon as the answer starts streaming."
- "I clicked *New chat* while it was answering and my old conversation came back."
- Security flagged the chat as unsafe. (Try sending `<img src=x onerror=alert('xss')>`.)

Find the root causes, fix them, and say how you verified each fix.

## Stage 2 — Add a feature (20 min)
Add a **Stop** button that cancels the stream (client and server), and **Regenerate** for the last answer.

## Stage 3 — Optimize and harden (20 min)
- Rendering re-runs for every token. Make long answers cheap to render.
- Auto-scroll to the newest message, but not while the user has scrolled up to read.
- The stream parser and the server have robustness problems. Find and fix them.
- Accessibility for streamed content.

Then fill the three fields in Prep's AI-assisted mock.
