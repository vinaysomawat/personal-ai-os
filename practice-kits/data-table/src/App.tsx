import { EMPLOYEES, type Employee } from './data'
import { useTable, type SortKey } from './useTable'

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'team', label: 'Team' },
  { key: 'salary', label: 'Salary' },
  { key: 'startDate', label: 'Start date' },
]

const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

export function App() {
  const t = useTable(EMPLOYEES)

  return (
    <main>
      <h1>Employees</h1>
      <div className="toolbar">
        <input value={t.query} onChange={e => t.setQuery(e.target.value)} placeholder="Filter by name or team" />
        <span>{t.total} rows</span>
      </div>

      <table>
        <thead>
          <tr>
            {COLUMNS.map(c => (
              <th key={c.key}>
                <div className="sortable" onClick={() => t.toggleSort(c.key)}>
                  {c.label} {t.sortKey === c.key ? (t.sortDir === 'asc' ? '▲' : '▼') : ''}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {t.pageRows.length === 0 ? (
            <tr><td colSpan={4}>No rows</td></tr>
          ) : (
            t.pageRows.map((r: Employee) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.team}</td>
                <td>{money(r.salary)}</td>
                <td>{r.startDate}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="pager">
        <button onClick={() => t.setPage(t.page - 1)} disabled={t.page === 0}>Previous</button>
        <span>Page {t.page + 1} of {t.pageCount}</span>
        <button onClick={() => t.setPage(t.page + 1)} disabled={t.page >= t.pageCount - 1}>Next</button>
      </div>
    </main>
  )
}
