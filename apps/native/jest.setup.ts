jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'ar-EG' }] }))
jest.mock('expo-constants', () => ({ expoConfig: { sdkVersion: '55.0.0' } }))
