// What Ask Claude drafts in the prompt box for the tips Claude can act on itself. The draft names what
// to do and never quotes a file's content: once sent, it carries the person's authority. Pure, no `$`.

import type { DividendTip } from '../../types'
import { tipKindOf } from './kinds'
import type { TipKind } from './kinds'

const ASKS: Partial<Record<TipKind, string>> = {
  memory:
    'Look at the instruction files you have loaded (CLAUDE.md, AGENTS.md, rules and memory) and propose how to make them lighter: what to move into skills or into .claude/rules files scoped with paths, what to cut, and how to keep auto memory a short index. Make the edits once I agree; project files are shared with everyone on the repo.',
  dupes: 'Find the instruction that appears in more than one of the instruction files you have loaded, keep it in the one file it belongs in, and remove the other copies. Show me the change.',
  ttl: 'Set "promptCacheTtl": "1h" in my user settings, ~/.claude/settings.json, leaving everything else in the file as it is.',
}

export const askFor = (tip: DividendTip): string | null => {
  const kind = tipKindOf(tip.id)
  const ask = kind === null ? undefined : ASKS[kind]
  return ask === undefined ? null : `Dividend tip: ${tip.title}.\n\n${ask}`
}
