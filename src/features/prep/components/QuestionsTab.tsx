'use client'

import { useMemo, useState, useTransition } from 'react'
import { ArrowLeft, BookOpen, Check, ExternalLink, Sparkles } from 'lucide-react'
import Card from '@/components/Card'
import AnswerReview, { CodeBlock, Rich } from './AnswerReview'
import MicButton, { appendText } from '@/components/MicButton'
import { modalSaveButtonClass, modalCancelButtonClass } from '@/components/Modal'
import { answerQuestion, critiqueAnswer, revealModelAnswer } from '../actions'
import { BANK_CATEGORIES, type BankCategory, type CategoryCoverage, type CategoryQuota } from '../hunt'
import { toISTDateStr } from '@/lib/date'
import type { BankQuestion, PrepSession } from '../types'
import type { Scorecard } from '../scorecard'

const DIFFICULTY_ORDER: Record<string, number> = { medium: 0, easy: 1, hard: 2 }

const isQuota = (c: CategoryCoverage | CategoryQuota): c is CategoryQuota => 'quota' in c

// Unseen first (coverage is the goal before the target date) — in the
// question's explicit sort_order when it has one (AI-native), else medium →
// easy → hard; then practiced ones, longest ago first.
function buildQueue(bank: BankQuestion[], category: string, topic: string): BankQuestion[] {
  const qs = bank.filter(q => q.category === category && (!topic || q.topics.includes(topic)))
  const unseen = qs.filter(q => !q.last_seen_at).sort((a, b) =>
    (a.sort_order ?? Infinity) - (b.sort_order ?? Infinity) ||
    (DIFFICULTY_ORDER[a.difficulty] ?? 1) - (DIFFICULTY_ORDER[b.difficulty] ?? 1) || a.title.localeCompare(b.title))
  const review = qs.filter(q => q.last_seen_at).sort((a, b) => a.last_seen_at!.localeCompare(b.last_seen_at!))
  return [...unseen, ...review]
}

const rateCls = (r: number) => r >= 8 ? 'text-good bg-good-soft' : r >= 6 ? 'text-warn bg-warn-soft' : 'text-risk bg-risk-soft'
// Answers shorter than this are "solved elsewhere" — no review needed.
const REVIEW_MIN = 40
// Coding problems keep their "Open the problem" link; no prose model answer.
const NO_MODEL_ANSWER = new Set(['algorithm', 'javascript-functions', 'ui-coding'])

const PLACEHOLDER: Record<string, string> = {
  quiz: 'Answer out loud first, then type it to get feedback (optional — saved when you hit Next)',
  'ai-native': 'Answer from real experience: the tool, the task, what the AI got wrong or right, and how YOU verified it. Saved when you hit Next.',
  angular: 'Answer out loud as if in the interview: the concept, how it works under the hood, when you use it, a trade-off or example from your Angular apps. Saved when you hit Next.',
  behavioral: 'Say it out loud first (60–120 s), then type it. Lead with the direct answer; no blame. Saved when you hit Next.',
  'code-review': 'Review it like a senior on your team: list the issues by severity (security, correctness, a11y, perf, naming), why each matters, and the fix. Saved when you hit Next.',
  backend: 'Answer out loud as a full-stack engineer: the approach, how it works, a concrete example (schema, endpoint, header), the trade-off. Saved when you hit Next.',
}
// Linkless (Prep-added) questions are answered in the app: a typed answer,
// the key points on request, and AI interviewer feedback.
const VERBAL_PLACEHOLDER: Record<string, string> = {
  quiz: 'Answer out loud, then type it — the why, not just the what. Saved when you hit Next.',
  'ui-coding': 'Build it in your editor, then summarize: component API, state, keyboard + ARIA, edge cases, trade-offs.',
  'system-design': 'Outline it (Requirements → Architecture → Data model → Interface → Optimizations), then paste or summarize here.',
}

