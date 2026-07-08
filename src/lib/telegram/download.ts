export interface DownloadedFile {
  base64: string
  mediaType: string
}

export async function downloadTelegramFile(botToken: string, fileId: string): Promise<DownloadedFile> {
  const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`)
  const fileJson = await fileRes.json() as { ok: boolean; result?: { file_path: string } }
  if (!fileJson.ok || !fileJson.result?.file_path) throw new Error('Failed to get file path')

  const filePath = fileJson.result.file_path
  const contentRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`)
  if (!contentRes.ok) throw new Error('Failed to download file')
  const buffer = await contentRes.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')

  const ext = filePath.split('.').pop()?.toLowerCase()
  const mediaType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg'

  return { base64, mediaType }
}
