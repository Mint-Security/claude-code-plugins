import { expect, test } from 'claude-code/testing'

import { LESSON_TOPICS, lessonIndex, lessonText } from '../hooks/display/lessons'

test('each topic has a lesson, and anything else lists them', () => {
  for (const topic of LESSON_TOPICS) {
    expect(lessonText(topic).split('\n\n')).toHaveLength(2)
  }
  expect(lessonText('cache').startsWith('How the prompt cache works\n\nEvery message sends Claude the whole conversation again')).toBe(true)
  expect(lessonText('nope')).toBe(lessonIndex())
  expect(lessonIndex()).toContain('/dividend learn compact (when to compact)')
})
