import { useState } from 'react'
import { toHtml } from './markdown'

type Message = { role: 'user' | 'assistant'; content: string }

export function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || streaming) return
    const userMsg: Message = { role: 'user', content: input }
    setMessages([...messages, userMsg])
    setInput('')
    setStreaming(true)

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [...messages, userMsg] }),
    })
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let answer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split('\n')) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') continue
        answer += JSON.parse(data)
        setMessages([...messages, { role: 'assistant', content: answer }])
      }
    }
    setStreaming(false)
  }

  return (
    <main>
      <header>
        <h1>Chat</h1>
        <button onClick={() => setMessages([])}>New chat</button>
      </header>
      <div className="log">
        {messages.map((m, i) =>
          m.role === 'assistant'
            ? <div key={i} className="msg assistant" dangerouslySetInnerHTML={{ __html: toHtml(m.content) }} />
            : <div key={i} className="msg user">{m.content}</div>,
        )}
      </div>
      <form onSubmit={send}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask something" />
        <button type="submit" disabled={streaming}>Send</button>
      </form>
    </main>
  )
}
