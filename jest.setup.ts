jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'ar-EG' }] }))
jest.mock('expo-constants', () => ({ expoConfig: { sdkVersion: '55.0.0' } }))
jest.mock('./src/observability/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))
jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context')
  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  }
})
