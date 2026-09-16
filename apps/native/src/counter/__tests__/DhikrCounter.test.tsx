import { render, screen } from '@testing-library/react-native'

import { DhikrCounter } from '../DhikrCounter'
import { useDhikrCounter } from '../useDhikrCounter'

jest.mock('../useDhikrCounter', () => ({ useDhikrCounter: jest.fn() }))

const mockedUseDhikrCounter = useDhikrCounter as jest.MockedFunction<typeof useDhikrCounter>

describe('DhikrCounter', () => {
  it('renders the Arabic-Indic count badge', () => {
    mockedUseDhikrCounter.mockReturnValue({ count: 2, tap: jest.fn() })

    render(<DhikrCounter day="2026-09-14" itemId="item" label="ذكر" target={3} done={false} />)

    expect(screen.getByTestId('dhikr-count-item')).toHaveTextContent('٢/٣')
  })

  it('renders the check state instead of the count badge when done', () => {
    mockedUseDhikrCounter.mockReturnValue({ count: 3, tap: jest.fn() })

    render(<DhikrCounter day="2026-09-14" itemId="item" label="ذكر" target={3} done />)

    expect(screen.getByText('✓')).toBeTruthy()
    expect(screen.queryByTestId('dhikr-count-item')).toBeNull()
  })
})
