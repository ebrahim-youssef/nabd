import { createConnectivityProvider, createNetInfoConnectivityProvider } from '../connectivity'

describe('connectivity provider', () => {
  it('reads online state and notifies subscribers when the source changes', () => {
    const listeners = new Map<string, () => void>()
    const source = {
      onLine: true,
      addEventListener: (name: string, listener: () => void) => listeners.set(name, listener),
      removeEventListener: (name: string) => listeners.delete(name),
    }
    const provider = createConnectivityProvider(source)
    const onChange = jest.fn()
    const unsubscribe = provider.subscribe(onChange)

    expect(provider.getState()).toBe('online')
    source.onLine = false
    listeners.get('offline')?.()
    expect(onChange).toHaveBeenCalledWith('offline')

    unsubscribe()
    source.onLine = true
    listeners.get('online')?.()
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('reports unknown when the runtime does not expose online state', () => {
    expect(createConnectivityProvider({}).getState()).toBe('unknown')
  })

  it('uses NetInfo fetch and subscription state for native connectivity', async () => {
    let subscriber: ((state: { isConnected: boolean; isInternetReachable: boolean }) => void) | undefined
    const netInfo = {
      fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
      addEventListener: jest.fn((listener) => {
        subscriber = listener
        return jest.fn()
      }),
    }
    const provider = createNetInfoConnectivityProvider(netInfo)
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
