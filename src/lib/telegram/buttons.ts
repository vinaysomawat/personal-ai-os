import type { InlineButton } from './types'

// Tables an "↩️ Undo" button is allowed to delete from — an explicit
// allowlist even though the chat is already gated to a single user
// (TELEGRAM_ALLOWED_CHAT_ID), so a malformed callback_data can't attempt an
// arbitrary table delete.
export const UNDOABLE_TABLES = [
  'tasks', 'applications', 'expenses', 'loans', 'investments',
  'recurring_expenses', 'workouts', 'resources', 'documents',
] as const
export type UndoableTable = typeof UNDOABLE_TABLES[number]

// Encodes the specific row id, not "most recent" — unlike the undo_last text
// command, a button can be tapped anytime later, possibly after newer rows
// were added, so it must target the exact row it was attached to.
export function undoButton(table: UndoableTable, id: string): InlineButton {
  return { text: '↩️ Undo', callback_data: `undo:${table}:${id}` }
}

export function isUndoableTable(t: string): t is UndoableTable {
  return (UNDOABLE_TABLES as readonly string[]).includes(t)
}

// Human-readable label for the "🗑️ Undone: X" confirmation toast.
export const UNDO_LABEL: Record<UndoableTable, (row: Record<string, unknown>) => string> = {
  tasks: r => String(r.text ?? 'task'),
  applications: r => String(r.company ?? 'application'),
  expenses: r => String(r.description ?? r.category ?? 'expense'),
  loans: r => String(r.name ?? 'loan'),
  investments: r => String(r.name ?? 'investment'),
  recurring_expenses: r => String(r.name ?? 'recurring expense'),
  workouts: r => String(r.type ?? 'workout'),
  resources: r => String(r.title ?? 'resource'),
  documents: r => String(r.title ?? 'document'),
}
