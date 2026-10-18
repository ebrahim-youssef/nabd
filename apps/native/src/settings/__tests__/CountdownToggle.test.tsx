import { fireEvent, render, screen } from '@testing-library/react-native'

import { useCountdownPreference } from '../useCountdownPreference'
import { CountdownToggle } from '../CountdownToggle'

jest.mock('../useCountdownPreference', () => ({
  useCountdownPreference: jest.fn(),
}))

const mockedUseCountdownPreference = useCountdownPreference as jest.MockedFunction<
  typeof useCountdownPreference
>
const setEnabled = jest.fn(async () => undefined)

describe('CountdownToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseCountdownPreference.mockReturnValue({ enabled: false, setEnabled })
  })

  it('writes the preference when notifications are permitted', async () => {
    await render(<CountdownToggle notificationPermission="granted" />)

    await fireEvent(screen.getByTestId('notification-countdown'), 'valueChange', true)

    expect(setEnabled).toHaveBeenCalledWith(true)
  })

  it('disables the preference when notifications are not permitted', async () => {
    await render(<CountdownToggle notificationPermission="denied" />)

    expect(screen.getByTestId('notification-countdown').props.disabled).toBe(true)
  })
})
