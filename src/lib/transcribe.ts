// Groq Whisper speech-to-text — shared by Telegram voice notes and the web
// app's mic button (voice mode). Needs GROQ_API_KEY.
export async function transcribeAudio(audio: Blob, filename: string, opts: { language?: string; prompt?: string } = {}): Promise<string> {
  const formData = new FormData()
  formData.append('file', audio, filename)
  formData.append('model', 'whisper-large-v3-turbo')
  if (opts.language) formData.append('language', opts.language)
  // Vocabulary hint so technical terms come back spelled right.
  if (opts.prompt) formData.append('prompt', opts.prompt)

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: formData,
  })
  if (!res.ok) throw new Error(`Groq Whisper error: ${await res.text()}`)
  const json = await res.json() as { text: string }
  return json.text.trim()
}
