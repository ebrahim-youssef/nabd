import { act, renderHook, waitFor } from '@testing-library/react-native'
import { useFocusEffect } from 'expo-router'

import { captureException } from '../../observability/sentry'
import { useLiveRepositoryQuery } from '../useLiveRepositoryQuery'

jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }))
jest.mock('../../observability/sentry', () => ({ captureException: jest.fn() }))

const mockedCaptureException = captureException as jest.MockedFunction<typeof captureException>
const mockedUseFocusEffect = useFocusEffect as jest.MockedFunction<typeof useFocusEffect>

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

  it('re-reads the repository after refresh', async () => {
    const read = jest.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second')
    const { result } = renderHook(() => useLiveRepositoryQuery(read))

    await waitFor(() => expect(result.current.data).toBe('first'))
    act(() => result.current.refresh())
    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.data).toBe('second'))
    expect(read).toHaveBeenCalledTimes(2)
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
    expect(mockedCaptureException).toHaveBeenCalledWith(cause)
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
