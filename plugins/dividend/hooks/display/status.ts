// What the pane, the /dividend session card and the status line show of the session: rows and a
// line of text, never a tip. Pure functions, no `$`.

import type { SessionUsage } from 'claude-code'

import type { DividendRateLimit, DividendUsage } from '../../types'
import type { Figures, SessionState } from '../state'
import { about, byScope, isSeatPlan, scopeOf } from '../tips/advisor'
import { ttlText } from '../tips/cache'
import { clockTime, dayTime, tokens, usd } from './format'
import { bar } from './rows'
import type { Row } from './rows'

const WEEKLY_STATUS_PERCENT = 70

export const cacheRow = (usage: DividendUsage): Row | null => {
  const ttl = usage.cacheTtl
  if (ttl === null) return null
  if (ttl.seconds === 0) return { label: 'Prompt cache', value: 'off', note: 'prompt caching is turned off (DISABLE_PROMPT_CACHING)' }
  const note = `lasts ${ttlText(ttl)}`
  if (usage.lastAnswerAt === null) return { label: 'Prompt cache', value: 'not used yet', note }
  const expiresAt = usage.lastAnswerAt + ttl.seconds * 1000
  if (usage.at >= expiresAt) return { label: 'Prompt cache', value: `expired at ${dayTime(expiresAt, usage.at)}`, note }
  return { label: 'Prompt cache', value: `warm until ${clockTime(expiresAt)} ${bar((expiresAt - usage.at) / (ttl.seconds * 1000))}`, note }
}

// The instruction files by where they load from, heaviest first, each with its files to open.
export const instructionScopes = (usage: DividendUsage): { name: string; tokens: number; files: DividendUsage['memoryFiles'] }[] =>
  byScope(usage.memoryFiles).map(scope => ({ name: scopeOf(scope.type).name, tokens: scope.tokens, files: scope.files }))

// "This session", as the pane and /dividend session show it: what Claude Code's own /usage and /context
// don't say. The cache time is a clock time, so a printed card stays true.
export const sessionRows = (usage: DividendUsage): Row[] => {
  const rows: Row[] = []
  const cache = cacheRow(usage)
  if (cache) rows.push(cache)
  if (usage.memoryTokens !== null) {
    const scopes = instructionScopes(usage).map(scope => `${scope.name} ${tokens(scope.tokens)}`)
    rows.push({ label: 'Instruction files', value: about(usage.memoryTokens), ...(scopes.length > 0 ? { note: scopes.join(', ') } : {}) })
  }
  return rows
}

// The status line: the 5-hour limit, and the weekly one past 70%, as a seat plan spends them, or
// dollars where there are no limits. A window that has reset since is left out until the next answer
// reports it. The context fill is left to Claude Code's own indicator beside it.
export const usageLine = (usage: DividendUsage, now: number = usage.at): string | null => {
  const parts: string[] = []
  const isCurrent = (limit: DividendUsage['rateLimits'][number]) => limit.resetsAt === null || Date.parse(limit.resetsAt) > now
  const fiveHour = usage.rateLimits.find(limit => limit.kind === 'five_hour' && isCurrent(limit))
  const weekly = usage.rateLimits.find(limit => limit.kind === 'seven_day' && isCurrent(limit))
  if (fiveHour) parts.push(`5h ${Math.round(fiveHour.percentUsed)}%`)
  if (weekly && weekly.percentUsed >= WEEKLY_STATUS_PERCENT) parts.push(`7d ${Math.round(weekly.percentUsed)}%`)
  if (!isSeatPlan(usage) && usage.costUsd !== null && usage.hasAnswered) parts.push(`${usd(usage.costUsd)} API-eq`)
  return parts.length > 0 ? parts.join(' · ') : null
}

// After /clear: the account's rate limits and the setup still hold; what the conversation held does not.
export const newConversation = (seen: DividendUsage): DividendUsage => ({
  ...seen,
  contextTokens: null,
  contextPercent: null,
  costUsd: null,
  isJustCompacted: false,
  lastAnswerAt: null,
})

// What the session carries and costs now, as Claude Code counts it. From a compaction until the next
// answer, what it still reports describes the window before the compaction, so there is no context figure.
export const usageOf = ({
  counted,
  rateLimits,
  session,
  figures,
  hasAnswered,
  now,
}: {
  counted: SessionUsage
  rateLimits: DividendRateLimit[]
  session: Pick<SessionState, 'isJustCompacted' | 'mcpServers' | 'usedServers' | 'memory'>
  figures: Pick<Figures, 'cacheTtl' | 'lastAnswerAt'>
  hasAnswered: boolean
  now: number
}): DividendUsage => ({
  contextTokens: session.isJustCompacted ? null : (counted.context.tokens ?? null),
  contextWindow: counted.context.window ?? null,
  contextPercent: session.isJustCompacted ? null : (counted.context.percent ?? null),
  costUsd: counted.cost?.usd ?? null,
  rateLimits,
  unusedMcp: session.mcpServers.filter(server => !session.usedServers.has(server.key)).map(({ server, tokens: count }) => ({ server, tokens: count })),
  ...session.memory,
  hasAnswered,
  isJustCompacted: session.isJustCompacted,
  cacheTtl: figures.cacheTtl,
  lastAnswerAt: figures.lastAnswerAt,
  at: now,
})
