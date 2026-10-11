import { useState } from 'react'
import { Autocomplete } from './Autocomplete'
import type { City } from './cities'

export function App() {
  const [picked, setPicked] = useState<City | null>(null)
  return (
    <main>
      <h1>Pick a city</h1>
      <Autocomplete onSelect={setPicked} />
      <p className="hint">Open DevTools → Network while typing.</p>
      {picked && <p>Selected: <strong>{picked.name}</strong> ({picked.country})</p>}
    </main>
  )
}
