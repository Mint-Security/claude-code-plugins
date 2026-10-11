// Which saved tips this session shows, which may interrupt, what a batch of new ones changes, and
// which a message or a compaction takes back. Pure functions, no `$`.

import type { DividendReaction, DividendTip } from '../../types'
import { plain } from '../display/format'
import { contextTipIds } from './advisor'
import { areaOf, isNewsTip, isQuietTip, isTipHere, tipKindOf } from './kinds'
import type { Area, Tip } from './kinds'
import { mutedKinds } from './store'

type Reactions = Record<string, DividendReaction>

// Whose tips show here: this session's, this project's and the account's.
export type Here = { sessionKey: string; projectKey: string }

// What the plugin's settings say about tips: whether they show at all, and which areas are off.
export type TipSettings = { isTipping: boolean; areasOff: ReadonlySet<Area> }

export const isUnread = (tip: DividendTip, reacted: Reactions) => reacted[tip.id] === undefined

// Read, or its kind turned off: what keeps a tip that no longer holds. A snooze does not.
export const isSettled = (tip: DividendTip, reacted: Reactions) => reacted[tip.id] === 'seen' || reacted[tip.id] === 'not-relevant'

const tipEntry = (tip: Tip, receivedAt: number): DividendTip => ({
  id: tip.id,
  title: plain(tip.title, 200),
  body: plain(tip.body),
  receivedAt,
  ...(tip.action ? { action: tip.action } : {}),
})

// The tips this session shows: its own, its project's and the account's, minus kinds turned off here
// or in the settings.
export const shownTips = (list: DividendTip[], reacted: Reactions, here: Here, settings: TipSettings): DividendTip[] => {
  if (!settings.isTipping) {
    return []
  }
  const muted = mutedKinds(reacted)
  return list.filter(tip => {
    const kind = tipKindOf(tip.id)
    if (kind !== null && settings.areasOff.has(areaOf(kind))) {
      return false
    }
    return isTipHere(tip.id, here) && (reacted[tip.id] !== undefined || kind === null || !muted.has(kind))
  })
}

// The tips that may interrupt: shown here, not yet read, not pane-only, and no news from before the latest message.
export const bandTips = (list: DividendTip[], reacted: Reactions, here: Here, settings: TipSettings, sentAt: number | null): DividendTip[] =>
  shownTips(list, reacted, here, settings).filter(tip => isUnread(tip, reacted) && !isQuietTip(tip.id) && !(isNewsTip(tip.id) && sentAt !== null && tip.receivedAt < sentAt))

// What a batch of tips changes in what is saved: the new ones, and the unread ones whose figures moved.
// A tip not yet read shows the figures that hold now, not the ones it first came with; restated news is news again.
export const tipsToSave = (candidates: Tip[], saved: DividendTip[], reacted: Reactions, areasOff: ReadonlySet<Area>, receivedAt: number): DividendTip[] => {
  const known = new Map(saved.map(tip => [tip.id, tip]))
  const muted = mutedKinds(reacted)
  const offered = candidates.filter(tip => !muted.has(tip.kind) && !areasOff.has(areaOf(tip.kind)))
  const fresh = offered.filter(tip => !known.has(tip.id))
  const restated = offered.flatMap(tip => {
    const shown = known.get(tip.id)
    return shown !== undefined && isUnread(shown, reacted) && (shown.title !== tip.title || shown.body !== tip.body)
      ? [{ ...shown, title: plain(tip.title, 200), body: plain(tip.body), ...(tip.action ? { action: tip.action } : {}), ...(isNewsTip(shown.id) ? { receivedAt } : {}) }]
      : []
  })
  return [...restated, ...fresh.map(tip => tipEntry(tip, receivedAt))]
}

// The warnings about a break: any of this session's is moot once a message is on its way.
export const isBreakTip = (id: string, sessionKey: string): boolean => id.startsWith(`tip:warm-compact:${sessionKey}:`) || id.startsWith(`tip:expired:${sessionKey}:`)

// What a compaction answers: the context tips, the reports and offers whose advice was to compact,
// and the break warnings.
export const isAnsweredByCompaction = (id: string, sessionKey: string): boolean =>
  Object.values(contextTipIds(sessionKey)).includes(id) ||
  [`tip:recache:${sessionKey}`, `tip:switch:${sessionKey}`, `tip:reread:${sessionKey}`, `tip:breakpoint:${sessionKey}`].includes(id) ||
  id.startsWith(`tip:growth:${sessionKey}:`) ||
  isBreakTip(id, sessionKey)

// A break warning about an earlier break than the last answer no longer holds, whatever saved it.
export const isStaleBreakTip = (id: string, sessionKey: string, lastAnswerAt: number | null): boolean => {
  if (!isBreakTip(id, sessionKey) || lastAnswerAt === null) return false
  return Number(id.split(':')[3]) < lastAnswerAt
}
