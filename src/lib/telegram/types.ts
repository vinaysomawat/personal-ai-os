export interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: { id: number; first_name: string; username?: string }
    chat: { id: number; type: string }
    text?: string
    caption?: string
    date: number
    voice?: { file_id: string; duration: number; mime_type?: string }
    photo?: { file_id: string; width: number; height: number; file_size?: number }[]
  }
  callback_query?: {
    id: string
    from: { id: number; first_name: string; username?: string }
    message?: {
      message_id: number
      chat: { id: number; type: string }
    }
    data?: string
  }
}

export interface InlineButton {
  text: string
  callback_data: string
}

// A module's execute() usually just returns reply text. Returning the object
// form additionally attaches inline keyboard buttons to the Telegram message.
export type ModuleReply = string | { text: string; buttons?: InlineButton[][] }
