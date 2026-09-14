import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { Share } from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'

import { createPreferencesRepository, PREFERENCE_KEYS } from '../../preferences/db'
import { CompletionCelebration } from '../CompletionCelebration'
import { useWirdDay } from '../WirdDayProvider'

jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))
jest.mock('../../preferences/db', () => ({
  PREFERENCE_KEYS: { celebratedDay: 'nabd:celebrated-day' },
  createPreferencesRepository: jest.fn(),
}))
jest.mock('../WirdDayProvider', () => ({ useWirdDay: jest.fn() }))

const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>
const mockedCreatePreferencesRepository = createPreferencesRepository as jest.MockedFunction<
  typeof createPreferencesRepository
>
const mockedUseWirdDay = useWirdDay as jest.MockedFunction<typeof useWirdDay>
const DAY = '2026-09-14'

describe('CompletionCelebration', () => {
  it('fires once per day from the persisted preference and shares through the core API', async () => {
    const read = jest.fn().mockResolvedValueOnce(null).mockResolvedValue(DAY)
    const write = jest.fn().mockResolvedValue(undefined)
    const preferences = { read, write, clear: jest.fn() }
    mockedUseSQLiteContext.mockReturnValue({} as never)
    mockedCreatePreferencesRepository.mockReturnValue(preferences)
    mockedUseWirdDay.mockReturnValue({
      isLoading: false,
      areas: [
        {
          id: 'area',
          label: 'Area',
          order: 0,
          items: [{ id: 'item', label: 'Item', kind: 'checkbox', done: true }],
        },
      ],
      versionId: 'version',
      refresh: jest.fn(),
      day: DAY,
    })
    jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' })

    const first = render(<CompletionCelebration />)
    await screen.findByTestId('completion-celebration')
    expect(write).toHaveBeenCalledWith(PREFERENCE_KEYS.celebratedDay, DAY, expect.any(Number))

    fireEvent.press(screen.getByTestId('celebration-share'))
    await waitFor(() => expect(Share.share).toHaveBeenCalled())
    expect(Share.share).toHaveBeenCalledWith({ message: expect.any(String) })

    fireEvent.press(screen.getByTestId('celebration-dismiss'))
    first.unmount()
    render(<CompletionCelebration />)
    await waitFor(() => expect(screen.queryByTestId('completion-celebration')).toBeNull())
  })
})
