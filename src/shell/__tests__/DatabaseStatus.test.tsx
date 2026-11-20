import { fireEvent, render, screen } from '@testing-library/react-native'

import { DatabaseError, DatabaseLoading } from '../DatabaseStatus'

it('shows the app name and database loading message', () => {
  render(<DatabaseLoading />)
  expect(screen.getByTestId('database-loading')).toBeTruthy()
  expect(screen.getByText('نبض')).toBeTruthy()
  expect(screen.getByText('جارٍ تجهيز بيانات نبض…')).toBeTruthy()
})

it('explains the database failure and retries', () => {
  const retry = jest.fn()
  render(<DatabaseError onRetry={retry} />)
  expect(screen.getByTestId('database-error')).toBeTruthy()
  expect(screen.getByText('تعذر تجهيز بيانات نبض.')).toBeTruthy()
  expect(screen.getByText('بياناتك لم تُمس. أعد المحاولة، وإن تكرر أعد تشغيل التطبيق.')).toBeTruthy()
  fireEvent.press(screen.getByRole('button', { name: 'إعادة المحاولة' }))
  expect(retry).toHaveBeenCalledTimes(1)
})
