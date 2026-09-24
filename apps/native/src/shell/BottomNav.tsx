import type { LucideIcon } from 'lucide-react-native'
import { usePathname, useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { shellCopy } from '@nabd/shared'

import { ICON_SIZE, useThemeTokens } from '../../theme/palette'
import { isNavMatch } from './navMatch'
import { Text } from './Text'

type NativeIcons = {
  BarChart3: LucideIcon
  Clock: LucideIcon
  Home: LucideIcon
  LibraryBig: LucideIcon
  Settings: LucideIcon
}

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  match: readonly string[]
  exact?: boolean
  testId: string
}

const NAV_BOTTOM_OFFSET = 12
export const BOTTOM_NAV_CLEARANCE = 80

export function BottomNav() {
  const { BarChart3, Clock, Home, LibraryBig, Settings } =
    require('lucide-react-native') as NativeIcons
  const pathname = usePathname()
  const router = useRouter()
  const theme = useThemeTokens()
  const { bottom } = useSafeAreaInsets()
  // Keep this order aligned with NAV_ORDER.
  const navItems: readonly NavItem[] = [
    {
      href: '/libraries',
      label: shellCopy.nav.libraries,
      icon: LibraryBig,
      match: ['/libraries', '/adhkar', '/niyyat'],
      testId: 'nav-libraries',
    },
    {
      href: '/prayer-times',
      label: shellCopy.nav.prayerTimes,
      icon: Clock,
      match: ['/prayer-times'],
      testId: 'nav-prayer-times',
    },
    {
      href: '/',
      label: shellCopy.nav.home,
      icon: Home,
      match: ['/'],
      exact: true,
      testId: 'nav-home',
    },
    {
      href: '/stats',
      label: shellCopy.nav.stats,
      icon: BarChart3,
      match: ['/stats', '/qada'],
      testId: 'nav-stats',
    },
    {
      href: '/settings',
      label: shellCopy.nav.settings,
      icon: Settings,
      match: ['/settings'],
      testId: 'nav-settings',
    },
  ]

  return (
    <View
      accessibilityLabel={shellCopy.navAriaLabel}
      className="absolute inset-x-0 bottom-0 z-40 px-4"
      style={{ paddingBottom: bottom + NAV_BOTTOM_OFFSET }}
      testID="bottom-nav"
    >
      <View className="mx-auto w-full max-w-md flex-row items-stretch justify-around rounded-chip border border-border bg-surface px-2 py-1 shadow-card">
        {navItems.map(({ href, label, icon: Icon, match, exact, testId }) => {
          const active = isNavMatch(pathname, match, exact)
          const activeStyles = active
            ? {
                container: 'bg-primary shadow-card-sm',
                iconColor: theme.hex['on-primary'],
                label: 'text-label text-on-primary',
              }
            : {
                container: '',
                iconColor: theme.hex['muted-foreground'],
                label: 'text-label text-muted-foreground',
              }
          return (
            <Pressable
              accessibilityLabel={label}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={`flex-1 flex-col items-center gap-0.5 rounded-chip px-0.5 py-1.5 ${activeStyles.container}`}
              key={href}
              onPress={() => router.push(href)}
              testID={testId}
            >
              <Icon accessible={false} color={activeStyles.iconColor} size={ICON_SIZE} />
              <Text className={activeStyles.label}>{label}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
