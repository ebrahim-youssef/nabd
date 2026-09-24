import { createNetInfoConnectivityProvider, mapNetInfoState } from '../connectivity'

describe('connectivity provider', () => {
  it.each([
    [{ isConnected: null, isInternetReachable: null }, 'unknown'],
    [{ isConnected: true, isInternetReachable: null }, 'online'],
    [{ isConnected: true, isInternetReachable: false }, 'offline'],
    [{ isConnected: false, isInternetReachable: true }, 'offline'],
  ] as const)('maps NetInfo state %# to %s', (state, expected) => {
    expect(mapNetInfoState(state)).toBe(expected)
  })

  it('uses NetInfo fetch and subscription state for native connectivity', async () => {
    let subscriber:
      ((state: { isConnected: boolean; isInternetReachable: boolean }) => void) | undefined
    const fetch = jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true })
    const netInfo = {
      fetch,
      addEventListener: jest.fn((listener) => {
        subscriber = listener
        return jest.fn()
      }),
    }
    const provider = createNetInfoConnectivityProvider(netInfo)

    expect(fetch).not.toHaveBeenCalled()
    await provider.refresh()

    expect(provider.getState()).toBe('online')
    const onChange = jest.fn()
    provider.subscribe(onChange)
    subscriber?.({ isConnected: false, isInternetReachable: false })

    expect(provider.getState()).toBe('offline')
    expect(onChange).toHaveBeenCalledWith('offline')
  })

  it('falls back to unknown when NetInfo fetch fails', async () => {
    const provider = createNetInfoConnectivityProvider({
      fetch: jest.fn().mockRejectedValue(new Error('network unavailable')),
      addEventListener: jest.fn(() => jest.fn()),
    })

    await expect(provider.refresh()).resolves.toBe('unknown')
    expect(provider.getState()).toBe('unknown')
  })
})
