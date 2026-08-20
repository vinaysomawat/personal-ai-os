export default function PageTabs<T extends string>({ tabs, active, onChange }: {
  tabs: { key: T; label: string }[]
  active: T
  onChange: (key: T) => void
}) {
  return (
    <div className="flex items-center gap-1 border-b border-surface-3 overflow-x-auto">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`shrink-0 whitespace-nowrap px-3.5 py-2 text-[13px] font-semibold border-b-2 -mb-px transition-colors ${
            active === t.key ? 'border-accent text-fg-primary' : 'border-transparent text-fg-tertiary hover:text-fg-secondary'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
