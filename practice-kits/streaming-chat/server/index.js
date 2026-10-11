import express from 'express'

// A fake LLM: streams a canned reply token by token as Server-Sent Events.
// No API key needed — the point is the streaming plumbing, not the model.
const app = express()
app.use(express.json())

const sleep = ms => new Promise(r => setTimeout(r, ms))

app.post('/api/chat', async (req, res) => {
  const messages = req.body?.messages ?? []
  const last = [...messages].reverse().find(m => m.role === 'user')?.content ?? ''
  const reply =
    `You said: "${last}". Here is a **short answer**: streaming sends tokens as they are generated, ` +
    `so the UI can render progressively instead of waiting for the full response. Use **Server-Sent Events** ` +
    `for one-way streams, and abort the request when the user stops or leaves.`

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  for (const token of reply.split(/(?<= )/)) {
    res.write(`data: ${JSON.stringify(token)}\n\n`)
    await sleep(45)
  }
  res.write('data: [DONE]\n\n')
  res.end()
})

app.listen(3001, () => console.log('chat API on http://localhost:3001'))
