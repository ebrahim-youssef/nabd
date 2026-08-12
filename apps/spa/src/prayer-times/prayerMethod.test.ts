import { beforeEach, describe, expect, it, vi } from 'vitest'

import { applyCalculationMethodId, METHOD_EVENT, readCalculationMethodId } from './prayerMethod'

describe('prayer method preference', () => {
  beforeEach(() => localStorage.clear())

  it('defaults invalid and missing preferences to Egyptian', () => {
    expect(readCalculationMethodId()).toBe('egyptian')
    localStorage.setItem('nabd:calc-method', 'unknown')
    expect(readCalculationMethodId()).toBe('egyptian')
  })

  it('persists and announces a valid method', () => {
    const listener = vi.fn()
    window.addEventListener(METHOD_EVENT, listener)

    applyCalculationMethodId('umm_al_qura')

    expect(readCalculationMethodId()).toBe('umm_al_qura')
    expect(listener).toHaveBeenCalledOnce()
    window.removeEventListener(METHOD_EVENT, listener)
  })
})
