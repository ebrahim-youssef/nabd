import { fireEvent, render, screen } from '@testing-library/react-native'

import NotFoundRoute from '../../../app/+not-found'

const mockReplace = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }))

it('shows the missing page and returns to the home route', () => {
  render(<NotFoundRoute />)
  expect(screen.getByTestId('not-found')).toBeTruthy()
  expect(screen.getByText('الصفحة غير موجودة')).toBeTruthy()
  expect(screen.getByText('الصفحة التي طلبتها غير موجودة.')).toBeTruthy()
  fireEvent.press(screen.getByTestId('not-found-home'))
  expect(mockReplace).toHaveBeenCalledWith('/')
})
