module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  // Transform everything, including node_modules. React Native, Expo and jest-expo's own preset
  // all ship untranspiled ESM, and the conventional allowlist pattern kept missing one of them
  // (jest-expo/src/preset/setup.js was the last), each miss surfacing as the same opaque
  // "Cannot use import statement outside a module". The suite runs in about two seconds, so the
  // cost of transforming everything is not worth the maintenance of an allowlist that silently
  // breaks whenever a dependency is added.
  transformIgnorePatterns: [],
}
