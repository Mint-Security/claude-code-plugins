// What makes the conversation grow, and good moments to make it lighter. Pure functions, no `$`.

import { plain, tokens } from '../display/format'
import type { Tip } from './kinds'

// One tool result of a main turn: which tool, how the person would recognise it, and its size.
export type ToolOutput = { tool: string; label: string; chars: number }

export type Breakpoint = 'commit' | 'tests'

const GROWTH_TOKENS = 50_000
const BREAKPOINT_TOKENS = 60_000
const REREAD_COUNT = 3
export const REREAD_CHARS = 6_000
const CHARS_PER_TOKEN = 4
const BRIEF_REQUEST_CHARS = 300
const BRIEF_FILES = 8

const GROWTH_ADVICE: Record<string, string> = {
  Bash: 'Next time, pipe long output through tail or grep, or ask Claude for a summary of it.',
  Read: 'Reading part of a large file, or asking Claude to search it first, keeps the conversation lighter.',
  WebFetch: 'A narrower question about the page, or a subagent that reads it, keeps the conversation lighter.',
}

const toolKey = (tool: string): string => (tool.startsWith('mcp__') ? 'mcp' : tool)

// A single turn that grew the conversation by a lot, put down to the tool output behind it. Only
// when one output plausibly explains a good part of the growth: otherwise there is nothing fair to name.
export const growthTip = (turn: { added: number; outputs: ToolOutput[]; sessionKey: string }): Tip | null => {
  if (turn.added < GROWTH_TOKENS) return null
  const biggest = [...turn.outputs].sort((a, b) => b.chars - a.chars)[0]
  if (biggest === undefined) return null
  const estimate = Math.round(biggest.chars / CHARS_PER_TOKEN)
  if (estimate * 4 < turn.added) return null
  const advice = GROWTH_ADVICE[biggest.tool] ?? 'A narrower request, or a subagent that returns a summary, keeps the conversation lighter.'
  return {
    id: `tip:growth:${turn.sessionKey}:${toolKey(biggest.tool)}`,
    kind: 'growth',
    title: `That turn added ${tokens(turn.added)} tokens to the conversation`,
    body: `About ${tokens(Math.min(estimate, turn.added))} of it came from ${biggest.label}, and every later message carries it. ${advice} Once it is no longer needed, /compact drops it.`
  }
}

// A finished piece of work in a big conversation: the cheapest moment to start the next one lighter.
export const breakpointTip = (turn: { breakpoint: Breakpoint | null; context: number | null; sessionKey: string }): Tip | null => {
  if (turn.breakpoint === null || turn.context === null || turn.context < BREAKPOINT_TOKENS) return null
  const what = turn.breakpoint === 'commit' ? 'committed' : 'got the tests passing'
  return {
    id: `tip:breakpoint:${turn.sessionKey}`,
    kind: 'breakpoint',
    title: 'A good moment to compact',
    body: `You just ${what}, with ${tokens(turn.context)} tokens in the conversation. Starting the next task? /clear starts it fresh. Carrying on? Compacting keeps a short brief (the goal, the next step, the files touched) and makes every turn after it lighter.`,
    action: 'compact'
  }
}

// The same file read whole again and again: each read is another copy every later message carries.
export const rereadTip = (read: { name: string; count: number; chars: number; sessionKey: string }): Tip | null => {
  if (read.count < REREAD_COUNT || read.chars < REREAD_CHARS) return null
  return {
    id: `tip:reread:${read.sessionKey}`,
    kind: 'reread',
    title: `${read.name} was read ${read.count} times this session`,
    body: `Each read puts the file into the conversation again, about ${tokens(Math.round(read.chars / CHARS_PER_TOKEN))} tokens each time here, and every later message carries all the copies. A short note of what matters in it, or asking Claude to search it instead of reading it whole, keeps the conversation lighter.`
  }
}

const clip = (text: string, max: number): string => plain(text.replace(/\s+/g, ' ').trim(), max)

// What a compaction should keep, so the conversation carries on from a brief rather than a blur.
export const compactionBrief = (session: { request: string | null; files: string[]; extra: string }): string => {
  const goal = session.request ? `the goal (the person's latest request: "${clip(session.request, BRIEF_REQUEST_CHARS)}")` : 'the goal'
  const files = session.files.length > 0 ? `the files touched (${session.files.slice(-BRIEF_FILES).join(', ')})` : 'the files touched'
  const extra = session.extra.trim() ? ` Also: ${session.extra.trim()}` : ''
  return `Keep a brief to carry on from: ${goal}, what is done, the next step, ${files}, decisions made and why, and open questions. Drop tool output already acted on and attempts that were superseded.${extra}`
}

const DUPLICATE_MIN_CHARS = 40

const normalizeLine = (line: string): string =>
  line
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '')
    .replace(/[`*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

// Lines that appear in more than one instruction file: every copy goes out with every message.
export const duplicateInstructions = (files: { name: string; text: string }[]): { line: string; names: string[] }[] => {
  const seen = new Map<string, { line: string; names: Set<string> }>()
  for (const file of files) {
    for (const raw of file.text.split('\n')) {
      const key = normalizeLine(raw)
      if (key.length < DUPLICATE_MIN_CHARS || key.startsWith('#')) continue
      const entry = seen.get(key) ?? { line: raw.trim(), names: new Set<string>() }
      entry.names.add(file.name)
      seen.set(key, entry)
    }
  }
  return [...seen.values()].filter(entry => entry.names.size > 1).map(entry => ({ line: entry.line, names: [...entry.names] }))
}

const COUNT_WORDS: Record<number, string> = { 2: 'two', 3: 'three', 4: 'four', 5: 'five' }

export const dupesTip = (duplicates: { line: string; names: string[] }[], projectKey: string): Tip | null => {
  const [first] = duplicates
  if (first === undefined) return null
  const more = duplicates.length > 1 ? ` ${duplicates.length - 1} more line${duplicates.length === 2 ? '' : 's'} appear in more than one file too.` : ''
  const count = first.names.length
  const where = count === 2 ? `both ${first.names[0]} and ${first.names[1]}` : `${first.names.slice(0, -1).join(', ')} and ${first.names.at(-1)}`
  return {
    id: `tip:dupes:${projectKey}`,
    kind: 'dupes',
    title: `The same instruction is in ${COUNT_WORDS[count] ?? count} instruction files`,
    body: `"${clip(first.line, 120)}" is in ${where}, and every copy goes out with every message. Keep it in the one place it belongs.${more}`
  }
}

