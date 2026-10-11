// How a tool call reads in a tip: the program a command ran, the page it fetched, its MCP server, the
// file as the project knows it. Plain text only. Pure functions, no `$`.

import { plain } from './format'

// A tool call as the hook sees it: the tool's arguments sit beside its name.
export type ToolCallFacts = { tool: string; agentId?: string; command?: unknown; file_path?: unknown; url?: unknown; offset?: unknown; limit?: unknown }

// The page's host alone: a URL that doesn't parse is left out, so no query string lands in a tip.
const hostOf = (url: string): string | null => {
  try {
    return plain(new URL(url).host, 100) || null
  } catch {
    return null
  }
}

// The program a Bash command runs: its last step, past any variable assignments.
const programOf = (command: string): string =>
  plain(
    (command.split(/&&|\|\||;/).at(-1) ?? '')
      .trim()
      .split(/\s+/)
      .find(word => word !== '' && !word.includes('=')) ?? '',
    40,
  )

export const serverOf = (toolName: string): string | null => {
  const server = /^mcp__(.+?)__/.exec(toolName)?.[1]
  return server === undefined ? null : plain(server, 60)
}

const shortPath = (path: string): string => path.split(/[\\/]/).filter(Boolean).slice(-2).join('/')

// A file as the person knows it: relative to the project when it is inside it.
export const fileNameIn = (projectDir: string, path: string): string => {
  const rest = projectDir && path.startsWith(projectDir) ? path.slice(projectDir.length) : ''
  return plain(/^[\\/]./.test(rest) ? rest.slice(1) : shortPath(path), 160)
}

// How the person would recognise a tool result in a tip.
export const outputLabel = (call: ToolCallFacts, projectDir: string): string => {
  if (call.tool === 'Bash') {
    const program = typeof call.command === 'string' ? programOf(call.command) : ''
    return program ? `a Bash run of ${program}` : 'a Bash run'
  }
  if (call.tool === 'Read' && typeof call.file_path === 'string') return `reading ${fileNameIn(projectDir, call.file_path)}`
  if (call.tool === 'WebFetch') {
    const host = typeof call.url === 'string' ? hostOf(call.url) : null
    return host ? `fetching ${host}` : 'fetching a page'
  }
  const server = serverOf(call.tool)
  if (server) return `the ${server} MCP server`
  if (call.tool === 'Agent' || call.tool === 'Task') return "a subagent's answer"
  return `the ${call.tool} tool`
}
