import { toArabicIndic, WIRD_COPY } from '@nabd/shared'
import { render, screen } from '@testing-library/react-native'

import { TodaySummary } from '../TodaySummary'
import { useWirdDay } from '../WirdDayProvider'

jest.mock('../WirdDayProvider', () => ({ useWirdDay: jest.fn() }))

const mockedUseWirdDay = useWirdDay as jest.MockedFunction<typeof useWirdDay>

function areas(done: number, total: number, voluntaryDone = 0, voluntaryTotal = 0) {
  return [
    {
      id: 'area',
      label: 'area',
      order: 0,
      items: [
        ...Array.from({ length: total }, (_, index) => ({
          id: `required-${index}`,
          label: `required-${index}`,
          kind: 'checkbox' as const,
          done: index < done,
        })),
        ...Array.from({ length: voluntaryTotal }, (_, index) => ({
          id: `voluntary-${index}`,
          label: `voluntary-${index}`,
          kind: 'checkbox' as const,
          done: index < voluntaryDone,
          optional: true,
        })),
      ],
    },
  ]
}

describe('TodaySummary', () => {
  it('renders nothing when there is no required or voluntary wird', () => {
    mockedUseWirdDay.mockReturnValue({
      isLoading: false,
      areas: [],
      versionId: null,
      refresh: jest.fn(),
      day: '2026-09-14',
    })

    render(<TodaySummary />)

    expect(screen.queryByTestId('today-summary')).toBeNull()
  })

  it.each([
    ['partial', 1, 3, '١', '٣'],
    ['complete', 3, 3, '٣', '٣'],
  ])(
    'renders Arabic-Indic ring counts for %s progress',
    (_, done, total, expectedDone, expectedTotal) => {
      mockedUseWirdDay.mockReturnValue({
        isLoading: false,
        areas: areas(done, total),
        versionId: 'version',
        refresh: jest.fn(),
        day: '2026-09-14',
      })

      render(<TodaySummary />)

      expect(screen.getByTestId('summary-done')).toHaveTextContent(expectedDone)
      expect(screen.getByTestId('summary-total')).toHaveTextContent(expectedTotal)
    },
  )

  it('renders the voluntary progress line separately', () => {
    mockedUseWirdDay.mockReturnValue({
      isLoading: false,
      areas: areas(1, 2, 1, 2),
      versionId: 'version',
      refresh: jest.fn(),
      day: '2026-09-14',
    })

    render(<TodaySummary />)

    expect(screen.getByTestId('summary-voluntary')).toHaveTextContent(
      `${WIRD_COPY.voluntary}: ${toArabicIndic(1)}/${toArabicIndic(2)}`,
    )
  })
})
