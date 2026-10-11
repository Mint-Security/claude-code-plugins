import { expect, test } from 'claude-code/testing'
import type { TurnUsage } from 'claude-code'

import { freshTurn, noteOutput, turnReport } from '../hooks/tips/turns'
import type { Noted } from '../hooks/tips/turns'

const START: Noted = { work: freshTurn(), filesTouched: [], bigReads: new Map() }
const WHERE = { projectDir: '/work/repo', sessionKey: 's1' }
const bash = (command: string, noted = START) => noteOutput(noted, { tool: 'Bash', command }, { text: 'ok' }, WHERE)

test('a commit marks the breakpoint over a test run; a failed call counts but marks none, a denied one notes nothing', () => {
  expect(bash('npm test').work.breakpoint).toBe('tests')
  expect(bash('git commit -m x', bash('npm test')).work.breakpoint).toBe('commit')
  expect(bash('npm test', bash('git commit -m x')).work.breakpoint).toBe('commit')
  const failed = noteOutput(START, { tool: 'Bash', command: 'git commit -m x' }, { text: 'no', isError: true }, WHERE).work
  expect([failed.breakpoint, failed.outputs.length]).toEqual([null, 1])
  expect(noteOutput(START, { tool: 'Bash', command: 'git commit -m x' }, { deny: 'no' }, WHERE)).toBe(START)
})

test('a turn that does more than read and edit ends the run of light turns', () => {
  const FIRST: TurnUsage = { input_tokens: 10, output_tokens: 40, cache_read_input_tokens: 30_000, cache_creation_input_tokens: 900, model: 'claude-opus-5-5' }
  const lightTurns = (tools: string[]) =>
    turnReport({
      first: FIRST,
      effort: null,
      before: { context: 30_000, cost: null, model: 'claude-opus-5-5', effort: null, answeredAt: null },
      seen: null,
      startedAt: null,
      ttl: null,
      counts: { coldBreaks: 0, warmBreaks: 0, lightTurns: 2, warnedFor: null },
      work: { ...freshTurn(), outputs: tools.map(tool => ({ tool, label: tool, chars: 10 })) },
      sessionKey: 's1',
    }).lightTurns
  expect([lightTurns(['Read', 'Edit']), lightTurns(['Read', 'Bash']), lightTurns([])]).toEqual([3, 0, 0])
})
