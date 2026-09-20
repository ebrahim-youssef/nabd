import {
  CALCULATION_METHODS,
  DEFAULT_METHOD_ID,
  SETTINGS_COPY,
  WIRD_LEVELS,
  shellCopy,
  toDayId,
  type CalculationMethodId,
  type Mode,
  type Theme,
} from '@nabd/shared'
import { useRouter } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { useColorScheme } from 'nativewind'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { ScreenContainer } from '../app/ScreenContainer'
import {
  createPreferencesRepository,
  PREFERENCE_KEYS,
  readStoredMode,
  readStoredTheme,
} from '../preferences/db'
import { useWirdLevel } from '../wird/useWirdLevel'

type SettingsState = {
  theme: Theme
  mode: Mode
  methodId: CalculationMethodId
}

const THEME_OPTIONS: readonly { id: Theme; label: string }[] = [
  { id: 'light', label: SETTINGS_COPY.appearance.light },
  { id: 'dark', label: SETTINGS_COPY.appearance.dark },
]

const MODE_OPTIONS: readonly { id: Mode; label: string; description: string }[] = [
  {
    id: 'classic',
    label: SETTINGS_COPY.appearance.classic.title,
    description: SETTINGS_COPY.appearance.classic.description,
  },
  {
    id: 'modern',
    label: SETTINGS_COPY.appearance.modern.title,
    description: SETTINGS_COPY.appearance.modern.description,
  },
]

function OptionButton({
  label,
  selected,
  onPress,
  testID,
  description,
  disabled = false,
}: {
  label: string
  selected: boolean
  onPress: () => void
  testID: string
  description?: string
  disabled?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      className={`rounded-card border p-3 ${selected ? 'border-primary bg-primary/10' : 'border-border bg-surface'} ${disabled ? 'opacity-50' : ''}`}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
    >
      <Text className="text-body text-start text-foreground">{label}</Text>
      {description ? (
        <Text className="text-small mt-1 text-start text-muted-foreground">{description}</Text>
      ) : null}
    </Pressable>
  )
}

