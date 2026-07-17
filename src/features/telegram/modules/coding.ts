import type { SupabaseClient } from '@supabase/supabase-js'
import type { ModuleReply } from '@/lib/telegram/types'
import { generateAssignmentForUser, getTodayAssignmentRows } from '@/features/coding/daily-core'
import { generateTrendingReadingForUser, markTrendingReadingComplete } from '@/features/trending/core'

export const SYSTEM_PROMPT = `You are the Coding bot for Personal OS. Parse the user message and return ONLY a JSON action.

Actions:
{"action":"today_question"}
{"action":"complete_question","search":"partial question title"}
{"action":"today_reading"}
{"action":"complete_reading"}
{"action":"ask","question":"free-form coding/concept question"}
{"action":"undo_last"}
{"action":"help"}

Rules:
- For "today's question", "what's my coding challenge" → today_question
- For "solved X", "finished X", "done with X" → complete_question
- For "today's reading", "trending article", "what should I read" → today_reading
- For "read the article", "finished reading", "done with the article" → complete_reading
- For "explain X", "what's the difference between X and Y", "how do I approach X" → ask with the question
- For "undo that", "I didn't actually finish it", "mark that back as not done" → undo_last`

export async function execute(action: Record<string, unknown>, db: SupabaseClient, userId: string): Promise<ModuleReply> {
  switch (action.action) {
    case 'today_question': {
      const rows = await generateAssignmentForUser(db, userId)
      if (rows.length === 0) return `🧘 No new questions today — it's a revision day (or your pool is empty).`
      const DE: Record<string, string> = { easy: '🟢', medium: '🟡', hard: '🔴' }
      return `💻 *Today's Coding Challenge:*\n\n` + rows.map(r =>
        `${r.completed ? '✅' : DE[r.question.difficulty] ?? ''} *${r.question.title}* _(${r.question.difficulty})_${r.completed ? ' — done' : ''}\n${r.question.url}`
      ).join('\n\n')
    }
    case 'complete_question': {
      const rows = await getTodayAssignmentRows(db, userId)
      const search = String(action.search ?? '').toLowerCase()
      const match = rows.find(r => r.question.title.toLowerCase().includes(search) || search.includes(r.question.title.toLowerCase()))
      if (!match) return `❌ No question matching "${action.search}" in today's assignment.`
      if (match.completed) return `Already marked *${match.question.title}* as done! 🎉`
      await db.from('coding_daily_questions').update({ completed: true, completed_at: new Date().toISOString() }).eq('id', match.id)
      if (match.task_id) await db.from('tasks').update({ done: true }).eq('id', match.task_id)
      return `🎉 Nice work! Marked *${match.question.title}* as solved.`
    }
    case 'today_reading': {
      const reading = await generateTrendingReadingForUser(db, userId)
      if (!reading) return `📰 No system design article available today.`
      return `📰 *Daily Tech Read:*${reading.completed ? ' (done)' : ''}\n\n${reading.title}${reading.points ? ` _(${reading.points} pts)_` : ''}\n${reading.url}`
    }
    case 'complete_reading': {
      const { getTodayTrendingReading } = await import('@/features/trending/core')
      const reading = await getTodayTrendingReading(db, userId)
      if (!reading) return `❌ No reading assigned today yet — try "today's reading" first.`
      if (reading.completed) return `Already marked *${reading.title}* as read! 🎉`
      await markTrendingReadingComplete(db, reading.id)
      return `🎉 Nice — marked *${reading.title}* as read.`
    }
    case 'ask': {
      const { askCodingMentor } = await import('@/features/ai/coding-mentor')
      const { computeCodingStats } = await import('@/features/coding/daily-core')
      const [statsRes, questionsRes, readingsRes] = await Promise.all([
        computeCodingStats(db, userId),
        db.from('coding_daily_questions').select('question:coding_questions(title)').eq('user_id', userId).eq('completed', true).order('completed_at', { ascending: false }).limit(5),
        db.from('trending_readings').select('title').eq('user_id', userId).eq('completed', true).order('completed_at', { ascending: false }).limit(5),
      ])
      const recentSolved = (questionsRes.data ?? []).map((r) => (r.question as unknown as { title: string } | null)?.title).filter((t): t is string => !!t)
      const recentReading = (readingsRes.data ?? []).map(r => r.title)
      const answer = await askCodingMentor(String(action.question), { recentSolved, currentStreakDays: statsRes.currentStreak, recentReading })
      return `🧑‍💻 *Coding Mentor:*\n\n${answer}`
    }
    case 'undo_last': {
      const [lastQuestion, lastReading] = await Promise.all([
        db.from('coding_daily_questions').select('id, completed_at, question:coding_questions(title)').eq('user_id', userId).eq('completed', true).order('completed_at', { ascending: false }).limit(1).maybeSingle(),
        db.from('trending_readings').select('id, completed_at, title').eq('user_id', userId).eq('completed', true).order('completed_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      const q = lastQuestion.data
      const r = lastReading.data
      if (!q && !r) return `❌ Nothing recent to undo.`
      const qTime = q?.completed_at ? new Date(q.completed_at).getTime() : -1
      const rTime = r?.completed_at ? new Date(r.completed_at).getTime() : -1
      if (qTime >= rTime && q) {
        await db.from('coding_daily_questions').update({ completed: false, completed_at: null }).eq('id', q.id)
        const title = (q.question as unknown as { title: string } | null)?.title ?? 'question'
        return `🗑️ Undone: *${title}* marked back as not solved.`
      }
      await db.from('trending_readings').update({ completed: false, completed_at: null }).eq('id', r!.id)
      return `🗑️ Undone: *${r!.title}* marked back as unread.`
    }
    default:
      return `*Coding Bot — What I can do:*\n• "today's question"\n• "solved Two Sum"\n• "today's reading"\n• "finished reading"\n• "explain closures in JS"\n• "undo that"`
  }
}
