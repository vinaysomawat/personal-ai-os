import { useEffect, useState } from 'react'
import type { City } from './cities'
import { useDebounce } from './useDebounce'

export function Autocomplete({ onSelect }: { onSelect: (c: City) => void }) {
  const [text, setText] = useState('')
  const [results, setResults] = useState<City[]>([])
  const [active, setActive] = useState(-1)
  const [open, setOpen] = useState(false)
  const query = useDebounce(text, 250)

  useEffect(() => {
    if (!query) {
      setResults([])
      return
    }
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .then((data: { results: City[] }) => {
        setResults(data.results)
        setOpen(true)
        setActive(-1)
      })
  }, [query])

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') setActive(a => a + 1)
    if (e.key === 'ArrowUp') setActive(a => a - 1)
    if (e.key === 'Enter') {
      const city = results[active]
      onSelect(city)
      setText(city.name)
      setOpen(false)
    }
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className="ac">
      <input
        value={text}
        placeholder="Search a city"
        onChange={e => setText(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {open && results.length > 0 && (
        <ul>
          {results.map((c, i) => (
            <li
              key={c.id}
              className={i === active ? 'active' : ''}
              onClick={() => { onSelect(c); setText(c.name); setOpen(false) }}
            >
              {c.name}, {c.country}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
