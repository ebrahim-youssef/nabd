import { fireEvent, render, screen, within } from '@testing-library/react-native'

import { INTENTIONS_LIBRARY } from '../../content/intentions'
import { toArabicIndic } from '../../lib/format'
import { INTENTIONS_COPY } from '../copy'

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
      expect(
        within(screen.getByTestId(`deed-${entry.id}`)).getByText(
          `${toArabicIndic(entry.intentions.length)} ${INTENTIONS_COPY.countLabel}`,
        ),
      ).toBeTruthy()
      expect(screen.queryByText(entry.intentions[0].text)).toBeNull()
    }
  })

  it('reveals and collapses a deed intentions list when pressed', () => {
    const entry = INTENTIONS_LIBRARY[0]
    render(<IntentionsRoute />)

    const deed = within(screen.getByTestId(`deed-${entry.id}`)).getByRole('button')
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
    fireEvent.press(within(screen.getByTestId(`deed-${entry.id}`)).getByRole('button'))

    expect(screen.getByText(intention.text)).toBeTruthy()
    expect(screen.queryByTestId(`deed-evidence-${entry.id}-${intentionIndex}`)).toBeNull()
  })

  it('closes the open deed when another deed is opened', () => {
    const [first, second] = INTENTIONS_LIBRARY
    render(<IntentionsRoute />)

    fireEvent.press(within(screen.getByTestId(`deed-${first.id}`)).getByRole('button'))
    expect(screen.getByText(first.intentions[0].text)).toBeTruthy()
    fireEvent.press(within(screen.getByTestId(`deed-${second.id}`)).getByRole('button'))

    expect(screen.queryByText(first.intentions[0].text)).toBeNull()
    expect(screen.getByText(second.intentions[0].text)).toBeTruthy()
  })
})
