import { useState } from 'react'
import type { Employee } from './data'

export type SortKey = keyof Employee
export type SortDir = 'asc' | 'desc'

export function useTable(rows: Employee[], pageSize = 10) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)

  const filtered = rows.filter(r =>
    r.name.toLowerCase().includes(query.toLowerCase()) || r.team.toLowerCase().includes(query.toLowerCase()),
  )

  const sorted = filtered.sort((a, b) => {
    const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]))
    return sortDir === 'asc' ? cmp : -cmp
  })

  const pageCount = Math.floor(sorted.length / pageSize)
  const pageRows = sorted.slice(page * pageSize, page * pageSize + pageSize)

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return { pageRows, page, pageCount, setPage, query, setQuery, sortKey, sortDir, toggleSort, total: sorted.length }
}
