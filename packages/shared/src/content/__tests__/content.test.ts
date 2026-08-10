import { describe, expect, it } from 'vitest'

import { ADHKAR_LIBRARY, INTENTIONS_LIBRARY, WIRD_LEVELS } from '../../index'

describe('canonical Arabic content', () => {
  it('has stable unique level and adhkar identifiers', () => {
    expect(new Set(WIRD_LEVELS.map((level) => level.id)).size).toBe(WIRD_LEVELS.length)
    expect(new Set(ADHKAR_LIBRARY.map((category) => category.id)).size).toBe(ADHKAR_LIBRARY.length)
  })

  it('keeps every reference entry meaningful', () => {
    expect(
      ADHKAR_LIBRARY.every((category) =>
        category.items.every((item) => item.text && item.repeat > 0),
      ),
    ).toBe(true)
    expect(INTENTIONS_LIBRARY.every((entry) => entry.intentions.length > 0)).toBe(true)
  })
})
