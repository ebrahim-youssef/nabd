import { fireEvent, render, screen } from '@testing-library/react-native'

import { COPY as ONBOARDING_COPY } from '../../onboarding/copy'

import { useBatteryOptimization } from '../../device/useBatteryOptimization'
import { BatterySection } from '../BatterySection'

jest.mock('../../device/useBatteryOptimization', () => ({
  useBatteryOptimization: jest.fn(),
}))

const mockedUseBatteryOptimization = useBatteryOptimization as jest.MockedFunction<
  typeof useBatteryOptimization
>

describe('BatterySection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders nothing when battery optimization is unsupported', async () => {
    mockedUseBatteryOptimization.mockReturnValue({
      status: 'unsupported',
      request: jest.fn(),
    })

    await render(<BatterySection />)

    expect(screen.queryByTestId('settings-battery')).toBeNull()
  })

  it('shows the battery guidance and requests protection when optimized', async () => {
    const request = jest.fn()
    mockedUseBatteryOptimization.mockReturnValue({ status: 'optimized', request })

    await render(<BatterySection />)

    expect(screen.getByTestId('settings-battery')).toBeTruthy()
    expect(screen.getByText(ONBOARDING_COPY.powerBody)).toBeTruthy()
    for (const step of ONBOARDING_COPY.powerSteps) {
      expect(screen.getByText(step)).toBeTruthy()
    }
    expect(screen.getByTestId('settings-battery-enable')).toHaveTextContent(
      ONBOARDING_COPY.powerButton,
    )

    await fireEvent.press(screen.getByTestId('settings-battery-enable'))

    expect(request).toHaveBeenCalledTimes(1)
  })

  it('shows that protection is enabled without an enable button when exempt', async () => {
    mockedUseBatteryOptimization.mockReturnValue({ status: 'exempt', request: jest.fn() })

    await render(<BatterySection />)

    expect(screen.getByTestId('settings-battery-protected')).toHaveTextContent(
      'حماية التنبيهات مفعّلة.',
    )
    expect(screen.queryByTestId('settings-battery-enable')).toBeNull()
  })

  it('updates from optimized guidance to enabled protection when the status is reread', async () => {
    mockedUseBatteryOptimization.mockReturnValue({ status: 'optimized', request: jest.fn() })

    const { rerender } = await render(<BatterySection />)

    expect(screen.getByTestId('settings-battery-enable')).toBeTruthy()

    mockedUseBatteryOptimization.mockReturnValue({ status: 'exempt', request: jest.fn() })
    await rerender(<BatterySection />)

    expect(screen.getByTestId('settings-battery-protected')).toBeTruthy()
    expect(screen.queryByTestId('settings-battery-enable')).toBeNull()
  })
})
