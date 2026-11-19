import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { CountdownToggle } from '../CountdownToggle'
import { useCountdownPreference } from '../useCountdownPreference'
import { requestPrayerReschedule } from '../../device/prayerAlarms'

jest.mock('../useCountdownPreference', () => ({ useCountdownPreference: jest.fn() }))
jest.mock('../../device/prayerAlarms', () => ({ requestPrayerReschedule: jest.fn() }))
const setEnabled = jest.fn(async (): Promise<void> => undefined)

describe('CountdownToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(useCountdownPreference).mockReturnValue({ enabled: false, setEnabled })
  })
  it('writes the preference before requesting a reschedule', async () => {
    render(<CountdownToggle disabled={false} />)
    fireEvent.press(screen.getByRole('switch'))
    await waitFor(() => expect(requestPrayerReschedule).toHaveBeenCalled())
    expect(setEnabled).toHaveBeenCalledWith(true)
  })
  it('waits for the preference write to resolve before rescheduling', async () => {
    let finishWrite: () => void = () => undefined
    setEnabled.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishWrite = resolve
        }),
    )
    render(<CountdownToggle disabled={false} />)

    fireEvent.press(screen.getByRole('switch'))
    expect(setEnabled).toHaveBeenCalledWith(true)
    expect(requestPrayerReschedule).not.toHaveBeenCalled()

    await act(async () => finishWrite())
    expect(requestPrayerReschedule).toHaveBeenCalledTimes(1)
  })
  it('explains why the switch is disabled', () => {
    render(<CountdownToggle disabled disabledReason="افتح الإعدادات" />)
    expect(screen.getByText('افتح الإعدادات')).toBeTruthy()
    expect(screen.getByRole('switch').props.accessibilityState.disabled).toBe(true)
  })
})
