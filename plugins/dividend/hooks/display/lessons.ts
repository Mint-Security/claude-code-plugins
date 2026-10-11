// Short lessons behind the tips, for /dividend learn. Plain text, no `$`.

export const LESSON_TOPICS = ['cache', 'context', 'limits', 'compact'] as const

export type LessonTopic = (typeof LESSON_TOPICS)[number]

const LESSONS: Record<LessonTopic, { label: string; title: string; text: string }> = {
  cache: {
    label: 'Prompt cache',
    title: 'How the prompt cache works',
    text: 'Every message sends Claude the whole conversation again: the system prompt, the tool descriptions, the instruction files and every earlier turn. The prompt cache keeps that prefix for a while, so the next message reads it back instead of paying for all of it: reading from the cache costs a tenth of normal input, and writing to it costs more than normal input: 1.25 times for a 5-minute cache, 2 times for a 1-hour one. The cache lasts 5 minutes on API billing and 1 hour on a subscription within its limits, counted from its last use, so every message keeps it warm. After a longer break the next message writes everything to the cache again, which is why Dividend says so before you send and offers to compact first. Switching the model starts a new cache too, since each model keeps its own, and so does changing anything near the start of the conversation, such as connecting an MCP server or adding a tool.',
  },
  context: {
    label: 'Long conversations',
    title: 'Why long conversations cost more',
    text: 'Claude reads the whole conversation with every message, so each turn costs more than the one before it, even when most of it comes from the cache. Tool output stays in the conversation once it is there: a long test log, or a large file read whole, is carried by every later message. /compact replaces the history with a summary and /clear starts from nothing; both make every turn after them lighter. On a 1M-token window Claude Code compacts on its own only when the window is nearly full, so a conversation can grow very large first. Instruction files (CLAUDE.md, AGENTS.md, rules, auto memory) and MCP tool descriptions ride along with every message as well; the /dividend pane and /context show how much.',
  },
  limits: {
    label: 'Plan limits',
    title: 'How plan limits work',
    text: "On a Claude subscription, usage counts against a 5-hour window and a weekly one; each fills as you work and resets on its own schedule. A long conversation uses them faster than a short one, because every message carries the whole conversation, and agents running at the same time each carry their own. The pace matters more than the percent: half of the 5-hour limit used in its first hour runs out long before it resets, while 80% used just before the reset is fine. To stretch it: compact at breakpoints, start unrelated work with /clear, run fewer agents at once, and use Sonnet or a lower effort for routine reading and editing.",
  },
  compact: {
    label: 'When to compact',
    title: 'When to compact',
    text: 'Compacting replaces the conversation with a summary, so every message after it is lighter. The best moments are breakpoints: a commit, tests passing, the end of a task. Compacting while the prompt cache is still warm costs little, which is why Dividend offers it shortly before a long cache expires; once the cache has lapsed, the compaction reads the whole conversation one more time. Claude Code also compacts on its own near the end of the window, often in the middle of a task, so choosing the moment yourself keeps what matters. /dividend compact adds a brief to the compaction: your latest request, what is done, the next step, the files touched, and the decisions made.',
  },
}

export const lessonOf = (topic: LessonTopic): { label: string; title: string; text: string } => LESSONS[topic]

const isTopic = (topic: string): topic is LessonTopic => (LESSON_TOPICS as readonly string[]).includes(topic)

export const lessonIndex = (): string =>
  `Lessons: ${LESSON_TOPICS.map(topic => `/dividend learn ${topic} (${LESSONS[topic].title.toLowerCase()})`).join(', ')}.`

export const lessonText = (topic: string): string => {
  if (!isTopic(topic)) return lessonIndex()
  const lesson = LESSONS[topic]
  return `${lesson.title}\n\n${lesson.text}`
}
