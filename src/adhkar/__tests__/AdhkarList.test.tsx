import { fireEvent, render, screen } from '@testing-library/react-native'
import type { AdhkarCategory } from '../../content/adhkar'

import { COPY as ADHKAR_COPY } from '../copy'

import { AdhkarList } from '../AdhkarList'

jest.mock('lucide-react-native', () => ({ Check: () => null, RotateCcw: () => null }))

const CATEGORY: AdhkarCategory = {
  id: 'sleep',
  title: 'أذكار النوم',
  items: [
    { id: 'sleep-1', text: 'ذكر النوم', repeat: 2, virtue: 'فضل الذكر' },
    { id: 'sleep-2', text: 'ذكر آخر', repeat: 1 },
  ],
}

describe('AdhkarList', () => {
  it('shows virtues, progress tracks, completion, and reset controls', async () => {
    await render(<AdhkarList category={CATEGORY} />)

    expect(screen.getByText('فضل الذكر')).toBeTruthy()
    expect(screen.getByTestId('adhkar-list-track-sleep-1').props.className).toContain(
      'bg-surface-2',
    )
    expect(screen.getByTestId('adhkar-list-progress-sleep-1')).toHaveTextContent('٠/٢')

    await fireEvent.press(screen.getByTestId('adhkar-list-count-sleep-1'))
    await fireEvent.press(screen.getByTestId('adhkar-list-count-sleep-1'))

    expect(screen.getByText(ADHKAR_COPY.done)).toBeTruthy()
    expect(screen.getByTestId('adhkar-list-progress-sleep-1')).toHaveTextContent('٢/٢')
    expect(screen.getByTestId('adhkar-list-count-sleep-1').props.accessibilityState).toEqual({
      disabled: true,
    })
    await fireEvent.press(screen.getByTestId('adhkar-list-count-sleep-1'))
    expect(screen.getByTestId('adhkar-list-progress-sleep-1')).toHaveTextContent('٢/٢')

    await fireEvent.press(screen.getByTestId('adhkar-list-reset-sleep-1'))

    expect(screen.getByTestId('adhkar-list-progress-sleep-1')).toHaveTextContent('٠/٢')
    expect(screen.queryByText(ADHKAR_COPY.done)).toBeNull()
  })
})
