import { computeDailyItemState } from '../logic'

describe('computeDailyItemState', () => {
  it('uses the live wird target and caps a local count at that target', () => {
    expect(computeDailyItemState(12, 10, false, 10)).toEqual({
      target: 10,
      count: 10,
      done: true,
    })
  })

  it('falls back to the content repeat when the wird item is missing', () => {
    expect(computeDailyItemState(undefined, undefined, undefined, 10)).toEqual({
      target: 10,
      count: 0,
      done: false,
    })
  })

  it('seeds an untouched card from linked completion but lets a local count win', () => {
    expect(computeDailyItemState(undefined, 25, true, 10)).toEqual({
      target: 25,
      count: 25,
      done: true,
    })
    expect(computeDailyItemState(0, 25, true, 10)).toEqual({
      target: 25,
      count: 0,
      done: false,
    })
  })
})
