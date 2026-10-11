import { useEffect, useState } from 'react'

// Returns `value`, updated only after it has stopped changing for `delay` ms.
export function useDebounce<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    setTimeout(() => setDebounced(value), delay)
  }, [value, delay])

  return debounced
}
