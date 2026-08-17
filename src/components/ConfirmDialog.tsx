import Modal, { modalCancelButtonClass } from './Modal'

interface ConfirmDialogProps {
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ title, description, confirmLabel = 'Delete', onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      maxWidthClass="max-w-[380px]"
      footer={
        <>
          <button onClick={onCancel} className={modalCancelButtonClass}>Cancel</button>
          <button
            onClick={onConfirm}
            className="bg-risk rounded-[8px] px-[18px] py-[9px] text-[13px] font-bold text-white hover:bg-risk-strong transition-colors"
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-[13px] text-fg-secondary leading-relaxed">{description}</p>
    </Modal>
  )
}