export function SettingsRoute() {
  const database = useSQLiteContext()
  const router = useRouter()
  const { setColorScheme } = useColorScheme()
  const preferences = useMemo(() => createPreferencesRepository(database), [database])
  const { currentLevelId, canChangeLevel, changeLevel, isLoading: isLevelLoading } = useWirdLevel()
  const [hydrated, setHydrated] = useState(false)
  const [state, setState] = useState<SettingsState>({
    theme: 'light',
    mode: 'classic',
    methodId: DEFAULT_METHOD_ID,
  })

  useEffect(() => {
    let active = true
    void Promise.all([
      preferences.read(PREFERENCE_KEYS.theme),
      preferences.read(PREFERENCE_KEYS.mode),
      preferences.read(PREFERENCE_KEYS.calculationMethod),
    ]).then(([theme, mode, method]) => {
      if (!active) return
      const nextTheme = readStoredTheme(theme)
      setState({
        theme: nextTheme,
        mode: readStoredMode(mode),
        methodId: CALCULATION_METHODS.some((entry) => entry.id === method)
          ? (method as CalculationMethodId)
          : DEFAULT_METHOD_ID,
      })
      setColorScheme(nextTheme)
      setHydrated(true)
    })
    return () => {
      active = false
    }
  }, [preferences, setColorScheme])

  function writePreference(
    key: (typeof PREFERENCE_KEYS)[keyof typeof PREFERENCE_KEYS],
    value: string,
    updatedAt: number,
  ) {
    void preferences.write(key, value, updatedAt)
  }

  function changeTheme(theme: Theme, updatedAt: number) {
    setState((previous) => ({ ...previous, theme }))
    setColorScheme(theme)
    writePreference(PREFERENCE_KEYS.theme, theme, updatedAt)
  }

  function changeMode(mode: Mode, updatedAt: number) {
    setState((previous) => ({ ...previous, mode }))
    writePreference(PREFERENCE_KEYS.mode, mode, updatedAt)
  }

  function changeMethod(methodId: CalculationMethodId, updatedAt: number) {
    setState((previous) => ({ ...previous, methodId }))
    writePreference(PREFERENCE_KEYS.calculationMethod, methodId, updatedAt)
  }

  return (
    <ScreenContainer testID="settings-screen">
      <View className="gap-6">
        <Text accessibilityRole="header" className="text-title text-start text-primary">
          {shellCopy.nav.settings}
        </Text>
        {!hydrated ? (
          <Text className="text-body text-start text-muted-foreground">جارٍ تحميل الإعدادات…</Text>
        ) : null}

        <View className="gap-3" testID="settings-appearance">
          <Text className="text-label text-start text-muted-foreground">
            {SETTINGS_COPY.appearance.themeTitle}
          </Text>
          <View className="gap-2" accessibilityRole="radiogroup">
            {THEME_OPTIONS.map((option) => (
              <OptionButton
                key={option.id}
                label={option.label}
                selected={state.theme === option.id}
                onPress={() => changeTheme(option.id, Date.now())}
                testID={`theme-${option.id}`}
              />
            ))}
          </View>
        </View>

        <View className="gap-3" testID="settings-display-mode">
          <Text className="text-label text-start text-muted-foreground">
            {SETTINGS_COPY.appearance.title}
          </Text>
          <View className="gap-2" accessibilityRole="radiogroup">
            {MODE_OPTIONS.map((option) => (
              <OptionButton
                key={option.id}
                label={option.label}
                description={option.description}
                selected={state.mode === option.id}
                onPress={() => changeMode(option.id, Date.now())}
                testID={`mode-${option.id}`}
              />
            ))}
          </View>
        </View>

        <View className="gap-3" testID="settings-prayer-method">
          <Text className="text-label text-start text-muted-foreground">
            {SETTINGS_COPY.prayerMethod.title}
          </Text>
          <View className="gap-2" accessibilityRole="radiogroup">
            {CALCULATION_METHODS.map((method) => (
              <OptionButton
                key={method.id}
                label={method.label}
                selected={state.methodId === method.id}
                onPress={() => changeMethod(method.id, Date.now())}
                testID={`method-${method.id}`}
              />
            ))}
          </View>
        </View>

        <View className="gap-3" testID="settings-level">
          <Text className="text-label text-start text-muted-foreground">
            {SETTINGS_COPY.level.title}
          </Text>
          <Text className="text-body text-start text-foreground">{SETTINGS_COPY.level.label}</Text>
          <View className="gap-2" accessibilityRole="radiogroup">
            {WIRD_LEVELS.map((level) => (
              <OptionButton
                key={level.id}
                label={level.title}
                description={level.description}
                selected={!isLevelLoading && canChangeLevel && currentLevelId === level.id}
                disabled={isLevelLoading || !canChangeLevel}
                onPress={() => void changeLevel(level.id, toDayId(new Date()), Date.now())}
                testID={`level-${level.id}`}
              />
            ))}
          </View>
          <Text className="text-small text-start text-muted-foreground">
            {SETTINGS_COPY.level.hint}
          </Text>
        </View>

        <View className="gap-2" testID="settings-links">
          <Text className="text-label text-start text-muted-foreground">
            {SETTINGS_COPY.links.title}
          </Text>
          {[
            ['/prayer-times', shellCopy.nav.prayerTimes, 'settings-link-prayer-times'],
            ['/libraries', shellCopy.nav.libraries, 'settings-link-libraries'],
            ['/stats', shellCopy.nav.stats, 'settings-link-stats'],
          ].map(([href, label, testID]) => (
            <Pressable
              accessibilityRole="button"
              className="rounded-card border border-border bg-surface p-3"
              key={href}
              onPress={() => router.push(href)}
              testID={testID}
            >
              <Text className="text-body text-start text-primary">{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScreenContainer>
  )
}
