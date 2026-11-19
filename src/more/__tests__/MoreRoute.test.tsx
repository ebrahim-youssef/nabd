import { render, screen, fireEvent } from '@testing-library/react-native'

import { QADA_COPY } from '../../qada/copy'
import { MoreRoute } from '../MoreRoute'

const mockPush = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('lucide-react-native', () => ({
  ArrowRight: () => null,
  ChevronLeft: () => null,
}))

beforeEach(() => mockPush.mockReset())

describe('MoreRoute', () => {
  it.each([
    ['مواقيت الصلاة', '/prayer-times'],
    ['الإحصائيات', '/stats'],
    [QADA_COPY.pageTitle, '/qada'],
    ['النيات', '/niyyat'],
    ['المكتبات', '/libraries'],
    ['الإعدادات', '/settings'],
    ['النسخ الاحتياطي', '/backup'],
  ])('opens %s at %s', async (label, href) => {
    render(<MoreRoute />)

    await fireEvent.press(screen.getByText(label))

    expect(mockPush).toHaveBeenCalledWith(href)
  })
})
