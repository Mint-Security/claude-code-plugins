export type DividendTip = {
  id: string
  title: string
  body: string
  receivedAt: number
  // Compacting, the one action a tip can carry; Ask Claude goes by the tip's kind.
  action?: 'compact'
}

export type DividendReaction = 'seen' | 'not-relevant' | 'later'

// Where the prompt cache's lifetime comes from: a variable or setting, else the plan.
export type DividendTtlSource =
  | 'FORCE_PROMPT_CACHING_5M'
  | 'CLAUDE_CODE_PROMPT_CACHE_TTL'
  | 'promptCacheTtl'
  | 'ENABLE_PROMPT_CACHING_1H'
  | 'ENABLE_PROMPT_CACHING_1H_BEDROCK'
  | 'DISABLE_PROMPT_CACHING'
  | 'subscription'
  | 'over-limits'
  | 'api'
  | 'unknown'

export type DividendCacheTtl = { seconds: number; source: DividendTtlSource }

export type DividendRateLimit = {
  kind: string
  percentUsed: number
  resetsAt: string | null
}

// What this session carries and costs, as Claude Code itself counts it.
export type DividendUsage = {
  contextTokens: number | null
  contextWindow: number | null
  contextPercent: number | null
  costUsd: number | null
  rateLimits: DividendRateLimit[]
  // Sent with every request: loaded MCP tool descriptions and instruction files, by Claude Code's
  // local estimate (/context counts exactly, so its figures differ). Empty or null until counted.
  unusedMcp: { server: string; tokens: number }[]
  memoryTokens: number | null
  // `type` is the scope as Claude Code labels it: Project, Local, User, Managed or AutoMem.
  memoryFiles: { name: string; path: string; type: string; tokens: number }[]
  // Whether Claude has answered in this process: rate limits only come with an answer.
  hasAnswered: boolean
  // From a compaction until Claude next answers: Claude Code has no context figure in between.
  isJustCompacted: boolean
  // How long the prompt cache lasts here, and when Claude last answered; null until known.
  cacheTtl: DividendCacheTtl | null
  lastAnswerAt: number | null
  at: number
}

declare module 'claude-code' {
  interface PluginState {
    dividend: {
      tips: DividendTip[]
      reactions: Record<string, DividendReaction>
      usage: DividendUsage | null
    }
  }
}
