import { describe, expect, it } from 'vitest'

import { soundFileFor } from '../impure/notifications'

describe('soundFileFor', () => {
  it('maps each moment to its file', () => {
    expect(soundFileFor('before')).toBe('/sounds/before.mp3')
    expect(soundFileFor('adhan')).toBe('/sounds/adhan.mp3')
    expect(soundFileFor('iqamah')).toBe('/sounds/iqama.mp3')
  })

  it('fajr gets its own adhan — «الصلاة خير من النوم»', () => {
    expect(soundFileFor('adhan', 'fajr')).toBe('/sounds/adhan-fajr.mp3')
    expect(soundFileFor('adhan', 'dhuhr')).toBe('/sounds/adhan.mp3')
    // Only the adhan moment differs for fajr.
    expect(soundFileFor('before', 'fajr')).toBe('/sounds/before.mp3')
    expect(soundFileFor('iqamah', 'fajr')).toBe('/sounds/iqama.mp3')
  })
})
