// Which instruction files Dividend opens, and with what. Pure functions, no `$`: register.tsx stats
// the file and runs the opener.

// An instruction file opens only as what it claims to be: a regular file, not a link, whose real name
// is Markdown or plain text. An @import can name a script, and a CLAUDE.md can be a link to one, which
// the system opener would run; those are shown, not opened. No shell runs in between, the opener
// starts in the home folder, and macOS opens the file as text whatever it holds.
const OPENABLE = /\.(md|markdown|txt)$/i

export const isOpenable = (stat: { kind: string; isLink: boolean; realPath?: string } | null, path: string): boolean =>
  stat !== null && stat.kind === 'file' && !stat.isLink && OPENABLE.test(stat.realPath ?? path)

export const isWindowsPath = (path: string): boolean => /^[A-Za-z]:[\\/]/.test(path)

// Explorer reads an unquoted comma as a separator, and an argument is quoted only when it holds a
// space; Windows drops a trailing one from the path, so a comma path gets one.
const forExplorer = (path: string): string => {
  const backslashed = path.replace(/\//g, '\\')
  return backslashed.includes(',') ? `${backslashed} ` : backslashed
}

// The system's own opener, with the file as its one argument.
export const openerArgv = (path: string, isMac: boolean): string[] =>
  isWindowsPath(path) ? ['explorer.exe', forExplorer(path)] : isMac ? ['open', '-t', path] : ['xdg-open', path]
