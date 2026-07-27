export default function FilterPill({ label, active, onClick, activeClassName = 'bg-accent text-white' }: { label: string; active: boolean; onClick: () => void; activeClassName?: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        active ? activeClassName : 'bg-surface-1 border border-surface-3 text-fg-secondary hover:bg-surface-2'
      }`}
    >
      {label}
    </button>
  )
}
