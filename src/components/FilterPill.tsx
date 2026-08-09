export default function FilterPill({ label, active, onClick, activeClassName = 'bg-accent text-white' }: { label: string; active: boolean; onClick: () => void; activeClassName?: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-[11.5px] font-medium transition-colors border ${
        active ? `border-transparent ${activeClassName}` : 'bg-surface-2 border-surface-3 text-fg-secondary hover:bg-surface-3'
      }`}
    >
      {label}
    </button>
  )
}
