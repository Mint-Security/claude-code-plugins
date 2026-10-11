import { expect, test } from 'claude-code/testing'

import { bar, cardRows, cardText, valueParts } from '../hooks/display/rows'

test('a card is printed as text and read back from it, with or without the plugin name in front', () => {
  const rows = [
    { label: 'Each message carries', value: '297k tokens', note: '30% of the 1.0M window' },
    { label: 'Last compaction', value: '9:12 PM', note: 'kept: Goal: ship it — then tag' },
    { label: 'Instruction files', value: '0' }
  ]
  const text = cardText(rows)
  expect(text.split('\n')[0]).toBe('Dividend · this session')
  expect(cardRows(text)).toEqual(rows)
  expect(cardRows(`dividend: ${text}`)).toEqual(rows)
  expect(cardRows('This session\nContext 30%')).toBeNull()
})

test('a bar shows what is left in ten cells, drawn apart from the text around it', () => {
  expect(bar(1)).toBe('▰▰▰▰▰▰▰▰▰▰')
  expect(bar(0.34)).toBe('▰▰▰▱▱▱▱▱▱▱')
  expect(bar(-1)).toBe('▱▱▱▱▱▱▱▱▱▱')
  expect(valueParts('warm until 9:41 PM ▰▰▱')).toEqual([
    { text: 'warm until 9:41 PM ', kind: 'text' },
    { text: '▰▰', kind: 'left' },
    { text: '▱', kind: 'gone' }
  ])
})
