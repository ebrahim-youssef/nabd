import { fireEvent, render, screen } from '@testing-library/react-native'
import type { AdhkarCategory, FlowState } from '@nabd/shared'

import { ADHKAR_COPY } from '@nabd/shared'

import { AdhkarFlow } from '../AdhkarFlow'

const mockFlow = {
  state: { index: 0, count: 1, finished: false } as FlowState,
  tap: jest.fn(),
  restart: jest.fn(),
  markedInWird: false,
}

jest.mock('../useAdhkarFlow', () => ({
  useAdhkarFlow: () => mockFlow,
}))

jest.mock('lucide-react-native', () => ({
  ChevronDown: () => null,
  ChevronUp: () => null,
  RotateCcw: () => null,
}))

const CATEGORY: AdhkarCategory = {
  id: 'morning',
  title: 'أذكار الصباح',
  items: [
    { id: 'morning-1', text: 'الذكر الأول', repeat: 2, virtue: 'فضل الأول' },
    { id: 'morning-2', text: 'الذكر الثاني', repeat: 3 },
    { id: 'morning-3', text: 'الذكر الثالث', repeat: 1, virtue: 'فضل الثالث' },
    { id: 'morning-4', text: 'الذكر الرابع', repeat: 4 },
    { id: 'morning-5', text: 'الذكر الخامس', repeat: 1 },
  ],
}

describe('AdhkarFlow', () => {
  beforeEach(() => {
    mockFlow.state = { index: 0, count: 1, finished: false }
    mockFlow.tap.mockReset()
    mockFlow.restart.mockReset()
    mockFlow.markedInWird = false
  })

  it('shows the active track, three upcoming items, and the complete reference', async () => {
    await render(<AdhkarFlow category={CATEGORY} />)

    expect(screen.getByTestId('adhkar-flow-track-morning-1')).toBeTruthy()
    expect(screen.getAllByTestId(/adhkar-flow-next-/)).toHaveLength(3)
    expect(screen.queryByTestId('adhkar-flow-reference')).toBeNull()

    await fireEvent.press(screen.getByTestId('adhkar-flow-reference-toggle'))

    expect(screen.getByTestId('adhkar-flow-reference')).toBeTruthy()
    expect(screen.getAllByTestId(/adhkar-flow-reference-item-/)).toHaveLength(5)
    expect(screen.getByText('فضل الأول')).toBeTruthy()
    expect(screen.getByText('فضل الثالث')).toBeTruthy()
  })

  it('preserves the finished state and restart action', async () => {
    mockFlow.state = { index: 4, count: 1, finished: true }
    mockFlow.markedInWird = true

    await render(<AdhkarFlow category={CATEGORY} />)

    expect(screen.getByText(ADHKAR_COPY.finished)).toBeTruthy()
    expect(screen.getByText(ADHKAR_COPY.markedInWird)).toBeTruthy()
    await fireEvent.press(screen.getByTestId('adhkar-restart-morning'))
    expect(mockFlow.restart).toHaveBeenCalledTimes(1)
  })

  it('keeps the complete reference available after the flow finishes', async () => {
    mockFlow.state = { index: 4, count: 1, finished: true }

    await render(<AdhkarFlow category={CATEGORY} />)
    await fireEvent.press(screen.getByTestId('adhkar-flow-reference-toggle'))

    expect(screen.getAllByTestId(/adhkar-flow-reference-item-/)).toHaveLength(5)
    expect(screen.getByText('فضل الأول')).toBeTruthy()
  })
})
