// Delivery stats for a spoken answer — the Telegram voice drill and the web
// mic button. Whisper tends to drop "um"/"uh", so fillers undercount those.
const FILLERS = /\b(um+|uh+|erm|like|basically|actually|you know|sort of|kind of|i mean)\b/gi
export const SPEAKING_WPM = 140

export function speechStats(text: string): { words: number; seconds: number; fillers: number } {
  const words = text.split(/\s+/).filter(Boolean).length
  return { words, seconds: Math.round((words / SPEAKING_WPM) * 60), fillers: (text.match(FILLERS) ?? []).length }
}
