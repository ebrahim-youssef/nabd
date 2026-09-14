jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'ar-EG' }] }))
jest.mock('expo-constants', () => ({ expoConfig: { sdkVersion: '55.0.0' } }))
jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  init: jest.fn(),
  wrap: (component: unknown) => component,
}))
