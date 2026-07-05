export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-3 w-32 bg-surface-2 rounded animate-pulse" />
        <div className="h-7 w-64 bg-surface-2 rounded animate-pulse" />
        <div className="h-4 w-80 bg-surface-2 rounded animate-pulse" />
      </div>
      <div className="h-14 bg-surface-2 rounded-xl animate-pulse" />
      <ul className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="h-20 bg-surface-1 border border-surface-3 rounded-xl animate-pulse" />
        ))}
      </ul>
    </div>
  )
}
