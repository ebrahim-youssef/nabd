import { act, renderHook, waitFor } from '@testing-library/react-native'

import { logger } from '../../observability/logger'
import { useSoundPreview } from '../useSoundPreview'

type MockPlayer = {
  addListener: jest.Mock
  play: jest.Mock
  pause: jest.Mock
  release: jest.Mock
  seekTo: jest.Mock
}

const mockCreateAudioPlayer = jest.fn((..._args: unknown[]) => makePlayer())
const mockSetAudioModeAsync = jest.fn(async (..._args: unknown[]) => undefined)
const players: MockPlayer[] = []

jest.mock('expo-audio', () => ({
  createAudioPlayer: (...args: unknown[]) => mockCreateAudioPlayer(...args),
  setAudioModeAsync: (...args: unknown[]) => mockSetAudioModeAsync(...args),
}))

function makePlayer(): MockPlayer {
  const player: MockPlayer = {
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    play: jest.fn(),
    pause: jest.fn(),
    release: jest.fn(),
    seekTo: jest.fn(async () => undefined),
  }
  players.push(player)
  return player
}

describe('useSoundPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    players.length = 0
    mockCreateAudioPlayer.mockImplementation((..._args: unknown[]) => makePlayer())
    mockSetAudioModeAsync.mockResolvedValue(undefined)
  })

  it('replaces and releases the previous player when a new preview starts', async () => {
    const { result } = await renderHook(() => useSoundPreview())

    await act(async () => {
      result.current.play('before')
      await Promise.resolve()
    })
    const firstPlayer = players[0]

    await act(async () => {
      result.current.play('adhan')
      await Promise.resolve()
    })

    expect(firstPlayer.pause).toHaveBeenCalledTimes(1)
    expect(firstPlayer.release).toHaveBeenCalledTimes(1)
    expect(players[1].seekTo).toHaveBeenCalledWith(0)
    expect(players[1].play).toHaveBeenCalledTimes(1)
    expect(result.current.currentId).toBe('adhan')
  })

  it('pauses the active preview and returns to idle when stopped', async () => {
    const { result } = await renderHook(() => useSoundPreview())

    await act(async () => {
      result.current.play('before')
      await Promise.resolve()
    })
    await act(async () => {
      result.current.stop()
    })

    expect(players[0].pause).toHaveBeenCalledTimes(1)
    expect(players[0].release).not.toHaveBeenCalled()
    expect(result.current.currentId).toBeNull()
  })

  it('releases the active player when the hook unmounts', async () => {
    const { result, unmount } = await renderHook(() => useSoundPreview())

    await act(async () => {
      result.current.play('iqama')
      await Promise.resolve()
    })
    unmount()

    expect(players[0].release).toHaveBeenCalledTimes(1)
  })

  it('resets to idle and logs when playback reports an error', async () => {
    const { result } = await renderHook(() => useSoundPreview())
    await act(async () => {
      result.current.play('adhan-fajr')
      await Promise.resolve()
    })

    const statusListener = players[0].addListener.mock.calls[0][1] as (status: {
      error: string | null
    }) => void
    act(() => statusListener({ error: 'asset unavailable' }))

    await waitFor(() => expect(result.current.currentId).toBeNull())
    expect(logger.error).toHaveBeenCalledWith(
      'Native sound preview playback failed',
      expect.any(Error),
      { previewId: 'adhan-fajr' },
    )
    expect(players[0].release).toHaveBeenCalledTimes(1)
  })

  it('returns to idle and releases the player when the preview plays to the end', async () => {
    const { result } = await renderHook(() => useSoundPreview())
    await act(async () => {
      result.current.play('iqama')
      await Promise.resolve()
    })

    const statusListener = players[0].addListener.mock.calls[0][1] as (status: {
      error: string | null
      didJustFinish: boolean
    }) => void
    await act(async () => statusListener({ error: null, didJustFinish: true }))

    expect(result.current.currentId).toBeNull()
    expect(players[0].release).toHaveBeenCalledTimes(1)
  })

  it('configures foreground playback that follows the phone silent setting', async () => {
    await renderHook(() => useSoundPreview())

    expect(mockSetAudioModeAsync).toHaveBeenCalledWith({
      playsInSilentMode: false,
      shouldPlayInBackground: false,
    })
  })
})