export function QuestionsTab({ bank, setBank, topic, onTopicChange: setTopic, coverage, category: categoryParam, onCategoryChange, today, onGraded }: {
  // Owned by PrepView so Mock Round answers show up here too.
  bank: BankQuestion[]
  setBank: (fn: (prev: BankQuestion[]) => BankQuestion[]) => void
  // Owned by PrepView so the War Room's revision queue can deep-link a topic.
  topic: string
  onTopicChange: (topic: string) => void
  coverage: (CategoryCoverage | CategoryQuota)[]
  category: string | null
  onCategoryChange: (key: BankCategory) => void
  today: string
  onGraded: (session: PrepSession | null) => void
}) {
  const doneToday = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const q of bank) if (q.last_seen_at && toISTDateStr(q.last_seen_at) === today) counts[q.category] = (counts[q.category] ?? 0) + 1
    return counts
  }, [bank, today])
  const category: BankCategory = BANK_CATEGORIES.some(c => c.key === categoryParam) ? categoryParam as BankCategory : 'quiz'
  const setCategory = onCategoryChange
  // Draft is per question so a review question starts from your last saved
  // answer (the AI-native answers are meant to be refined, not retyped).
  const [draft, setDraft] = useState<{ id: string; text: string } | null>(null)
  // The question picked from the list; falls back to the top of the list.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Below xl the list and the answer panel take turns; this shows the panel.
  const [open, setOpen] = useState(false)
  // `answer` is the text that was reviewed, so an edit marks the review stale.
  const [feedback, setFeedback] = useState<{ id: string; answer: string; text: string; rating: number | null; card: Scorecard | null } | null>(null)
  // Questions answered (partly) via Speak — graded as spoken answers.
  const [spokenIds, setSpokenIds] = useState<Set<string>>(() => new Set())
  // Model answers fetched this visit; `peeked` = revealed before any review,
  // so Next saves no rating (studied, not answered).
  const [modelAnswers, setModelAnswers] = useState<Record<string, string>>({})
  const [shownAnswer, setShownAnswer] = useState<string | null>(null)
  const [peeked, setPeeked] = useState<Set<string>>(() => new Set())
  const [revealing, startReveal] = useTransition()
  const [showHints, setShowHints] = useState(false)
  const [, startTransition] = useTransition()
  const [reviewing, startReview] = useTransition()

  const topics = useMemo(() => {
    const counts = new Map<string, number>()
    for (const q of bank) if (q.category === category) for (const t of q.topics) counts.set(t, (counts.get(t) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [bank, category])
  // A topic picked under another category doesn't apply here.
  const activeTopic = topics.some(([t]) => t === topic) ? topic : ''
  const queue = useMemo(() => buildQueue(bank, category, activeTopic), [bank, category, activeTopic])
  const current = queue.find(q => q.id === selectedId) ?? queue[0] ?? null
  const answer = current && draft?.id === current.id ? draft.text : (current?.last_answer ?? '')
  const setAnswer = (text: string) => { if (current) setDraft({ id: current.id, text }) }
  const resetCard = () => { setDraft(null); setShowHints(false); setShownAnswer(null) }
  const currentFeedback = current && feedback?.id === current.id ? feedback : null
  const verbal = !!current && !current.url
  const reviewable = answer.trim().length >= REVIEW_MIN
  const stale = !!currentFeedback && currentFeedback.answer !== answer.trim()
  const peekedNow = !!current && peeked.has(current.id)
  const answerShown = !!current && shownAnswer === current.id
  // Every real answer gets reviewed before Next — unless the model answer was
  // read first, which makes this attempt study, not a rated answer.
  const needsReview = reviewable && !currentFeedback && !peekedNow
  const revealAnswer = () => {
    if (!current) return
    const id = current.id
    if (answerShown) { setShownAnswer(null); return }
    if (!currentFeedback) setPeeked(prev => new Set(prev).add(id))
    setShownAnswer(id)
    if (modelAnswers[id]) return
    startReveal(async () => {
      try { const text = await revealModelAnswer(id); setModelAnswers(prev => ({ ...prev, [id]: text })) }
      catch (e) { setModelAnswers(prev => ({ ...prev, [id]: `Couldn't load the answer: ${e instanceof Error ? e.message : 'unknown error'}` })) }
    })
  }

  const getFeedback = () => {
    if (!current || !reviewable) return
    const id = current.id
    const text = answer.trim()
    startReview(async () => {
      try {
        const r = await critiqueAnswer(id, text, spokenIds.has(id))
        setFeedback({ id, answer: text, text: r.feedback, rating: r.rating, card: r.card })
      } catch (e) {
        // A failed review mustn't block Next.
        setFeedback({ id, answer: text, text: `Review failed: ${e instanceof Error ? e.message : 'unknown error'}`, rating: null, card: null })
      }
    })
  }
  const select = (id: string) => { resetCard(); setSelectedId(id); setOpen(true) }

  const stats = (key: string) => {
    const qs = bank.filter(q => q.category === key)
    return {
      total: qs.length,
      seen: qs.filter(q => q.last_seen_at).length,
    }
  }
  const totals = BANK_CATEGORIES.reduce((acc, c) => { const s = stats(c.key); return { seen: acc.seen + s.seen, total: acc.total + s.total } }, { seen: 0, total: 0 })

  const next = () => {
    if (!current) return
    const id = current.id
    const text = answer.trim() || null
    const rating = feedback?.id === id && !peeked.has(id) ? feedback.rating : null
    const now = new Date().toISOString()
    // Move on to the question below this one in the list (as ordered now).
    const idx = queue.findIndex(q => q.id === id)
    setSelectedId((queue[idx + 1] ?? queue.find(q => q.id !== id))?.id ?? null)
    setBank(prev => prev.map(q => q.id === id ? { ...q, last_seen_at: now, last_answer: text ?? q.last_answer, ...(rating !== null ? { last_rating: rating, last_rated_at: now } : {}) } : q))
    resetCard()
    startTransition(async () => onGraded(await answerQuestion(id, text, rating)))
  }

  const quotaFor = (key: string) => { const c = coverage.find(x => x.key === key); return c && isQuota(c) ? c : null }
  const q = quotaFor(category)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-[var(--grid-gap)] items-start">
      <Card title="Sprint" action={<span className="text-[11px] text-fg-tertiary tabular-nums">{q ? `${doneToday[category] ?? 0}/${q.quota} today · ` : `${doneToday[category] ?? 0} today · `}{queue.length} questions</span>}>
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {BANK_CATEGORIES.map(c => {
            const cq = quotaFor(c.key)
            const met = cq && cq.quota > 0 && (doneToday[c.key] ?? 0) >= cq.quota
            return (
              <button key={c.key} onClick={() => { setCategory(c.key); setTopic(''); resetCard(); setSelectedId(null); setOpen(false) }} aria-pressed={category === c.key}
                className={`text-[11.5px] px-2.5 py-1 rounded-full border transition-colors ${category === c.key ? 'bg-accent-soft border-accent text-accent' : met ? 'bg-good-soft border-good/40 text-good' : 'border-border-strong text-fg-secondary hover:bg-surface-2'}`}>
                {met ? '✓ ' : ''}{c.label}{cq ? ` · ${doneToday[c.key] ?? 0}/${cq.quota}` : ''}
              </button>
            )
          })}
        </div>
        <select value={activeTopic} onChange={e => { setTopic(e.target.value); resetCard(); setSelectedId(null); setOpen(false) }} aria-label="Topic"
          className="w-full bg-surface-2 border border-surface-3 rounded-[8px] px-2.5 py-1.5 text-[12.5px] text-fg-primary outline-none mb-3">
          <option value="">All topics</option>
          {topics.map(([t, n]) => <option key={t} value={t}>{t} ({n})</option>)}
        </select>

        {!current ? (
          <div className="text-center py-8">
            <p className="text-[22px] mb-1.5">✅</p>
            <p className="text-[13px] text-fg-secondary">No questions here. Pick another category or topic.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[272px_1fr] gap-3 items-start">
            {/* Every question in this category/topic — pick what to answer. */}
            <ul className={`${open ? 'hidden xl:flex' : 'flex'} flex-col max-h-[62vh] xl:max-h-[640px] overflow-y-auto rounded-[8px] border border-border divide-y divide-border`}>
              {queue.map(q => {
                const sel = q.id === current.id
                const doneNow = !!q.last_seen_at && toISTDateStr(q.last_seen_at) === today
                return (
                  <li key={q.id}>
                    <button onClick={() => select(q.id)} aria-current={sel ? 'true' : undefined}
                      className={`w-full text-left px-2.5 py-[7px] flex items-center gap-2 transition-colors ${sel ? 'bg-accent-soft' : 'hover:bg-surface-2'}`}>
                      {doneNow
                        ? <Check size={11} strokeWidth={3} className="text-good shrink-0" />
                        : <span className={`w-[6px] h-[6px] rounded-full shrink-0 mx-[2.5px] ${q.last_seen_at ? 'bg-border-strong' : 'bg-accent'}`} title={q.last_seen_at ? 'Review' : 'New'} />}
                      <span className={`text-[12.5px] leading-snug min-w-0 flex-1 truncate ${sel ? 'text-accent font-medium' : 'text-fg-primary'}`}>{q.title}</span>
                      <span className="text-[10.5px] text-fg-tertiary tabular-nums shrink-0">{q.last_seen_at ? toISTDateStr(q.last_seen_at).slice(5) : q.difficulty[0]?.toUpperCase()}</span>
                      {q.last_rating !== null && <span className={`text-[10.5px] font-bold tabular-nums rounded-[4px] px-1 shrink-0 ${rateCls(q.last_rating)}`}>{q.last_rating}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className={`${open ? '' : 'hidden xl:block'} min-w-0`}>
              <div className="flex items-baseline justify-between gap-2 mb-1.5">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.4px] text-fg-tertiary min-w-0">
                  {current.last_seen_at ? `Review · last ${toISTDateStr(current.last_seen_at).slice(5)}` : 'New'} · {current.difficulty}{current.topics.length ? ` · ${current.topics.join(', ')}` : ''}
                </p>
                <button onClick={() => setOpen(false)} className="xl:hidden text-[11.5px] text-accent inline-flex items-center gap-1 shrink-0"><ArrowLeft size={12} /> All questions</button>
              </div>
              <p className="text-[15px] font-semibold text-fg-primary leading-snug">{current.title}</p>
              {current.body && <CodeBlock code={current.body} />}
              <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={category === 'code-review' ? 9 : verbal ? 7 : category === 'quiz' ? 4 : 3}
                placeholder={PLACEHOLDER[category] ?? (verbal ? VERBAL_PLACEHOLDER[category] : null) ?? 'Approach / complexity / trade-offs (optional)'}
                className="mt-3 w-full bg-surface-2 border border-surface-3 rounded-[8px] px-3 py-2 text-[13px] text-fg-primary outline-none focus:border-accent resize-y" />
              <div className="flex items-center justify-between gap-2 mt-2">
                {current.url ? (
                  <a href={current.url} target="_blank" rel="noopener noreferrer"
                    className="text-[12px] text-accent hover:underline inline-flex items-center gap-1">
                    {category === 'quiz' ? 'Check the answer' : 'Open the problem'} <ExternalLink size={11} />
                  </a>
                ) : current.answer_hints ? (
                  <button onClick={() => setShowHints(v => !v)} className="text-[11.5px] text-accent hover:underline">{showHints ? 'Hide' : 'Show'} {category === 'quiz' ? 'key points' : category === 'ui-coding' ? 'requirements' : 'expected areas'}</button>
                ) : <span />}
                <span className="inline-flex items-center gap-2 min-w-0">
                  <MicButton key={current.id} onText={text => { setAnswer(appendText(answer, text)); setSpokenIds(prev => new Set(prev).add(current.id)) }} />
                  <span className="text-[11px] text-fg-tertiary tabular-nums shrink-0">{answer.trim().split(/\s+/).filter(Boolean).length} words{verbal ? ' · aim for ~200' : ''}</span>
                </span>
              </div>
              {showHints && current.answer_hints && <p className="text-[12px] text-fg-secondary mt-1.5">Cover: {current.answer_hints}</p>}
              {reviewing && <div className="space-y-2 mt-3">{[90, 70, 80].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}</div>}
              {currentFeedback && !reviewing && <AnswerReview card={currentFeedback.card} text={currentFeedback.text} rating={currentFeedback.rating} stale={stale} question={current.title} />}
              {answerShown && (
                <div className="mt-3 rounded-[10px] border border-border bg-surface-2 px-3 py-2.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.4px] text-fg-tertiary inline-flex items-center gap-1">
                    <BookOpen size={11} /> Model answer{category === 'behavioral' || category === 'ai-native' ? ' · an example — adapt it to your own experience' : ''}
                    {peekedNow && !currentFeedback && <span className="normal-case tracking-normal font-normal text-warn"> · read before answering: this attempt won&apos;t be rated</span>}
                  </p>
                  {revealing && !modelAnswers[current.id]
                    ? <div className="space-y-1.5 mt-2">{[92, 80, 86, 60].map((w, i) => <div key={i} className="h-2.5 rounded bg-surface-1 animate-pulse" style={{ width: `${w}%` }} />)}</div>
                    : <p className="text-[12.5px] text-fg-primary leading-relaxed whitespace-pre-wrap mt-1"><Rich text={modelAnswers[current.id] ?? ''} /></p>}
                </div>
              )}
              <div className="flex items-center gap-2 mt-3">
                {!NO_MODEL_ANSWER.has(category) && (
                  <button onClick={revealAnswer} disabled={revealing} title={currentFeedback ? 'Compare with a model answer' : 'Reading it first means this attempt won\'t be rated'}
                    className={`${modalCancelButtonClass} inline-flex items-center gap-1.5 !py-[7px] shrink-0`}>
                    <BookOpen size={13} /> {answerShown ? 'Hide answer' : 'Answer'}
                  </button>
                )}
                <span className="text-[11px] text-fg-tertiary min-w-0">
                  {stale && reviewable ? <button onClick={getFeedback} disabled={reviewing} className="text-accent hover:underline inline-flex items-center gap-1"><Sparkles size={11} /> Re-review edited answer</button>
                    : needsReview ? 'AI review runs before Next' : peekedNow && !currentFeedback ? 'Studied — not rated' : !reviewable && !currentFeedback ? 'Type a few sentences to get an AI review' : null}
                </span>
                {needsReview || reviewing ? (
                  <button onClick={getFeedback} disabled={reviewing} className={`${modalSaveButtonClass} inline-flex items-center gap-1.5 !py-[7px] ml-auto`}>
                    <Sparkles size={13} /> {reviewing ? 'Reviewing…' : 'Review'}
                  </button>
                ) : (
                  <button onClick={next} className={`${modalSaveButtonClass} !py-[7px] ml-auto`}>Next →</button>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card title="Coverage" action={<span className="text-[11px] text-fg-tertiary tabular-nums">{totals.seen}/{totals.total} seen</span>}>
        <ul className="flex flex-col gap-2.5">
          {BANK_CATEGORIES.map(c => {
            const s = stats(c.key)
            const cq = quotaFor(c.key)
            return (
              <li key={c.key}>
                <button onClick={() => { setCategory(c.key); setSelectedId(null); setOpen(false) }} className="w-full text-left">
                  <div className="flex items-baseline justify-between text-[12.5px] gap-2">
                    <span className="font-medium text-fg-primary">{c.label}</span>
                    <span className="text-[11px] text-fg-tertiary tabular-nums">{s.seen}/{s.total} · {s.total ? Math.round((s.seen / s.total) * 100) : 0}%</span>
                  </div>
                  <div className="h-[5px] rounded-[3px] bg-border mt-1 flex overflow-hidden">
                    <div className="h-full bg-good" style={{ width: `${s.total ? (s.seen / s.total) * 100 : 0}%` }} />
                  </div>
                  {cq && cq.quota > 0 && <p className="text-[10.5px] text-fg-tertiary mt-0.5 tabular-nums">{cq.quota}/day today</p>}
                </button>
              </li>
            )
          })}
        </ul>
        <p className="text-[10.5px] text-fg-tertiary mt-3">Includes questions completed in Coding. Today: {today}.</p>
      </Card>
    </div>
  )
}
