// How figures read in a tip: the way people say them. Pure functions, no `$`.

export const tokens = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`

export const usd = (n: number): string => `$${n.toFixed(2)}`

export const duration = (seconds: number): string =>
  seconds < 90
    ? `${Math.round(seconds)} s`
    : seconds < 90 * 60
      ? `${Math.round(seconds / 60)} min`
      : seconds < 36 * 3600
        ? `${Math.round(seconds / 3600)} h`
        : `${Math.round(seconds / 86400)} days`

// A time of day as the person's own clock shows it.
export const clockTime = (ms: number): string => {
  try {
    return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } catch {
    const date = new Date(ms)
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  }
}

// A time with its weekday once it is not today, so a weekly reset reads as the day it falls on.
export const dayTime = (ms: number, now: number): string => {
  const date = new Date(ms)
  if (date.toDateString() === new Date(now).toDateString()) return clockTime(ms)
  try {
    return `${date.toLocaleDateString([], { weekday: 'short' })} ${clockTime(ms)}`
  } catch {
    return clockTime(ms)
  }
}

// Text from files, commands and tool output as one line Claude Code will draw: no control, bidi or
// invisible characters (the engine refuses a whole tree that holds a control character, and a bidi
// override can make a file name read as another), capped in length.
const INVISIBLE = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u00AD\u061C\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF\u{E0000}-\u{E007F}]/gu

export const plain = (text: string, max = 1000): string => {
  const flat = text.replace(/[\t\n\r\u2028\u2029]+/g, ' ').replace(INVISIBLE, '')
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

// A short stable key, so a tip's id can say which session or project it is about without carrying
// a path or an id in the clear.
export const keyOf = (text: string): string => {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(36)
}
