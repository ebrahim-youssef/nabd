import { fireEvent, render, screen } from '@testing-library/react-native'
import { Vibration } from 'react-native'

import type { AdhkarCategory } from '../../content/adhkar'
import { DAILY_ADHKAR_CATEGORY } from '../../content/daily-adhkar'
import { AdhkarReader } from '../AdhkarReader'

const mockFlow = {
  state: { index: 0, count: 0, finished: false },
  tap: jest.fn(),
  restart: jest.fn(),
  markedInWird: false,
}
const mockReplace = jest.fn()
const mockDaily = {
  counts: {} as Record<string, number>,
  failedItems: {} as Record<string, boolean>,
  checklistItems: new Map<
    string,
    { id: string; label: string; kind: 'counter'; target: number; done: boolean }
  >(),
  isLoading: false,
  tap: jest.fn(),
  reset: jest.fn(),
}

jest.mock('../useAdhkarFlow', () => ({ useAdhkarFlow: () => mockFlow }))
jest.mock('../useDailyAdhkarProgress', () => ({ useDailyAdhkarProgress: () => mockDaily }))
jest.mock('../../day-plan/WirdTodayProvider', () => ({ useWirdToday: () => '2026-09-20' }))
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, canGoBack: () => false }),
}))
jest.mock('lucide-react-native', () => ({
  ArrowRight: () => null,
  ChevronDown: () => null,
  ChevronUp: () => null,
}))

const CATEGORY: AdhkarCategory = {
  id: 'morning',
  title: 'أذكار الصباح',
  items: [
    { id: 'a', text: 'الذكر الأول', repeat: 2, virtue: 'فضل الأول' },
    { id: 'b', text: 'الذكر الثاني', repeat: 1 },
    { id: 'c', text: 'الذكر الثالث', repeat: 1 },
  ],
}

beforeEach(() => {
  mockFlow.state = { index: 0, count: 0, finished: false }
  mockFlow.markedInWird = false
  mockDaily.counts = {}
  mockDaily.failedItems = {}
  mockDaily.checklistItems.clear()
  jest.clearAllMocks()
})

it('counts card presses and accessibility increment actions', async () => {
  await render(<AdhkarReader category={CATEGORY} />)
  const card = screen.getByLabelText('الذكر الأول')
  fireEvent.press(card)
  fireEvent(card, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } })
  expect(mockFlow.tap).toHaveBeenCalledTimes(2)
})

it('previews the next two dhikr', async () => {
  await render(<AdhkarReader category={CATEGORY} />)
  expect(screen.getByText('الذكر الثاني')).toBeTruthy()
  expect(screen.getByText('الذكر الثالث')).toBeTruthy()
})

it('vibrates at the target and displays the next saved flow item', async () => {
  mockFlow.state = { index: 0, count: 1, finished: false }
  const vibrate = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {})
  const view = await render(<AdhkarReader category={CATEGORY} />)
  fireEvent.press(screen.getByLabelText('الذكر الأول'))
  expect(vibrate).toHaveBeenCalled()
  mockFlow.state = { index: 1, count: 0, finished: false }
  view.rerender(<AdhkarReader category={CATEGORY} />)
  expect(screen.getByLabelText('الذكر الثاني')).toBeTruthy()
  vibrate.mockRestore()
})

it('resumes the saved first unfinished dhikr and displays its reference progress', async () => {
  mockFlow.state = { index: 1, count: 0, finished: false }
  await render(<AdhkarReader category={CATEGORY} />)
  expect(screen.getByLabelText('الذكر الثاني')).toBeTruthy()
  fireEvent.press(screen.getByText(/كل أذكار القسم/))
  expect(screen.getAllByTestId(/adhkar-reader-item-/)).toHaveLength(3)
  expect(screen.getByTestId('adhkar-reader-item-b')).toHaveTextContent('٠ من ١', { exact: false })
  expect(screen.getByText('فضل الأول')).toBeTruthy()
})

it('shows linked completion and supports back and restart', async () => {
  mockFlow.state = { index: 2, count: 1, finished: true }
  mockFlow.markedInWird = true
  await render(<AdhkarReader category={CATEGORY} />)
  expect(screen.getByText('وعُلّمت في وِردك تلقائيًا ✓')).toBeTruthy()
  fireEvent.press(screen.getByText(/كل أذكار القسم/))
  expect(screen.getAllByTestId(/adhkar-reader-item-/)).toHaveLength(3)
  fireEvent.press(screen.getByText('إعادة'))
  expect(mockFlow.restart).toHaveBeenCalled()
  fireEvent.press(screen.getByText('العودة إلى الأذكار'))
  expect(mockReplace).toHaveBeenCalledWith('/adhkar')
})

it('does not show the linked line for another set', async () => {
  mockFlow.state = { index: 2, count: 1, finished: true }
  mockFlow.markedInWird = true
  await render(<AdhkarReader category={{ ...CATEGORY, id: 'sleep' }} />)
  expect(screen.queryByText('وعُلّمت في وِردك تلقائيًا ✓')).toBeNull()
})

it('reads the daily set sequentially with its live wird target', async () => {
  const category = { ...CATEGORY, id: 'daily' }
  mockDaily.checklistItems.set('a', {
    id: 'a',
    label: 'أ',
    kind: 'counter',
    target: 5,
    done: false,
  })
  await render(<AdhkarReader category={category} />)
  expect(screen.getByLabelText('الذكر الأول').props.accessibilityValue).toMatchObject({
    max: 5,
    now: 0,
  })
  fireEvent.press(screen.getByLabelText('الذكر الأول'))
  expect(mockDaily.tap).toHaveBeenCalledWith(category.items[0], mockDaily.checklistItems.get('a'))
})

it('resumes daily at the first unfinished item and displays a failed completion', async () => {
  mockDaily.checklistItems.set('a', { id: 'a', label: 'أ', kind: 'counter', target: 2, done: true })
  mockDaily.failedItems.b = true
  await render(<AdhkarReader category={{ ...CATEGORY, id: 'daily' }} />)
  expect(screen.getByLabelText('الذكر الثاني')).toBeTruthy()
  expect(screen.getByText('تعذّر الحفظ، اضغط مرة أخرى.')).toBeTruthy()
})

it('provides all five daily items in the sequential reader reference', async () => {
  await render(<AdhkarReader category={DAILY_ADHKAR_CATEGORY} />)
  fireEvent.press(screen.getByText(/كل أذكار القسم/))
  expect(screen.getAllByTestId(/adhkar-reader-item-/)).toHaveLength(5)
})
