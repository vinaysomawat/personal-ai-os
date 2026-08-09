'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { addDocument, updateDocument, deleteDocument } from '../actions'
import { askDocument, summariseDocument } from '@/features/ai/doc-qa'
import type { Document } from '../types'

interface Props { initialDocuments: Document[] }

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function DocumentsView({ initialDocuments }: Props) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Document | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editTags, setEditTags] = useState('')
  const [isPending, startTransition] = useTransition()
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState<string | null>(null)
  const [aiAction, setAiAction] = useState<'ask' | 'summarise' | null>(null)

  const [docs, updateDocs] = useOptimistic(
    initialDocuments,
    (state: Document[], action: { type: string; payload: Partial<Document> & { id?: string } }) => {
      if (action.type === 'add') return [action.payload as Document, ...state]
      if (action.type === 'update') return state.map(d => d.id === action.payload.id ? { ...d, ...action.payload } : d)
      if (action.type === 'delete') return state.filter(d => d.id !== action.payload.id)
      return state
    }
  )

  const filtered = docs.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.content.toLowerCase().includes(search.toLowerCase()) ||
    d.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  )

  const handleAdd = () => {
    if (!editTitle.trim()) return
    const tags = editTags.split(',').map(t => t.trim()).filter(Boolean)
    const optimistic: Document = {
      id: `temp-${Date.now()}`, user_id: '',
      title: editTitle, content: editContent, tags,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }
    setShowForm(false)
    setEditTitle(''); setEditContent(''); setEditTags('')
    startTransition(async () => {
      updateDocs({ type: 'add', payload: optimistic })
      await addDocument(optimistic.title, optimistic.content, tags)
    })
  }

  const handleSave = () => {
    if (!selected || !editTitle.trim()) return
    const tags = editTags.split(',').map(t => t.trim()).filter(Boolean)
    const updated = { ...selected, title: editTitle, content: editContent, tags, updated_at: new Date().toISOString() }
    setSelected(updated)
    startTransition(async () => {
      updateDocs({ type: 'update', payload: updated })
      await updateDocument(selected.id, editTitle, editContent, tags)
    })
  }

  const handleDelete = (id: string) => {
    if (selected?.id === id) setSelected(null)
    startTransition(async () => {
      updateDocs({ type: 'delete', payload: { id } })
      await deleteDocument(id)
    })
  }

  const openDoc = (doc: Document) => {
    setSelected(doc)
    setEditTitle(doc.title)
    setEditContent(doc.content)
    setEditTags(doc.tags.join(', '))
    setAiAnswer(null)
    setShowForm(false)
  }

  const handleAsk = async () => {
    if (!editContent || !aiQuestion.trim()) return
    setAiAction('ask')
    setAiAnswer(null)
    try {
      const answer = await askDocument(editTitle, editContent, aiQuestion)
      setAiAnswer(answer)
    } finally {
      setAiAction(null)
    }
  }

  const handleSummarise = async () => {
    if (!editContent) return
    setAiAction('summarise')
    setAiAnswer(null)
    setAiQuestion('Summarise this document')
    try {
      const summary = await summariseDocument(editTitle, editContent)
      setAiAnswer(summary)
    } finally {
      setAiAction(null)
    }
  }

  const editing = selected || showForm
  const docContentLen = editContent.length
  const charCountLabel = `${docContentLen} characters${docContentLen >= 300 ? ' · eligible for auto-summary' : ` · ${300 - docContentLen} more for auto-summary`}`

  return (
    <div className="flex h-[calc(100vh-7.5rem)] md:h-[calc(100vh-6rem)]">
      {/* Sidebar */}
      <div className={`${editing ? 'hidden md:flex' : 'flex'} w-full md:w-[280px] md:min-w-[220px] shrink-0 flex-col border-r border-surface-3 p-4 overflow-hidden`}>
        <input
          value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, content, tags..."
          className="bg-surface-2 border border-surface-3 rounded-[8px] px-3 py-[9px] text-[12.5px] text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors mb-2.5"
        />
        <button onClick={() => { setShowForm(true); setSelected(null); setEditTitle(''); setEditContent(''); setEditTags(''); setAiAnswer(null) }}
          className="py-[9px] rounded-[8px] bg-accent text-white text-[12.5px] font-semibold hover:bg-accent/90 transition-colors mb-3">
          + New Document
        </button>
        <div className="flex-1 overflow-y-auto flex flex-col gap-2">
          {filtered.map(doc => (
            <div key={doc.id} role="button" tabIndex={0} onClick={() => openDoc(doc)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDoc(doc) } }}
              className={`cursor-pointer rounded-[10px] px-3 py-2.5 border transition-colors ${selected?.id === doc.id ? 'bg-accent-soft border-accent-border' : 'bg-surface-2 border-transparent'}`}>
              <div className="flex items-start justify-between gap-1.5">
                <span className="text-[13px] font-bold text-fg-primary">{doc.title}</span>
                <button onClick={e => { e.stopPropagation(); handleDelete(doc.id) }} aria-label="Delete document"
                  className="text-fg-quaternary hover:text-red-400 text-xs leading-none shrink-0 transition-colors">
                  ✕
                </button>
              </div>
              <div className="text-[10.5px] text-fg-tertiary mt-0.5">{formatShortDate(doc.updated_at)}</div>
              <p className="text-[11.5px] text-fg-secondary mt-[5px] leading-[1.4]">
                {doc.content.slice(0, 90)}{doc.content.length > 90 ? '…' : ''}
              </p>
              {doc.tags.length > 0 && (
                <div className="flex gap-[5px] mt-1.5">
                  {doc.tags.slice(0, 2).map(t => (
                    <span key={t} className="text-[10px] bg-surface-2 text-fg-tertiary rounded-[5px] px-[7px] py-0.5">{t}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-6 px-3">
              <div className="text-xl mb-1.5">🗂️</div>
              <div className="text-[12.5px] text-fg-tertiary">
                {docs.length === 0 ? 'No documents yet — create one.' : 'No documents match your search.'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className={`${editing ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
        {editing ? (
          <>
            <div className="flex flex-wrap items-center gap-2.5 px-6 py-[18px] border-b border-surface-3">
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (showForm ? handleAdd() : handleSave())}
                placeholder="Title"
                autoFocus={showForm}
                className="flex-1 min-w-[120px] bg-transparent text-[20px] font-bold text-fg-primary placeholder-fg-quaternary outline-none"
              />
              <input
                value={editTags}
                onChange={e => setEditTags(e.target.value)}
                placeholder="tags, comma, separated"
                className="w-[220px] bg-surface-2 border border-surface-3 rounded-[7px] px-[10px] py-[7px] text-xs text-fg-secondary placeholder-fg-quaternary outline-none focus:border-accent transition-colors"
              />
              <button
                onClick={showForm ? handleAdd : handleSave}
                disabled={isPending || !editTitle.trim()}
                className="px-3.5 py-2 rounded-[7px] bg-accent text-white text-[12.5px] font-semibold hover:bg-accent/90 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {showForm ? 'Create' : 'Save'}
              </button>
              <button onClick={() => { setSelected(null); setShowForm(false) }}
                className="px-3 py-2 rounded-[7px] border border-border-strong text-[12.5px] text-fg-secondary hover:bg-surface-2 transition-colors">
                Close
              </button>
            </div>
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              placeholder="Start writing..."
              className="flex-1 bg-transparent px-6 py-5 text-sm text-fg-primary placeholder-fg-quaternary outline-none resize-none leading-relaxed"
            />
            <div className="px-6 py-1.5 text-[11px] text-fg-quaternary border-t border-surface-3">
              {charCountLabel}
            </div>

            {/* AI Q&A panel */}
            {selected && (
              <div className="border-t border-surface-3 px-6 py-3.5 flex flex-col gap-2.5">
                {aiAnswer && (
                  <div className="text-[12.5px] text-fg-secondary bg-surface-2 rounded-[8px] px-3 py-2.5 whitespace-pre-line">
                    {aiAnswer}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={handleSummarise} disabled={aiAction !== null}
                    className="shrink-0 border border-border-strong rounded-[7px] px-3 py-2 text-xs text-fg-secondary hover:bg-surface-2 disabled:opacity-50 transition-colors whitespace-nowrap">
                    {aiAction === 'summarise' ? 'Summarising…' : 'Summarise'}
                  </button>
                  <input
                    value={aiQuestion}
                    onChange={e => setAiQuestion(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAsk()}
                    placeholder="Ask AI about this document..."
                    disabled={aiAction !== null}
                    className="flex-1 bg-surface-2 border border-surface-3 rounded-[7px] px-3 py-2 text-[12.5px] text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors"
                  />
                  <button
                    onClick={handleAsk}
                    disabled={aiAction !== null || !aiQuestion.trim() || !editContent}
                    className="shrink-0 bg-accent text-white rounded-[7px] px-3.5 py-2 text-xs font-semibold hover:bg-accent/90 disabled:opacity-40 transition-colors"
                  >
                    {aiAction === 'ask' ? '...' : 'Ask'}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-fg-tertiary text-[13.5px]">
            Select a document or create a new one
          </div>
        )}
      </div>
    </div>
  )
}
