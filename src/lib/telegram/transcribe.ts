export async function transcribeVoice(botToken: string, fileId: string): Promise<string> {
  // 1. Get the file path from Telegram
  const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`)
  const fileJson = await fileRes.json() as { ok: boolean; result?: { file_path: string } }
  if (!fileJson.ok || !fileJson.result?.file_path) throw new Error('Failed to get file path')

  // 2. Download the ogg audio
  const audioRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${fileJson.result.file_path}`)
  if (!audioRes.ok) throw new Error('Failed to download voice file')
  const audioBuffer = await audioRes.arrayBuffer()

  // 3. Send to Whisper via OpenAI
  const formData = new FormData()
  formData.append('file', new Blob([audioBuffer], { type: 'audio/ogg' }), 'voice.ogg')
  formData.append('model', 'whisper-large-v3-turbo')

  const whisperRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: formData,
  })

  if (!whisperRes.ok) {
    const err = await whisperRes.text()
    throw new Error(`Groq Whisper error: ${err}`)
  }

  const whisperJson = await whisperRes.json() as { text: string }
  return whisperJson.text.trim()
}
