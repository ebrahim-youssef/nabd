// pnpm stores packages under node_modules/.pnpm/<name>@<version>/node_modules/<name>, so the
// usual `node_modules/(?!react-native|expo|...)` pattern never sees the package name: the
// lookahead is evaluated against `.pnpm/` and every React Native package is left untransformed,
// which surfaces as "Cannot use import statement outside a module" from the RN jest preset.
// Match on the .pnpm directory name instead.
const TRANSFORMED_NATIVE_PACKAGES = [
  'react-native',
  'expo',
  'sentry\\+react-native',
  'nativewind',
  'css-interop',
]

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  transformIgnorePatterns: [
    `node_modules/\\.pnpm/(?!.*(${TRANSFORMED_NATIVE_PACKAGES.join('|')}))`,
  ],
}
