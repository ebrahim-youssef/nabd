import { fireEvent, render, screen } from '@testing-library/react-native'

import { INTENTIONS_COPY, INTENTIONS_LIBRARY, toArabicIndic } from '@nabd/shared'

import { IntentionsRoute } from '../IntentionsRoute'

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
}))

jest.mock('lucide-react-native', () => ({
  ArrowRight: () => null,
  ChevronDown: () => null,
  ChevronUp: () => null,
}))

describe('IntentionsRoute', () => {
  it('renders every deed collapsed with its count and introduction', () => {
    render(<IntentionsRoute />)

    expect(screen.getByText(INTENTIONS_COPY.introduction)).toBeTruthy()
    for (const entry of INTENTIONS_LIBRARY) {
      expect(screen.getByTestId(`deed-${entry.id}`)).toBeTruthy()
      expect(screen.getByText(entry.deed)).toBeTruthy()
      expect(screen.getByTestId(`deed-count-${entry.id}`)).toHaveTextContent(
        `${toArabicIndic(entry.intentions.length)} ${INTENTIONS_COPY.countLabel}`,
      )
      expect(screen.queryByText(entry.intentions[0].text)).toBeNull()
    }
  })

  it('reveals and collapses a deed intentions list when pressed', () => {
    const entry = INTENTIONS_LIBRARY[0]
    render(<IntentionsRoute />)

    const deed = screen.getByTestId(`deed-${entry.id}`)
    expect(deed.props.accessibilityState.expanded).toBe(false)

    fireEvent.press(deed)
    expect(screen.getByText(entry.intentions[0].text)).toBeTruthy()
    expect(deed.props.accessibilityState.expanded).toBe(true)

    fireEvent.press(deed)
    expect(screen.queryByText(entry.intentions[0].text)).toBeNull()
    expect(deed.props.accessibilityState.expanded).toBe(false)
  })

  it('renders an intention without an evidence line', () => {
    const entry = INTENTIONS_LIBRARY.find((candidate) =>
      candidate.intentions.some((intention) => !intention.evidence),
    )
    if (!entry) throw new Error('Expected an intention without evidence in the real library')
    const intentionIndex = entry.intentions.findIndex((candidate) => !candidate.evidence)
    const intention = entry.intentions[intentionIndex]
    if (!intention) throw new Error('Expected an intention without evidence in the real library')

    render(<IntentionsRoute />)
    fireEvent.press(screen.getByTestId(`deed-${entry.id}`))

    expect(screen.getByText(intention.text)).toBeTruthy()
    expect(screen.queryByTestId(`deed-evidence-${entry.id}-${intentionIndex}`)).toBeNull()
  })
})
