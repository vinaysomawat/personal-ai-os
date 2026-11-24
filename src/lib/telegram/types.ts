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
  // An answer to a non-anonymous poll (quiz MCQs). Carries no chat — only the
  // user who answered — so the allowed-chat gate must check user.id (equal to
  // the chat id in a private chat).
  poll_answer?: {
    poll_id: string
    user?: { id: number; first_name: string; username?: string }
    // Indices into the poll's options; empty when the vote was retracted
    // (not possible on quiz polls, but the type allows it).
    option_ids: number[]
  }
}

// Body for Telegram's sendPoll as a quiz poll. Limits: question 1–300 chars,
// 2–10 options of 1–100 chars, explanation 0–200 chars (shown after
// answering).
export interface QuizPollParams {
  chat_id: number | string
  question: string
  options: { text: string }[]
  type: 'quiz'
  is_anonymous: false
  correct_option_id: number
  explanation?: string
}

// The part of sendPoll's returned Message you need: poll.id is what a later
// poll_answer update refers to.
export interface SentPollMessage {
  message_id: number
  poll: { id: string; question: string }
}

export interface InlineButton {
  text: string
  callback_data: string
}

// A module's execute() usually just returns reply text. Returning the object
// form additionally attaches inline keyboard buttons to the Telegram message.
export type ModuleReply = string | { text: string; buttons?: InlineButton[][] }
