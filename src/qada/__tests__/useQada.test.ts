import { act, renderHook, waitFor } from '@testing-library/react-native'

import type { QadaEvent, QadaRepository } from '../../db/contracts'

import { createQadaRepository, restoreQadaPrayer } from '../db'
import { useQada } from '../useQada'

jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }))
jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))
jest.mock('../db', () => ({ createQadaRepository: jest.fn(), restoreQadaPrayer: jest.fn() }))

const { useSQLiteContext } = jest.requireMock('expo-sqlite') as {
  useSQLiteContext: jest.Mock
}
const mockedCreateQadaRepository = createQadaRepository as jest.MockedFunction<
  typeof createQadaRepository
>
const NOW = 1_755_000_000_000

function event(prayerId: QadaEvent['prayerId'], delta: number): QadaEvent {
  return { id: `${prayerId}-${delta}`, prayerId, delta, at: NOW }
}

describe('useQada', () => {
  let repository: jest.Mocked<QadaRepository>

  beforeEach(() => {
    jest.clearAllMocks()
    useSQLiteContext.mockReturnValue({})
    repository = {
      listQadaEvents: jest.fn(),
      addQadaDebt: jest.fn().mockResolvedValue({ ok: true, value: null }),
      payQadaPrayer: jest.fn().mockResolvedValue({ ok: true, value: null }),
    }
    mockedCreateQadaRepository.mockReturnValue(repository)
    jest.spyOn(Date, 'now').mockReturnValue(NOW)
  })

  afterEach(() => jest.restoreAllMocks())

  it('loads debt and refreshes rows after paying a prayer', async () => {
    repository.listQadaEvents
      .mockResolvedValueOnce([event('fajr', 2)])
      .mockResolvedValueOnce([event('fajr', 1)])
    const { result } = renderHook(() => useQada())

    await waitFor(() => expect(result.current.remaining.fajr).toBe(2), { timeout: 5000 })
    await act(async () => {
      await result.current.payPrayer('fajr')
    })

    expect(repository.payQadaPrayer).toHaveBeenCalledTimes(1)
    expect(repository.payQadaPrayer).toHaveBeenCalledWith('fajr', NOW)
    await waitFor(() => expect(result.current.remaining.fajr).toBe(1))
  })

  it('adds debt with the injected timestamp and refreshes all rows', async () => {
    repository.listQadaEvents
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([event('fajr', 3), event('dhuhr', 3)])
    const { result } = renderHook(() => useQada())

    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 })
    await act(async () => {
      await result.current.addDebt(3)
    })

    expect(repository.addQadaDebt).toHaveBeenCalledTimes(1)
    expect(repository.addQadaDebt).toHaveBeenCalledWith(3, NOW)
    await waitFor(() => expect(result.current.remaining.fajr).toBe(3))
  })
  it('restores only the selected prayer and refreshes after undo', async () => {
    repository.listQadaEvents
      .mockResolvedValueOnce([event('fajr', 1)])
      .mockResolvedValueOnce([event('fajr', 2)])
    const restore = restoreQadaPrayer as jest.MockedFunction<typeof restoreQadaPrayer>
    restore.mockResolvedValue({ ok: true, value: null })
    const { result } = renderHook(() => useQada())
    await waitFor(() => expect(result.current.remaining.fajr).toBe(1), { timeout: 5000 })
    await act(async () => {
      await result.current.undoPrayer('fajr')
    })
    expect(restore).toHaveBeenCalledWith({}, 'fajr', NOW)
    await waitFor(() => expect(result.current.remaining.fajr).toBe(2))
  })

  it('returns failure and does not refresh when payment fails', async () => {
    repository.listQadaEvents.mockResolvedValue([event('fajr', 1)])
    repository.payQadaPrayer.mockResolvedValue({ ok: false, error: 'pay_failed' })
    const { result } = renderHook(() => useQada())
    await waitFor(() => expect(result.current.remaining.fajr).toBe(1), { timeout: 5000 })
    let succeeded = true
    await act(async () => {
      succeeded = await result.current.payPrayer('fajr')
    })
    expect(succeeded).toBe(false)
    expect(repository.listQadaEvents).toHaveBeenCalledTimes(1)
  })
})
