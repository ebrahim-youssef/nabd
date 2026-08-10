import * as Sentry from '@sentry/react-native'

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim()

if (sentryDsn) {
  Sentry.init({ dsn: sentryDsn, enabled: true })
}

export { Sentry }
