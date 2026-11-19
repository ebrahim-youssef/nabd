import { render } from '@testing-library/react-native'
import LibrariesRoute from '../../../app/(tabs)/libraries'

jest.mock('expo-router', () => ({ Redirect: jest.fn(() => null) }))
import { Redirect } from 'expo-router'

it('redirects legacy library links to More', () => {
  render(<LibrariesRoute />)
  expect((Redirect as jest.Mock).mock.calls[0][0]).toEqual(
    expect.objectContaining({ href: '/more' }),
  )
})
