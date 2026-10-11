import { useRef, useState } from 'react'
import { uploadFile } from './upload'

type Upload = { id: string; name: string; size: number; progress: number; status: 'uploading' | 'done' | 'error'; error?: string }

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export function App() {
  const [uploads, setUploads] = useState<Upload[]>([])
  const [over, setOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function addFiles(files: FileList | null) {
    if (!files) return
    const accepted: { item: Upload; file: File }[] = []
    for (const file of Array.from(files)) {
      if (file.size / 1024 > MAX_BYTES) {
        alert(`${file.name} is larger than 5 MB`)
        continue
      }
      accepted.push({ item: { id: crypto.randomUUID(), name: file.name, size: file.size, progress: 0, status: 'uploading' }, file })
    }
    setUploads([...uploads, ...accepted.map(a => a.item)])
    for (const { item, file } of accepted) start(item, file)
  }

  function start(item: Upload, file: File) {
    uploadFile(file, progress => {
      setUploads(uploads.map(u => (u.id === item.id ? { ...u, progress } : u)))
    })
      .then(() => setUploads(prev => prev.map(u => (u.id === item.id ? { ...u, status: 'done', progress: 100 } : u))))
      .catch(err => setUploads(prev => prev.map(u => (u.id === item.id ? { ...u, status: 'error', error: err.message } : u))))
  }

  return (
    <main>
      <h1>Upload files</h1>
      <div
        className={`drop ${over ? 'over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files) }}
      >
        Drop files here or click to choose (max 5 MB each)
      </div>
      <input ref={inputRef} type="file" multiple hidden onChange={e => addFiles(e.target.files)} />

      <ul className="files">
        {uploads.map(u => (
          <li key={u.id}>
            <div>{u.name} — {(u.size / 1024 / 1024).toFixed(1)} MB — {u.status === 'done' ? 'Done' : u.status === 'error' ? 'Failed' : `${u.progress}%`}</div>
            <div className="bar"><div style={{ width: `${u.progress}%` }} /></div>
            {u.error && <div className="err">{u.error}</div>}
          </li>
        ))}
      </ul>
    </main>
  )
}
