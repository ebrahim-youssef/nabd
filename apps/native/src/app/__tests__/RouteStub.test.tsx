import { fireEvent, render, screen } from '@testing-library/react-native'

import { shellCopy } from '@nabd/shared'

import { PageHeader } from '../PageHeader'
import { RouteStub } from '../RouteStub'

const mockCanGoBack = jest.fn()
const mockBack = jest.fn()
const mockReplace = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, canGoBack: mockCanGoBack, replace: mockReplace }),
}))

jest.mock('lucide-react-native', () => ({
  ArrowRight: () => null,
}))

describe('RouteStub', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders its title and the not-built hint', () => {
    render(<RouteStub title="عنوان الاختبار" />)

    expect(screen.getByTestId('route-stub')).toBeTruthy()
    expect(screen.getByText('عنوان الاختبار')).toBeTruthy()
    expect(screen.getByText(shellCopy.appNotFoundHint)).toBeTruthy()
  })

  it('uses history when the router can go back', () => {
    mockCanGoBack.mockReturnValue(true)
    render(<PageHeader title="عنوان الاختبار" backHref="/fallback" />)

    fireEvent.press(screen.getByTestId('page-back'))

    expect(mockBack).toHaveBeenCalledTimes(1)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('replaces with backHref when the router cannot go back', () => {
    mockCanGoBack.mockReturnValue(false)
    render(<PageHeader title="عنوان الاختبار" backHref="/fallback" />)

    fireEvent.press(screen.getByTestId('page-back'))

    expect(mockReplace).toHaveBeenCalledWith('/fallback')
    expect(mockBack).not.toHaveBeenCalled()
  })
})
