export interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: { id: number; first_name: string; username?: string }
    chat: { id: number; type: string }
    text?: string
    date: number
    voice?: { file_id: string; duration: number; mime_type?: string }
  }
}
