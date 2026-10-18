import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { AppState } from 'react-native'

import { getCountdownNotificationStatus } from '../../device/countdownNotification'
import { requestPrayerReschedule } from '../../device/prayerAlarms'
import { NATIVE_SETTINGS_COPY } from '../constants'
import { useCountdownPreference } from '../useCountdownPreference'
import { CountdownToggle } from '../CountdownToggle'

jest.mock('../useCountdownPreference', () => ({
  useCountdownPreference: jest.fn(),
}))
jest.mock('../../device/countdownNotification', () => ({
  getCountdownNotificationStatus: jest.fn(),
}))
jest.mock('../../device/prayerAlarms', () => ({
  requestPrayerReschedule: jest.fn(),
}))

const mockedUseCountdownPreference = useCountdownPreference as jest.MockedFunction<
  typeof useCountdownPreference
>
const mockedGetStatus = getCountdownNotificationStatus as jest.MockedFunction<
  typeof getCountdownNotificationStatus
>
const mockedRequestPrayerReschedule = requestPrayerReschedule as jest.MockedFunction<
  typeof requestPrayerReschedule
>
const setEnabled = jest.fn(async () => undefined)
let appStateListener:
  ((state: 'active' | 'background' | 'inactive' | 'unknown' | 'extension') => void) | undefined

describe('CountdownToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseCountdownPreference.mockReturnValue({ enabled: false, setEnabled })
    mockedGetStatus.mockReturnValue('posted')
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      appStateListener = listener
      return { remove: jest.fn() }
    })
    appStateListener = undefined
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('writes the preference when notifications are permitted', async () => {
    await render(<CountdownToggle notificationPermission="granted" notificationsEnabled />)

    await fireEvent(screen.getByTestId('notification-countdown'), 'valueChange', true)

    expect(setEnabled).toHaveBeenCalledWith(true)
    expect(mockedRequestPrayerReschedule).toHaveBeenCalledTimes(1)
  })

  it('requests rescheduling only after the preference write resolves', async () => {
    const events: string[] = []
    setEnabled.mockImplementation(async () => {
      events.push('write')
    })
    mockedRequestPrayerReschedule.mockImplementation(() => {
      events.push('reschedule')
    })

    await render(<CountdownToggle notificationPermission="granted" notificationsEnabled />)
    await fireEvent(screen.getByTestId('notification-countdown'), 'valueChange', true)

    expect(events).toEqual(['write', 'reschedule'])
  })

  it('shows the blocked notification copy only when enabled and the channel is blocked', async () => {
    mockedUseCountdownPreference.mockReturnValue({ enabled: true, setEnabled })
    mockedGetStatus.mockReturnValue('channel-blocked')

    await render(<CountdownToggle notificationPermission="granted" notificationsEnabled />)

    await waitFor(() =>
      expect(screen.getByText(NATIVE_SETTINGS_COPY.notifications.countdownBlocked)).toBeTruthy(),
    )
  })

  it('does not show the blocked notification copy for other states', async () => {
    mockedUseCountdownPreference.mockReturnValue({ enabled: true, setEnabled })

    await render(<CountdownToggle notificationPermission="granted" notificationsEnabled />)

    expect(screen.queryByText(NATIVE_SETTINGS_COPY.notifications.countdownBlocked)).toBeNull()
  })

  it('refreshes the native status when the app becomes active', async () => {
    mockedUseCountdownPreference.mockReturnValue({ enabled: true, setEnabled })

    await render(<CountdownToggle notificationPermission="granted" notificationsEnabled />)
    await waitFor(() => expect(mockedGetStatus).toHaveBeenCalledTimes(1))

    await act(async () => {
      appStateListener?.('active')
    })

    await waitFor(() => expect(mockedGetStatus).toHaveBeenCalledTimes(2))
  })

  it('disables the preference when notifications are not permitted', async () => {
    await render(<CountdownToggle notificationPermission="denied" notificationsEnabled />)

    expect(screen.getByTestId('notification-countdown').props.disabled).toBe(true)
  })

  it('disables the preference when the notifications switch is off', async () => {
    await render(<CountdownToggle notificationPermission="granted" notificationsEnabled={false} />)

    expect(screen.getByTestId('notification-countdown').props.disabled).toBe(true)
  })
})
