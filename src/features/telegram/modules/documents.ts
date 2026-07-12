import type { SupabaseClient } from '@supabase/supabase-js'
import type { ModuleReply } from '@/lib/telegram/types'

export const SYSTEM_PROMPT = `You are the Documents bot for Vinay AI OS. Parse the user message and return ONLY a JSON action.

Actions:
{"action":"create_document","title":"title","content":"full content","tags":["tag1","tag2"]}
{"action":"append","search":"title","content":"text to append"}
{"action":"search_documents","query":"search term"}
{"action":"list_documents"}
{"action":"ask","topic":"short keyword or title fragment to find the right document","question":"free-form question about a document's content"}
{"action":"undo_last"}
{"action":"help"}

Rules:
- For "note that...", "remember...", "save..." → create_document or append to existing
- For "add to [title]" → append action
- tags are topic keywords, lowercase
- For "what did I write about X", "what does my Y doc say about Z", "summarise my X notes" → ask, with topic set to the most distinctive keyword/title fragment (e.g. "X" or "Y") and question set to the full question
- For "undo that", "delete the doc I just made", "oops wrong note" → undo_last`

export async function execute(action: Record<string, unknown>, db: SupabaseClient, userId: string): Promise<ModuleReply> {
  switch (action.action) {
    case 'create_document': {
      const tags = Array.isArray(action.tags) ? action.tags : []
      const { error } = await db.from('documents').insert({ user_id: userId, title: action.title, content: action.content ?? '', tags, updated_at: new Date().toISOString() })
      if (error) return `❌ ${error.message}`
      return `📄 Created *${action.title}*${tags.length ? `\nTags: ${tags.join(', ')}` : ''}`
    }
    case 'append': {
      const { data } = await db.from('documents').select('id, title, content').eq('user_id', userId).ilike('title', `%${action.search}%`).limit(1)
      const doc = data?.[0]
      if (!doc) return `❌ No document matching "${action.search}"`
      const newContent = doc.content ? `${doc.content}\n\n${action.content}` : String(action.content)
      await db.from('documents').update({ content: newContent, updated_at: new Date().toISOString() }).eq('id', doc.id)
      return `📝 Appended to *${doc.title}*`
    }
    case 'search_documents': {
      const { data } = await db.from('documents').select('title, content, tags').eq('user_id', userId).or(`title.ilike.%${action.query}%,content.ilike.%${action.query}%`).limit(5)
      if (!data?.length) return `No documents matching "${action.query}"`
      return `🔍 *Found ${data.length} document${data.length !== 1 ? 's' : ''}:*\n` + data.map(d => `📄 *${d.title}*${d.tags?.length ? ` _(${d.tags.join(', ')})_` : ''}\n${d.content.slice(0, 80)}...`).join('\n\n')
    }
    case 'list_documents': {
      const { data } = await db.from('documents').select('title, tags, updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(10)
      if (!data?.length) return 'No documents yet.'
      return `📚 *Your documents:*\n` + data.map(d => `📄 *${d.title}*${d.tags?.length ? ` _(${d.tags.join(', ')})_` : ''}`).join('\n')
    }
    case 'ask': {
      const topic = String(action.topic ?? action.question ?? '')
      const { data } = await db.from('documents').select('title, content').eq('user_id', userId).or(`title.ilike.%${topic}%,content.ilike.%${topic}%`).order('updated_at', { ascending: false }).limit(1)
      const doc = data?.[0]
      if (!doc) return `❌ No document matching "${topic}" — try "search ${topic}" to browse close matches.`
      const { askDocument } = await import('@/features/ai/doc-qa')
      const answer = await askDocument(doc.title, doc.content, String(action.question))
      return `📄 *${doc.title}:*\n\n${answer}`
    }
    case 'undo_last': {
      const { data } = await db.from('documents').select('id, title').eq('user_id', userId).order('created_at', { ascending: false }).limit(1)
      const last = data?.[0]
      if (!last) return `❌ No recent document to undo.`
      await db.from('documents').delete().eq('id', last.id)
      return `🗑️ Undone: *${last.title}*`
    }
    default:
      return `*Documents Bot — What I can do:*\n• "note that Next.js 15 uses server components by default"\n• "create doc Interview Prep with content..."\n• "add to Interview Prep: practice system design"\n• "search React hooks"\n• "list documents"\n• "what did I write about system design?"\n• "undo that"`
  }
}
