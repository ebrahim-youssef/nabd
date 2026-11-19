import { fireEvent, render, screen } from '@testing-library/react-native'

import { useBatteryOptimization } from '../../device/useBatteryOptimization'
import { COPY as ONBOARDING_COPY } from '../../onboarding/copy'
import { BatterySection } from '../BatterySection'

jest.mock('../../device/useBatteryOptimization', () => ({ useBatteryOptimization: jest.fn() }))
jest.mock('lucide-react-native', () => ({ TriangleAlert: () => null }))

const mockedUseBatteryOptimization = useBatteryOptimization as jest.MockedFunction<
  typeof useBatteryOptimization
>

describe('BatterySection', () => {
  beforeEach(() => jest.clearAllMocks())

  it.each(['unsupported', 'exempt'] as const)(
    'hides the protection card when the status is %s',
    async (status) => {
      mockedUseBatteryOptimization.mockReturnValue({ status, request: jest.fn() })
      await render(<BatterySection />)
      expect(screen.queryByText(ONBOARDING_COPY.powerTitle)).toBeNull()
    },
  )

  it('shows guidance and requests protection when optimized', async () => {
    const request = jest.fn()
    mockedUseBatteryOptimization.mockReturnValue({ status: 'optimized', request })
    await render(<BatterySection />)
    expect(screen.getByText(ONBOARDING_COPY.powerBody)).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: ONBOARDING_COPY.powerButton }))
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('hides the guidance when the reread status is exempt', async () => {
    mockedUseBatteryOptimization.mockReturnValue({ status: 'optimized', request: jest.fn() })
    const { rerender } = await render(<BatterySection />)
    expect(screen.getByText(ONBOARDING_COPY.powerTitle)).toBeTruthy()
    mockedUseBatteryOptimization.mockReturnValue({ status: 'exempt', request: jest.fn() })
    await rerender(<BatterySection />)
    expect(screen.queryByText(ONBOARDING_COPY.powerTitle)).toBeNull()
  })
})
