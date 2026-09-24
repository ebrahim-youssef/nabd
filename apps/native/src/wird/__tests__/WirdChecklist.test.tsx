import { fireEvent, render, screen } from '@testing-library/react-native'

import { WirdChecklist } from '../WirdChecklist'
import { useToggleItem } from '../useToggleItem'
import { useWirdDay } from '../WirdDayProvider'

jest.mock('../WirdDayProvider', () => ({ useWirdDay: jest.fn() }))
jest.mock('../useToggleItem', () => ({ useToggleItem: jest.fn() }))

const mockedUseWirdDay = useWirdDay as jest.MockedFunction<typeof useWirdDay>
const mockedUseToggleItem = useToggleItem as jest.MockedFunction<typeof useToggleItem>

const area = {
  id: 'area',
  label: 'Area',
  order: 0,
  items: [
    {
      id: 'item',
      label: 'Item',
      kind: 'checkbox' as const,
      done: false,
      minimum: 'Minimum',
      targetToday: true,
      optional: true,
    },
  ],
}

describe('WirdChecklist', () => {
  beforeEach(() => {
    mockedUseToggleItem.mockReturnValue({
      toggle: jest.fn(),
      pendingItemIds: new Set(),
      hasError: false,
    })
    mockedUseWirdDay.mockReturnValue({
      isLoading: false,
      areas: [area],
      versionId: 'version',
      refresh: jest.fn(),
      day: '2026-09-14',
    })
  })

  it('collapses and expands an area from its pressable header', () => {
    render(<WirdChecklist />)

    fireEvent.press(screen.getByTestId('area-header-area'))
    expect(screen.queryByTestId('area-items-area')).toBeNull()

    fireEvent.press(screen.getByTestId('area-header-area'))
    expect(screen.getByTestId('area-items-area')).toBeTruthy()
  })

  it('renders item metadata and the toggle error copy', () => {
    mockedUseToggleItem.mockReturnValue({
      toggle: jest.fn(),
      pendingItemIds: new Set(),
      hasError: true,
    })

    render(<WirdChecklist />)

    expect(screen.getByText('Minimum')).toBeTruthy()
    expect(screen.getByText('اليوم مستحب')).toBeTruthy()
    expect(screen.getByText('تطوّع')).toBeTruthy()
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  it('keeps the mounted list visible while repository data refreshes', () => {
    const { rerender } = render(<WirdChecklist />)
    const checklist = screen.getByTestId('wird-checklist')

    mockedUseWirdDay.mockReturnValue({
      isLoading: true,
      areas: [area],
      versionId: 'version',
      refresh: jest.fn(),
      day: '2026-09-14',
    })
    rerender(<WirdChecklist />)

    expect(screen.queryByTestId('wird-checklist')).toBe(checklist)
    expect(screen.queryByTestId('wird-checklist-loading')).toBeNull()
  })
})
