import { type ReactNode } from 'react'

export const modalLabelClass = 'block text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-[5px]'

export function modalInputClass(invalid?: boolean): string {
  return `w-full bg-surface-2 border rounded-[8px] px-[11px] py-[9px] text-[13px] text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors ${invalid ? 'border-red-500' : 'border-surface-3'}`
}

export const modalSelectClass = 'w-full bg-surface-2 border border-surface-3 rounded-[8px] px-[11px] py-[9px] text-[13px] text-fg-primary outline-none focus:border-accent transition-colors'

export const modalCancelButtonClass = 'border border-border-strong rounded-[8px] px-4 py-[9px] text-[13px] text-fg-secondary hover:bg-surface-2 transition-colors'

export const modalSaveButtonClass = 'bg-accent rounded-[8px] px-[18px] py-[9px] text-[13px] font-bold text-white hover:bg-accent/90 disabled:opacity-50 transition-colors'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

export default function Modal({ title, onClose, children, footer }: ModalProps) {
  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div
        className="bg-surface-1 border border-surface-3 rounded-2xl p-6 w-full max-w-[440px] max-h-[85vh] overflow-y-auto shadow-popover animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-[18px]">
          <h2 className="text-base font-bold text-fg-primary">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-[18px] leading-none text-fg-tertiary hover:text-fg-secondary">✕</button>
        </div>
        {children}
        {footer && <div className="flex justify-end gap-2.5 mt-5">{footer}</div>}
      </div>
    </div>
  )
}
