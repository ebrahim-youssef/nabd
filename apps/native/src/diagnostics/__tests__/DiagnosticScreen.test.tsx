import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'

import { DiagnosticScreen } from '../DiagnosticScreen'

// Injected rather than read from the environment: expoConfig is not populated under jest, and the
// component must not invent a version when it cannot read one.
const SDK_VERSION = '57.0.0'
const CAPABILITIES = {
  notificationPermission: 'permanentlyDenied' as const,
  notificationsEnabled: false,
  exactAlarmAccess: true,
  alarmChannels: 'degraded' as const,
  countdownEnabled: true,
  locationPermission: 'granted' as const,
  locationServicesEnabled: false,
}

describe('DiagnosticScreen', () => {
  it('renders runtime diagnostics and resolves the shared workspace import', async () => {
    render(
      <DiagnosticScreen
        loadSchemaVersion={async () => 1}
        loadCapabilityStatus={async () => CAPABILITIES}
        sdkVersion={SDK_VERSION}
      />,
    )

    expect(screen.getByTestId('diagnostic-screen')).toBeOnTheScreen()
    expect(screen.getByText(new RegExp(SDK_VERSION.replaceAll('.', '\\.')))).toBeOnTheScreen()
    expect(screen.getByText(/ar-EG/)).toBeOnTheScreen()
    expect(screen.getByText(/https:\/\/nabd\.app/)).toBeOnTheScreen()
    await waitFor(() => expect(screen.getByText(/إصدار قاعدة البيانات: 1/)).toBeOnTheScreen())
    await waitFor(() => expect(screen.getByText(/مرفوضة نهائيًا/)).toBeOnTheScreen())
    expect(screen.getByText(/المنبّهات الدقيقة: متاح/)).toBeOnTheScreen()
    expect(screen.getByText(/وضع منخفض/)).toBeOnTheScreen()
    expect(screen.getByText(/إشعار العدّ التنازلي: مفعّل/)).toBeOnTheScreen()
    expect(screen.getByText(/خدمة GPS: غير متاح/)).toBeOnTheScreen()
  })

  it('surfaces an unavailable native diagnostics bridge', async () => {
    render(
      <DiagnosticScreen
        loadSchemaVersion={async () => 1}
        loadCapabilityStatus={async () => Promise.reject(new Error('unavailable'))}
        sdkVersion={SDK_VERSION}
      />,
    )

    await waitFor(() => expect(screen.getAllByText(/تعذّر الفحص/).length).toBeGreaterThan(0))
  })

  it('opens actionable settings for permanent denial and exact-alarm access', async () => {
    const openApplicationSettings = jest.fn()
    const openExactAlarmSettings = jest.fn()
    render(
      <DiagnosticScreen
        loadSchemaVersion={async () => 1}
        loadCapabilityStatus={async () => ({ ...CAPABILITIES, exactAlarmAccess: false })}
        openApplicationSettings={openApplicationSettings}
        openExactAlarmSettings={openExactAlarmSettings}
        sdkVersion={SDK_VERSION}
      />,
    )
    const applicationButton = await screen.findByRole('button', {
      name: 'فتح إعدادات التطبيق',
    })
    fireEvent.press(applicationButton)
    fireEvent.press(screen.getByRole('button', { name: 'السماح بالمنبّهات الدقيقة' }))
    expect(openApplicationSettings).toHaveBeenCalledTimes(1)
    expect(openExactAlarmSettings).toHaveBeenCalledTimes(1)
  })
})
