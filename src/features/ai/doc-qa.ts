'use server'

import { aiText } from '@/lib/anthropic'

export async function askDocument(title: string, content: string, question: string): Promise<string> {
  if (!content.trim()) return "This document is empty. Add some content first."

  const prompt = `Document title: "${title}"

Document content:
---
${content.slice(0, 6000)}${content.length > 6000 ? '\n[... content truncated]' : ''}
---

Question: ${question}

Answer the question based only on the document content above. If the answer isn't in the document, say so clearly.`

  return aiText(prompt, "You are a document assistant. Answer questions accurately based only on the provided document. Be concise.")
}

export async function summariseDocument(title: string, content: string): Promise<string> {
  if (!content.trim()) return "Empty document."

  const prompt = `Summarise this document in 3-5 bullet points. Be concise.

Title: "${title}"
Content:
---
${content.slice(0, 6000)}
---`

  return aiText(prompt, "You are a document summariser. Extract the key points. Use bullet points starting with •")
}
