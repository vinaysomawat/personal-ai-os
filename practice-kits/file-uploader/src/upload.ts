// Uploads one file with progress. Resolves when the request finishes.
export function uploadFile(file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload')
    xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name))
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total) * 100)
    }
    xhr.onload = () => resolve()
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.send(file)
  })
}
