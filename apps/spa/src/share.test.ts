import { afterEach, describe, expect, it, vi } from 'vitest'

import { shareText } from './share'

const TEXT = 'أتممتُ وِردي اليوم'

function stubNavigator(value: Partial<Navigator>) {
  vi.stubGlobal('navigator', value)
}

afterEach(() => vi.unstubAllGlobals())

describe('shareText', () => {
  it('uses the share sheet when the platform has one', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    stubNavigator({ share })

    await expect(shareText(TEXT)).resolves.toBe('shared')
    expect(share).toHaveBeenCalledWith({ text: TEXT })
  })

  it('falls back to the clipboard when there is no share sheet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubNavigator({ clipboard: { writeText } as unknown as Clipboard })

    await expect(shareText(TEXT)).resolves.toBe('copied')
    expect(writeText).toHaveBeenCalledWith(TEXT)
  })

  it('reports a cancelled share sheet as failed without touching the clipboard', async () => {
    const abort = Object.assign(new Error('cancelled'), { name: 'AbortError' })
    const writeText = vi.fn()
    stubNavigator({
      share: vi.fn().mockRejectedValue(abort),
      clipboard: { writeText } as unknown as Clipboard,
    })

    // A cancel must not silently reroute to the clipboard: the user declined to share at all.
    await expect(shareText(TEXT)).resolves.toBe('failed')
    expect(writeText).not.toHaveBeenCalled()
  })

  it('reports a refused clipboard as failed', async () => {
    stubNavigator({
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('denied')),
      } as unknown as Clipboard,
    })

    await expect(shareText(TEXT)).resolves.toBe('failed')
  })

  it('never throws when the platform has neither route', async () => {
    stubNavigator({})

    await expect(shareText(TEXT)).resolves.toBe('failed')
  })
})
