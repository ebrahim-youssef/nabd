import { act, renderHook, waitFor } from '@testing-library/react-native'
import { useFocusEffect } from 'expo-router'

import { logger } from '../../observability/logger'
import { useLiveRepositoryQuery } from '../useLiveRepositoryQuery'

jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }))

const mockedUseFocusEffect = useFocusEffect as jest.MockedFunction<typeof useFocusEffect>
const mockedLogger = logger as jest.Mocked<typeof logger>

let focusCallback: (() => undefined | (() => void)) | undefined

describe('useLiveRepositoryQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    focusCallback = undefined
    mockedUseFocusEffect.mockImplementation((callback) => {
      focusCallback = callback as typeof focusCallback
    })
  })

  it('reports loading and then exposes the resolved value', async () => {
    const read = jest.fn().mockResolvedValue('first')
    const { result } = renderHook(() => useLiveRepositoryQuery(read))

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.data).toBe('first'))
    expect(result.current.isLoading).toBe(false)
  })

  it('clears cached data when a new read rejects', async () => {
    const cause = new Error('new read failed')
    const initialRead = jest.fn().mockResolvedValue('first')
    const nextRead = jest.fn().mockRejectedValue(cause)
    const { result, rerender } = renderHook(
      ({ read }: { read: () => Promise<string> }) => useLiveRepositoryQuery(read),
      { initialProps: { read: initialRead } },
    )

    await waitFor(() => expect(result.current.data).toBe('first'))
    rerender({ read: nextRead })

    await waitFor(() =>
      expect(mockedLogger.error).toHaveBeenCalledWith('Native repository query failed', cause),
    )
    expect(result.current.data).toBeUndefined()
    expect(result.current.isLoading).toBe(false)
  })

  it('reports loading until a new read resolves', async () => {
    let resolveNext!: (value: string) => void
    const initialRead = jest.fn().mockResolvedValue('first')
    const nextRead = jest.fn().mockReturnValue(
      new Promise<string>((resolve) => {
        resolveNext = resolve
      }),
    )
    const { result, rerender } = renderHook(
      ({ read }: { read: () => Promise<string> }) => useLiveRepositoryQuery(read),
      { initialProps: { read: initialRead } },
    )

    await waitFor(() => expect(result.current.data).toBe('first'))
    rerender({ read: nextRead })
    await waitFor(() => expect(nextRead).toHaveBeenCalledTimes(1))

    expect(result.current.data).toBeUndefined()
    expect(result.current.isLoading).toBe(true)
    await act(async () => resolveNext('second'))
    await waitFor(() => expect(result.current.data).toBe('second'))
    expect(result.current.isLoading).toBe(false)
  })

  it('re-reads the repository after refresh without hiding the current data', async () => {
    let resolveSecond!: (value: string) => void
    const read = jest
      .fn()
      .mockResolvedValueOnce('first')
      .mockReturnValueOnce(new Promise<string>((resolve) => (resolveSecond = resolve)))
    const { result } = renderHook(() => useLiveRepositoryQuery(read))

    await waitFor(() => expect(result.current.data).toBe('first'))
    act(() => result.current.refresh())
    expect(result.current.data).toBe('first')
    expect(result.current.isLoading).toBe(false)
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2))

    await act(async () => resolveSecond('second'))
    await waitFor(() => expect(result.current.data).toBe('second'))
  })

  it('keeps stale data when a refresh fails', async () => {
    const cause = new Error('refresh failed')
    const read = jest.fn().mockResolvedValueOnce('first').mockRejectedValueOnce(cause)
    const { result } = renderHook(() => useLiveRepositoryQuery(read))

    await waitFor(() => expect(result.current.data).toBe('first'))
    act(() => result.current.refresh())

    await waitFor(() =>
      expect(mockedLogger.error).toHaveBeenCalledWith('Native repository query failed', cause),
    )
    expect(result.current.data).toBe('first')
    expect(result.current.isLoading).toBe(false)
  })

  it('re-reads the repository after a subsequent tab focus', async () => {
    const read = jest.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second')
    const { result } = renderHook(() => useLiveRepositoryQuery(read))

    await waitFor(() => expect(result.current.data).toBe('first'))
    expect(focusCallback).toBeDefined()
    act(() => focusCallback?.())
    act(() => focusCallback?.())

    await waitFor(() => expect(result.current.data).toBe('second'))
    expect(read).toHaveBeenCalledTimes(2)
  })

  it('reports a rejection and exits loading state', async () => {
    const cause = new Error('read failed')
    const read = jest.fn().mockRejectedValue(cause)
    const { result } = renderHook(() => useLiveRepositoryQuery(read))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toBeUndefined()
    expect(mockedLogger.error).toHaveBeenCalledWith('Native repository query failed', cause)
  })

  it('drops a resolution that arrives after unmount', async () => {
    let resolve!: (value: string) => void
    const read = jest.fn().mockReturnValue(
      new Promise<string>((nextResolve) => {
        resolve = nextResolve
      }),
    )
    const { result, unmount } = renderHook(() => useLiveRepositoryQuery(read))

    unmount()
    await act(async () => resolve('late'))

    expect(result.current.data).toBeUndefined()
    expect(result.current.isLoading).toBe(true)
  })
})
