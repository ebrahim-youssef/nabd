import { fireEvent, render, screen } from '@testing-library/react-native'

import { useLocationCapability } from '../../device/useLocationCapability'
import type { LocationCapabilityView } from '../../device/useLocationCapability'
import { LocationSection } from '../LocationSection'
import { SETTINGS_LAYOUT_COPY } from '../copy'

jest.mock('../../device/useLocationCapability', () => ({ useLocationCapability: jest.fn() }))
jest.mock('lucide-react-native', () => ({ ChevronLeft: () => null }))

const mockedUseLocationCapability = useLocationCapability as jest.MockedFunction<
  typeof useLocationCapability
>
const runAction = jest.fn(async () => undefined)
const refresh = jest.fn(async () => undefined)

function locationView(
  state: LocationCapabilityView['status']['state'],
  message: string,
  action: LocationCapabilityView['status']['action'],
): LocationCapabilityView {
  return {
    permission: 'undetermined',
    status: { state, message, action },
    coordinates: null,
    hasReadCache: true,
    isRefreshing: false,
    refresh,
    runAction,
  }
}

describe('LocationSection', () => {
  beforeEach(() => jest.clearAllMocks())

  it.each([
    ['permission-required', 'اسمح بالموقع', { type: 'retry-location', label: 'إعادة المحاولة' }],
    [
      'settings-required',
      'افتح إعدادات التطبيق',
      { type: 'open-app-settings', label: 'فتح إعدادات التطبيق' },
    ],
    ['gps-disabled', 'فعّل GPS', { type: 'open-location-settings', label: 'فتح إعدادات الموقع' }],
  ] as const)('shows the %s state and runs its action', async (state, message, action) => {
    mockedUseLocationCapability.mockReturnValue(locationView(state, message, action))
    await render(<LocationSection />)
    expect(screen.getByText(message)).toBeTruthy()
    expect(screen.getByText(SETTINGS_LAYOUT_COPY.locationDescription)).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: action.label }))
    expect(runAction).toHaveBeenCalledWith(action.type)
  })

  it('offers a forced refresh in the ready state', async () => {
    mockedUseLocationCapability.mockReturnValue(locationView('ready', 'تم تحديد الموقع.', null))
    await render(<LocationSection />)
    await fireEvent.press(
      screen.getByRole('button', { name: SETTINGS_LAYOUT_COPY.locationRefresh }),
    )
    expect(refresh).toHaveBeenCalledWith({ force: true })
  })

  it('disables refresh while refreshing', async () => {
    mockedUseLocationCapability.mockReturnValue({
      ...locationView('ready', 'تم تحديد الموقع.', null),
      isRefreshing: true,
    })
    await render(<LocationSection />)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
