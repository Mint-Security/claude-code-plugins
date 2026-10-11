import { expect, test } from 'claude-code/testing'

import { breakpointTip, compactionBrief, duplicateInstructions, dupesTip, growthTip, rereadTip } from '../hooks/tips/context'

test('a turn that added 50k+ tokens is put down to the tool output that did most of it', () => {
  const outputs = [
    { tool: 'Bash', label: 'a Bash run of npm', chars: 160_000 },
    { tool: 'Read', label: 'reading src/app.ts', chars: 40_000 },
  ]
  const tip = growthTip({ added: 62_000, outputs, sessionKey: 's1' })
  expect(tip).toMatchObject({ id: 'tip:growth:s1:Bash', kind: 'growth', title: 'That turn added 62k tokens to the conversation' })
  expect(tip?.body.startsWith('About 40k of it came from a Bash run of npm, and every later message carries it. Next time, pipe long output through tail or grep')).toBe(true)
  expect(growthTip({ added: 49_000, outputs, sessionKey: 's1' })).toBeNull()
  expect(growthTip({ added: 55_000, outputs: [], sessionKey: 's1' })).toBeNull()
  expect(growthTip({ added: 60_000, outputs: [{ tool: 'Bash', label: 'a Bash run', chars: 4_000 }], sessionKey: 's1' })).toBeNull()
  expect(growthTip({ added: 55_000, outputs: [{ tool: 'mcp__linear__list', label: 'the linear MCP server', chars: 90_000 }], sessionKey: 's1' })?.id).toBe('tip:growth:s1:mcp')
})

test('finished work in a big conversation is a moment to compact, with the button', () => {
  const tip = breakpointTip({ breakpoint: 'commit', context: 80_000, sessionKey: 's1' })
  expect(tip).toMatchObject({ id: 'tip:breakpoint:s1', kind: 'breakpoint', title: 'A good moment to compact', action: 'compact' })
  expect(tip?.body.startsWith('You just committed, with 80k tokens in the conversation.')).toBe(true)
  expect(breakpointTip({ breakpoint: 'tests', context: 80_000, sessionKey: 's1' })?.body.startsWith('You just got the tests passing')).toBe(true)
  expect(breakpointTip({ breakpoint: 'commit', context: 50_000, sessionKey: 's1' })).toBeNull()
  expect(breakpointTip({ breakpoint: null, context: 80_000, sessionKey: 's1' })).toBeNull()
})

test('a file read whole three times is named, with what each copy costs', () => {
  const tip = rereadTip({ name: 'src/app.ts', count: 3, chars: 24_000, sessionKey: 's1' })
  expect(tip).toMatchObject({ id: 'tip:reread:s1', kind: 'reread', title: 'src/app.ts was read 3 times this session' })
  expect(tip?.body).toContain('about 6.0k tokens each time here')
  expect(rereadTip({ name: 'src/app.ts', count: 2, chars: 24_000, sessionKey: 's1' })).toBeNull()
})

test('the compaction brief names the goal, the files touched and anything added', () => {
  const brief = compactionBrief({ request: 'make the  tests\npass', files: ['a.ts', 'b.ts'], extra: ' keep the API notes ' })
  expect(brief).toBe(
    'Keep a brief to carry on from: the goal (the person\'s latest request: "make the tests pass"), what is done, the next step, the files touched (a.ts, b.ts), decisions made and why, and open questions. Drop tool output already acted on and attempts that were superseded. Also: keep the API notes'
  )
  expect(compactionBrief({ request: null, files: [], extra: '' }).startsWith('Keep a brief to carry on from: the goal, what is done, the next step, the files touched,')).toBe(true)
})

test('an instruction repeated across instruction files is found, headings and short lines aside', () => {
  const files = [
    { name: '.claude/CLAUDE.md', text: '# Rules\n- Run the test suite before every commit and fix what fails.\nshort line' },
    { name: 'AGENTS.md', text: '## Tests\n* Run the `test` suite before every commit and fix what fails.\nshort line\n# Rules' },
    { name: 'memory/MEMORY.md', text: 'Nothing in common here at all, not even close.' },
  ]
  const found = duplicateInstructions(files)
  expect(found).toEqual([{ line: '- Run the test suite before every commit and fix what fails.', names: ['.claude/CLAUDE.md', 'AGENTS.md'] }])
  const tip = dupesTip(found, 'p1')
  expect(tip).toMatchObject({ id: 'tip:dupes:p1', kind: 'dupes', title: 'The same instruction is in two instruction files' })
  expect(tip?.body.startsWith('"- Run the test suite before every commit and fix what fails." is in both .claude/CLAUDE.md and AGENTS.md')).toBe(true)
  const three = dupesTip([{ line: 'Keep commits small and focused on one change.', names: ['CLAUDE.md', 'AGENTS.md', 'rules/style.md'] }], 'p1')
  expect(three?.title).toBe('The same instruction is in three instruction files')
  expect(three?.body.startsWith('"Keep commits small and focused on one change." is in CLAUDE.md, AGENTS.md and rules/style.md')).toBe(true)
  expect(dupesTip([], 'p1')).toBeNull()
})
