import { render, screen, waitFor } from '@testing-library/react-native'

import { DiagnosticScreen } from '../DiagnosticScreen'

// Injected rather than read from the environment: expoConfig is not populated under jest, and the
// component must not invent a version when it cannot read one.
const SDK_VERSION = '57.0.0'

describe('DiagnosticScreen', () => {
  it('renders runtime diagnostics and resolves the shared workspace import', async () => {
    render(<DiagnosticScreen loadSchemaVersion={async () => 1} sdkVersion={SDK_VERSION} />)

    expect(screen.getByTestId('diagnostic-screen')).toBeOnTheScreen()
    expect(screen.getByText(new RegExp(SDK_VERSION.replaceAll('.', '\\.')))).toBeOnTheScreen()
    expect(screen.getByText(/ar-EG/)).toBeOnTheScreen()
    expect(screen.getByText(/https:\/\/nabd\.app/)).toBeOnTheScreen()
    await waitFor(() => expect(screen.getByText(/إصدار قاعدة البيانات: 1/)).toBeOnTheScreen())
  })
})
