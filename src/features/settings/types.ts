export type ReminderSlot = 'morning' | 'evening'

export interface Reminder {
  id: string
  user_id: string
  module: string
  label: string
  slot: ReminderSlot
  active: boolean
  created_at: string
}

export const REMINDER_MODULES = [
  'planner', 'career', 'finance', 'health', 'learning', 'coding', 'documents',
] as const
