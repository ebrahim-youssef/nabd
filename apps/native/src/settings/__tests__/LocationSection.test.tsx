import { fireEvent, render, screen } from '@testing-library/react-native'

import { useLocationCapability } from '../../device/useLocationCapability'
import type { LocationCapabilityView } from '../../device/useLocationCapability'
import { LocationSection } from '../LocationSection'

jest.mock('../../device/useLocationCapability', () => ({
  useLocationCapability: jest.fn(),
}))

const mockedUseLocationCapability = useLocationCapability as jest.MockedFunction<
  typeof useLocationCapability
>

const runAction = jest.fn(async () => undefined)

function locationView(
  state: LocationCapabilityView['status']['state'],
  message: string,
  action: LocationCapabilityView['status']['action'],
): LocationCapabilityView {
  return {
    status: { state, message, action },
    coordinates: null,
    isRefreshing: false,
    refresh: jest.fn(async () => undefined),
    runAction,
  }
}

describe('LocationSection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it.each([
    ['ready', 'الموقع جاهز', null],
    [
      'permission-required',
      'اسمح بالموقع',
      { type: 'retry-location', label: 'إعادة محاولة تحديد الموقع' },
    ],
    [
      'settings-required',
      'افتح إعدادات التطبيق',
      { type: 'open-app-settings', label: 'فتح إعدادات التطبيق' },
    ],
    ['gps-disabled', 'فعّل GPS', { type: 'open-location-settings', label: 'فتح إعدادات الموقع' }],
  ] as const)('shows the %s location state and its action', async (state, message, action) => {
    mockedUseLocationCapability.mockReturnValue(locationView(state, message, action))

    await render(<LocationSection />)

    expect(screen.getByTestId('settings-location-message')).toHaveTextContent(message)
    if (action) {
      expect(screen.getByTestId('settings-location-action')).toHaveTextContent(action.label)
    } else {
      expect(screen.queryByTestId('settings-location-action')).toBeNull()
    }
  })

  it('runs the location action exposed by the capability hook', async () => {
    const action = { type: 'retry-location' as const, label: 'إعادة المحاولة' }
    mockedUseLocationCapability.mockReturnValue(
      locationView('permission-required', 'اسمح بالموقع', action),
    )

    await render(<LocationSection />)
    await fireEvent.press(screen.getByTestId('settings-location-action'))

    expect(runAction).toHaveBeenCalledWith('retry-location')
  })
})
