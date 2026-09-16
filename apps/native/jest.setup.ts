jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'ar-EG' }] }))
jest.mock('expo-constants', () => ({ expoConfig: { sdkVersion: '55.0.0' } }))
jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context')
  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  }
})
jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  init: jest.fn(),
  wrap: (component: unknown) => component,
}))
