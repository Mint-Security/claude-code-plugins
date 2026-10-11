// What the session's turns leave behind: each tool output, the breakpoint a command marks, the files
// edited and read again, what every request carries, and the tips a completed turn raises. Pure
// functions, no `$`.

import type { SessionUsage, TurnUsage } from 'claude-code'

import type { DividendUsage } from '../../types'
import { fileNameIn, outputLabel, serverOf } from '../display/tool-labels'
import type { ToolCallFacts } from '../display/tool-labels'
import { modelFitTip } from './advisor'
import { isColdStart, isWarmStart, recacheTip, ttlAdviceTip } from './cache'
import type { CacheTtl, TurnFacts } from './cache'
import { REREAD_CHARS, breakpointTip, growthTip, rereadTip } from './context'
import type { Breakpoint, ToolOutput } from './context'
import type { Tip } from './kinds'

const COMMIT = /\bgit\s+commit\b/
const TEST_RUN = /\b(?:(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test|pytest|go\s+test|cargo\s+test|jest|vitest|mvn\s+test|gradlew?\s+test|claude\s+plugin\s+test)\b/
const EDITING_TOOLS = new Set(['Edit', 'Write', 'MultiEdit'])
const READING_AND_EDITING_TOOLS = new Set(['Read', 'Grep', 'Glob', 'Edit', 'Write', 'MultiEdit', 'NotebookEdit'])
const FILES_KEPT = 12
const SHORT_BREAK_SECONDS = 5 * 60
const LONG_BREAK_SECONDS = 60 * 60

// What a main turn's tool calls left behind, handed to the tips raised once it completes.
export type TurnWork = { outputs: ToolOutput[]; breakpoint: Breakpoint | null; found: Tip[] }

export const freshTurn = (): TurnWork => ({ outputs: [], breakpoint: null, found: [] })

export type ToolOutcome = { text?: string; isError?: true; deny?: string }

// What the session's tool calls have added up to so far.
export type Noted = { work: TurnWork; filesTouched: string[]; bigReads: ReadonlyMap<string, number> }

// A main-thread tool result: its size for the growth tip, the work it marks done, the file it read again.
export const noteOutput = (noted: Noted, call: ToolCallFacts, outcome: ToolOutcome, { projectDir, sessionKey }: { projectDir: string; sessionKey: string }): Noted => {
  if (outcome.deny !== undefined) {
    return noted
  }
  const chars = typeof outcome.text === 'string' ? outcome.text.length : 0
  const outputs = [...noted.work.outputs, { tool: call.tool, label: outputLabel(call, projectDir), chars }]
  if (outcome.isError === true) {
    return { ...noted, work: { ...noted.work, outputs } }
  }
  const command = call.tool === 'Bash' && typeof call.command === 'string' ? call.command : ''
  const breakpoint = COMMIT.test(command) ? 'commit' : TEST_RUN.test(command) && noted.work.breakpoint === null ? 'tests' : noted.work.breakpoint
  const path = typeof call.file_path === 'string' ? call.file_path : null
  const name = path === null ? '' : fileNameIn(projectDir, path)
  const filesTouched = path !== null && EDITING_TOOLS.has(call.tool) ? [...noted.filesTouched.filter(file => file !== name), name].slice(-FILES_KEPT) : noted.filesTouched
  if (path === null || call.tool !== 'Read' || chars < REREAD_CHARS) {
    return { work: { ...noted.work, outputs, breakpoint }, filesTouched, bigReads: noted.bigReads }
  }
  // Paging through a file reads each part once: only the same part read again counts.
  const part = `${name}:${String(call.offset ?? '')}:${String(call.limit ?? '')}`
  const count = (noted.bigReads.get(part) ?? 0) + 1
  const tip = rereadTip({ name, count, chars, sessionKey })
  return { work: { outputs, breakpoint, found: tip ? [...noted.work.found, tip] : noted.work.found }, filesTouched, bigReads: new Map([...noted.bigReads, [part, count]]) }
}

export type McpServer = { key: string; server: string; tokens: number }

// What every request carries besides the conversation: the MCP tool descriptions in the window, and
// the instruction files. Counted from Claude Code's local estimate, which sends nothing.
export const fixedCosts = (breakdown: NonNullable<SessionUsage['context']['breakdown']>, projectDir: string) => {
  const byServer = new Map<string, McpServer>()
  for (const tool of breakdown.mcpTools.filter(tool => tool.isLoaded)) {
    const key = serverOf(tool.name) ?? tool.serverName
    byServer.set(key, { key, server: tool.serverName, tokens: (byServer.get(key)?.tokens ?? 0) + tool.tokens })
  }
  const memory: Pick<DividendUsage, 'memoryTokens' | 'memoryFiles'> = {
    memoryTokens: breakdown.memoryFiles.reduce((sum, file) => sum + file.tokens, 0),
    memoryFiles: breakdown.memoryFiles.map(file => ({ name: fileNameIn(projectDir, file.path), path: file.path, type: file.type, tokens: file.tokens })),
  }
  return { memoryPaths: breakdown.memoryFiles.map(file => file.path), mcpServers: [...byServer.values()].sort((a, b) => b.tokens - a.tokens), memory }
}

type TurnCounts = { coldBreaks: number; warmBreaks: number; lightTurns: number; warnedFor: number | null }

// A completed main turn: whether its first request re-cached the conversation and why, whether a break
// before it came back warm or cold, how many turns in a row only read and edited, and the tips all of
// that raises.
export const turnReport = ({
  first,
  effort,
  before,
  seen,
  startedAt,
  ttl,
  counts,
  work,
  sessionKey,
}: {
  first: TurnUsage
  effort: string | null
  before: { context: number | null; cost: number | null; model: string | null; effort: string | null; answeredAt: number | null }
  seen: { contextTokens: number | null; costUsd: number | null } | null
  startedAt: number | null
  ttl: CacheTtl | null
  counts: TurnCounts
  work: TurnWork
  sessionKey: string
}) => {
  const after = seen?.contextTokens ?? null
  const facts: TurnFacts = {
    cacheWrite: first.cache_creation_input_tokens,
    cacheRead: first.cache_read_input_tokens,
    model: first.model,
    previousModel: before.model,
    effort,
    previousEffort: before.effort,
    contextBefore: before.context,
    contextAfter: after,
    gapSeconds: startedAt !== null && before.answeredAt !== null ? (startedAt - before.answeredAt) / 1000 : null,
    ttlSeconds: ttl?.seconds ?? null,
    costUsd: seen?.costUsd != null && before.cost !== null ? seen.costUsd - before.cost : null,
  }
  const gap = facts.gapSeconds
  const isBreak = facts.previousModel === facts.model && gap !== null && gap >= SHORT_BREAK_SECONDS && gap < LONG_BREAK_SECONDS
  const isWarmBreak = isBreak && isWarmStart(facts)
  const coldBreaks = counts.coldBreaks + (isBreak && isColdStart(facts) && facts.previousEffort === facts.effort ? 1 : 0)
  const warmBreaks = counts.warmBreaks + (isWarmBreak ? 1 : 0)
  const tools = work.outputs.map(output => output.tool)
  const lightTurns = tools.length > 0 && tools.every(tool => READING_AND_EDITING_TOOLS.has(tool)) ? counts.lightTurns + 1 : 0
  const wasWarned = before.answeredAt !== null && before.answeredAt === counts.warnedFor
  const added = before.context !== null && after !== null ? after - before.context : 0
  const tips = [
    wasWarned ? null : recacheTip(facts, sessionKey),
    ttlAdviceTip({ cold: coldBreaks, warm: warmBreaks }, ttl, sessionKey),
    growthTip({ added, outputs: work.outputs, sessionKey }),
    breakpointTip({ breakpoint: work.breakpoint, context: after, sessionKey }),
    modelFitTip({ lightTurns, model: first.model, effort, sessionKey }),
    ...work.found,
  ].filter((tip): tip is Tip => tip !== null)
  return { coldBreaks, warmBreaks, isWarmBreak, lightTurns, tips }
}
