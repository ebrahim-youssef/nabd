import { render, screen } from '@testing-library/react-native'

import { DhikrCounter } from '../DhikrCounter'
import { useDhikrCounter } from '../useDhikrCounter'

jest.mock('../useDhikrCounter', () => ({ useDhikrCounter: jest.fn() }))

const mockedUseDhikrCounter = useDhikrCounter as jest.MockedFunction<typeof useDhikrCounter>

describe('DhikrCounter', () => {
  it('renders the Arabic-Indic count badge', async () => {
    mockedUseDhikrCounter.mockReturnValue({ count: 2, tap: jest.fn() })

    await render(
      <DhikrCounter day="2026-09-14" itemId="item" label="ذكر" target={3} done={false} />,
    )

    expect(screen.getByTestId('dhikr-count-item')).toHaveTextContent('٢/٣')
  })

  it.each(['الحبيبتان', 'الباقيات الصالحات'])(
    'keeps the count badge visible for the long label %s',
    async (label) => {
      mockedUseDhikrCounter.mockReturnValue({ count: 2, tap: jest.fn() })

      await render(
        <DhikrCounter day="2026-09-14" itemId="long-label" label={label} target={3} done={false} />,
      )

      expect(screen.getByText(label).props.className).toEqual(expect.stringContaining('flex-1'))
      expect(screen.getByText(label).props.className).toEqual(expect.stringContaining('min-w-0'))
      expect(screen.getByTestId('dhikr-count-long-label').props.className).toEqual(
        expect.stringContaining('shrink-0'),
      )
    },
  )

  it('renders the check state instead of the count badge when done', async () => {
    mockedUseDhikrCounter.mockReturnValue({ count: 3, tap: jest.fn() })

    await render(<DhikrCounter day="2026-09-14" itemId="item" label="ذكر" target={3} done />)

    expect(screen.getByText('✓')).toBeTruthy()
    expect(screen.getByTestId('dhikr-check-item').props.className).toEqual(
      expect.stringContaining('shrink-0'),
    )
    expect(screen.queryByTestId('dhikr-count-item')).toBeNull()
  })
})
