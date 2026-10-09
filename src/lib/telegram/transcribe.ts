import { transcribeAudio } from '@/lib/transcribe'

export async function transcribeVoice(botToken: string, fileId: string): Promise<string> {
  // 1. Get the file path from Telegram
  const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`)
  const fileJson = await fileRes.json() as { ok: boolean; result?: { file_path: string } }
  if (!fileJson.ok || !fileJson.result?.file_path) throw new Error('Failed to get file path')

  // 2. Download the ogg audio
  const audioRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${fileJson.result.file_path}`)
  if (!audioRes.ok) throw new Error('Failed to download voice file')
  const audioBuffer = await audioRes.arrayBuffer()

  // 3. Transcribe with Groq Whisper
  return transcribeAudio(new Blob([audioBuffer], { type: 'audio/ogg' }), 'voice.ogg')
}
