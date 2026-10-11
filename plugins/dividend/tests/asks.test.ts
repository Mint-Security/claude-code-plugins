import { expect, test } from 'claude-code/testing'

import { askFor } from '../hooks/tips/asks'

const tip = (id: string) => ({ id, title: 'T', body: 'B.', receivedAt: 1 })

test("Ask Claude is offered for the tips Claude can act on itself, drafting what to do without quoting a file's content", () => {
  expect(askFor(tip('tip:memory:p1'))).toMatch(/^Dividend tip: T\.\n\nLook at the instruction files you have loaded .* and propose how to make them lighter/)
  expect(askFor(tip('tip:dupes:p1'))).toContain('keep it in the one file it belongs in')
  expect(askFor(tip('tip:dupes:p1'))).not.toContain('B.')
  expect(askFor(tip('tip:ttl:s1'))).toContain('"promptCacheTtl": "1h"')
  for (const id of ['tip:context:s1', 'tip:mcp:s1', 'tip:wall:five_hour:x', 'tip:reread:s1', 'tip:model-fit:s1', 'tip:breakpoint:s1']) {
    expect(askFor(tip(id))).toBeNull()
  }
})
