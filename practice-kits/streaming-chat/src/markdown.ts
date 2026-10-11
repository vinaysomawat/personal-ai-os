// Tiny markdown renderer: **bold** and line breaks only.
export function toHtml(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />')
}
