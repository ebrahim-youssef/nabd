import { describe, expect, it } from 'vitest'

import type { Dhikr } from '@/content/adhkar'

import { INITIAL_FLOW, tap, upcoming } from '../logic'

const items: Dhikr[] = [
  { id: 'a', text: 'أ', repeat: 1 },
  { id: 'b', text: 'ب', repeat: 3 },
  { id: 'c', text: 'ج', repeat: 2 },
]

describe('tap', () => {
  it('counts toward the target and advances on reaching it, resetting the counter', () => {
    let state = tap(INITIAL_FLOW, items) // a (×1) done → advance
    expect(state).toMatchObject({ index: 1, count: 0, finished: false })
    state = tap(state, items)
    state = tap(state, items)
    expect(state).toMatchObject({ index: 1, count: 2 })
    state = tap(state, items) // b (×3) done → advance
    expect(state).toMatchObject({ index: 2, count: 0 })
  })

  it('finishes after the last dhikr and ignores further taps', () => {
    let state = { index: 2, count: 1, finished: false }
    state = tap(state, items) // c (×2) done → finished
    expect(state.finished).toBe(true)
    expect(tap(state, items)).toEqual(state)
  })
})

describe('upcoming', () => {
  it('previews at most the requested count after the active dhikr', () => {
    expect(upcoming(INITIAL_FLOW, items, 3).map((d) => d.id)).toEqual(['b', 'c'])
    expect(upcoming({ index: 1, count: 0, finished: false }, items, 1).map((d) => d.id)).toEqual([
      'c',
    ])
    expect(upcoming({ index: 2, count: 0, finished: true }, items, 3)).toEqual([])
  })
})
