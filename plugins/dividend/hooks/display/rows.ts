// The session card: rows of a label, a figure and a short note. It is printed as plain text, so a
// transcript row keeps the figures it was printed with, and drawn back from that text. Pure, no `$`.

export type Row = { label: string; value: string; note?: string }

export const CARD_TITLE = 'Dividend · this session'

const NOTE_MARK = ' — '
const BAR_CELLS = 10

export const cardText = (rows: Row[]): string =>
  [CARD_TITLE, ...rows.map(row => `${row.label}: ${row.value}${row.note ? `${NOTE_MARK}${row.note}` : ''}`)].join('\n')

// The rows back from the text; null for text that is no card.
export const cardRows = (text: string): Row[] | null => {
  const [title, ...lines] = text.replace(/^dividend:\s*/, '').trim().split('\n')
  if (title !== CARD_TITLE) return null
  return lines.flatMap(line => {
    const colon = line.indexOf(': ')
    if (colon <= 0) return []
    const label = line.slice(0, colon)
    const rest = line.slice(colon + 2)
    const mark = rest.indexOf(NOTE_MARK)
    return [mark < 0 ? { label, value: rest } : { label, value: rest.slice(0, mark), note: rest.slice(mark + NOTE_MARK.length) }]
  })
}

// What is left of something, in ten cells.
export const bar = (left: number): string => {
  const cells = Math.max(0, Math.min(BAR_CELLS, Math.round(left * BAR_CELLS)))
  return `${'▰'.repeat(cells)}${'▱'.repeat(BAR_CELLS - cells)}`
}

// A value split into its text and its bar's cells, so the bar can be drawn in colour.
export const valueParts = (value: string): { text: string; kind: 'text' | 'left' | 'gone' }[] =>
  value
    .split(/(▰+|▱+)/)
    .filter(part => part !== '')
    .map(part => ({ text: part, kind: part.startsWith('▰') ? 'left' : part.startsWith('▱') ? 'gone' : 'text' }))
