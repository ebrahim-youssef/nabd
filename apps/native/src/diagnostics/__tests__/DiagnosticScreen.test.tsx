import { render, screen, waitFor } from '@testing-library/react-native'

import { DiagnosticScreen } from '../DiagnosticScreen'

describe('DiagnosticScreen', () => {
  it('renders runtime diagnostics and resolves the shared workspace import', async () => {
    render(<DiagnosticScreen loadSchemaVersion={async () => 1} />)

    expect(screen.getByTestId('diagnostic-screen')).toBeOnTheScreen()
    expect(screen.getByText(/55\.0\.0/)).toBeOnTheScreen()
    expect(screen.getByText(/ar-EG/)).toBeOnTheScreen()
    expect(screen.getByText(/https:\/\/nabd\.app/)).toBeOnTheScreen()
    await waitFor(() => expect(screen.getByText(/إصدار قاعدة البيانات: 1/)).toBeOnTheScreen())
  })
})
