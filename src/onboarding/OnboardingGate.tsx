import type { LevelId } from '../content/levels'
import type { Answers } from './types'
import { WIRD_LEVELS } from '../content/levels'
import { COPY as SHARED_COPY, QUESTIONS } from './copy'
import { isComplete, levelById, recommendLevel } from './logic'
import { useSQLiteContext } from 'expo-sqlite'
import { useColorScheme } from 'nativewind'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, View } from 'react-native'

import { Text } from '../shell/Text'
import { ScreenContainer } from '../shell/ScreenContainer'
import { HomeScreen } from '../home/HomeScreen'
import { logger } from '../observability/logger'
import { useBatteryOptimization } from '../device/useBatteryOptimization'
import { useLocationCapability } from '../device/useLocationCapability'
import { useNotificationSettings } from '../device/useNotificationSettings'
import { requestPrayerReschedule } from '../device/prayerAlarms'
import { BackupImport } from '../backup/BackupSection'
import { BACKUP_COPY } from '../backup/copy'
import { useBackup } from '../backup/useBackup'
import { createPreferencesRepository, PREFERENCE_KEYS } from '../preferences/db'
import { readStoredTheme } from '../preferences/theme'
import { ONBOARDING_COPY } from './constants'
import { setOnboardingComplete } from './completion'
import { createOnboardingRepository, type PersistedOnboarding } from './db'
import { OnboardingButton } from './OnboardingButton'
import { PermissionsStep } from './PermissionsStep'
import { PowerStep } from './PowerStep'
import { useWirdToday } from '../day-plan/WirdTodayProvider'

type Screen = 'welcome' | 'questions' | 'level' | 'permissions' | 'power'
type GateState =
  | { status: 'loading' }
  | { status: 'ready'; persisted: PersistedOnboarding | null }
  | { status: 'error' }

const LEVEL_VERSION_PREFIX = 'initial-wird-'

type DeviceSetup = {
  battery: ReturnType<typeof useBatteryOptimization>
  location: ReturnType<typeof useLocationCapability>
  notifications: ReturnType<typeof useNotificationSettings>
}

function OnboardingDeviceSetup({ children }: { children: (setup: DeviceSetup) => ReactNode }) {
  const battery = useBatteryOptimization()
  const location = useLocationCapability()
  const notifications = useNotificationSettings()
  return children({ battery, location, notifications })
}

function LoadingState() {
  return (
    <View
      accessibilityLabel={ONBOARDING_COPY.loading}
      className="flex-1 justify-center gap-4 bg-bg px-6"
      testID="gate-loading"
    >
      <ActivityIndicator />
      <View className="h-8 rounded-card bg-bg" />
      <View className="h-24 rounded-card bg-bg" />
      <View className="h-14 rounded-button bg-bg" />
      <Text className="text-body text-center text-ink">{ONBOARDING_COPY.loading}</Text>
    </View>
  )
}

export function OnboardingGate({ now }: { now: () => Date }) {
  const today = useWirdToday()
  const database = useSQLiteContext()
  const [gate, setGate] = useState<GateState>({ status: 'loading' })
  const [screen, setScreen] = useState<Screen>('welcome')
  const [answers, setAnswers] = useState<Answers>({})
  const [selectedLevelId, setSelectedLevelId] = useState<LevelId | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const completionInFlight = useRef(false)
  const backup = useBackup()
  const { setColorScheme } = useColorScheme()

  // The tabs layout reads the theme once at mount, so a restore must apply it here.
  async function applyRestoredTheme() {
    try {
      const stored = await createPreferencesRepository(database).read(PREFERENCE_KEYS.theme)
      setColorScheme(readStoredTheme(stored))
    } catch (cause: unknown) {
      logger.error('Native restored theme apply failed', cause)
    }
  }

  useEffect(() => {
    if (gate.status !== 'loading') return
    setOnboardingComplete(false)
    let active = true
    void createOnboardingRepository(database)
      .load()
      .then((persisted) => {
        if (active) {
          setOnboardingComplete(Boolean(persisted))
          setGate({ status: 'ready', persisted })
        }
      })
      .catch((cause: unknown) => {
        logger.error('Native onboarding load failed', cause)
        if (active) setGate({ status: 'error' })
      })
    return () => {
      active = false
    }
  }, [database, gate.status])

  if (gate.status === 'loading') return <LoadingState />

  if (gate.status === 'error') {
    return (
      <ScreenContainer testID="gate-error">
        <Text className="text-body text-start text-ink">{SHARED_COPY.seedError}</Text>
        <OnboardingButton
          label={ONBOARDING_COPY.retry}
          onPress={() => setGate({ status: 'loading' })}
        />
      </ScreenContainer>
    )
  }

  if (gate.persisted) return <HomeScreen persisted={gate.persisted} />

  if (screen === 'welcome') {
    return (
      <ScreenContainer testID="onboarding-welcome">
        <Text
          accessibilityRole="header"
          className="font-display text-sheet-title text-start text-accent"
        >
          {SHARED_COPY.title}
        </Text>
        <Text className="text-body mt-4 text-start text-ink">{SHARED_COPY.welcomeBody}</Text>
        <View className="mt-6 gap-3">
          {SHARED_COPY.welcomePoints.map((point) => (
            <View
              className="flex-row items-center gap-3 rounded-card border border-line bg-surface p-3 shadow-card"
              key={point}
            >
              <Text accessibilityElementsHidden className="text-sheet-title text-gold-ink">
                ✦
              </Text>
              <Text className="text-body flex-1 text-start text-ink">{point}</Text>
            </View>
          ))}
        </View>
        <OnboardingButton
          label={SHARED_COPY.welcomeStart}
          onPress={() => setScreen('questions')}
          testID="onboarding-begin"
        />
        <View className="mt-6 gap-2" testID="onboarding-restore-card">
          <Text className="font-sans-bold text-chip text-start text-ink">
            {BACKUP_COPY.onboardingRestoreTitle}
          </Text>
          <Text className="text-meta text-start text-ink">{BACKUP_COPY.onboardingRestoreBody}</Text>
          <BackupImport
            {...backup}
            importLabel={BACKUP_COPY.onboardingRestoreTitle}
            importTestID="onboarding-restore"
            onRestored={() => {
              requestPrayerReschedule()
              void applyRestoredTheme()
              setGate({ status: 'loading' })
            }}
          />
        </View>
      </ScreenContainer>
    )
  }

  if (screen === 'questions') {
    const answered = isComplete(QUESTIONS, answers)
    return (
      <ScreenContainer testID="onboarding-questionnaire">
        <Text
          accessibilityRole="header"
          className="font-display text-sheet-title text-start text-accent"
        >
          {SHARED_COPY.title}
        </Text>
        <Text className="text-body mt-2 text-start text-ink">{SHARED_COPY.intro}</Text>
        <View className="mt-6 gap-6">
          {QUESTIONS.map((question) => (
            <View accessibilityRole="radiogroup" key={question.id}>
              <Text className="text-body mb-2 text-start font-sans-medium text-ink">
                {question.prompt}
              </Text>
              <View className="gap-2">
                {question.options.map((option) => {
                  const checked = answers[question.id] === option.id
                  return (
                    <Pressable
                      accessibilityLabel={option.label}
                      accessibilityRole="radio"
                      accessibilityState={{ checked }}
                      className={`rounded-card border p-3 ${
                        checked
                          ? 'border-accent bg-accent/10'
                          : 'border-line bg-surface shadow-card'
                      }`}
                      key={option.id}
                      onPress={() =>
                        setAnswers((current) => ({ ...current, [question.id]: option.id }))
                      }
                      testID={`answer-${question.id}-${option.id}`}
                    >
                      <Text className="text-body text-start text-ink">{option.label}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          ))}
        </View>
        <OnboardingButton
          disabled={!answered}
          label={SHARED_COPY.submit}
          onPress={() => {
            setSelectedLevelId(recommendLevel(WIRD_LEVELS, QUESTIONS, answers))
            setScreen('level')
          }}
          testID="onboarding-submit"
        />
      </ScreenContainer>
    )
  }

  const complete = async () => {
    if (!selectedLevelId || !isComplete(QUESTIONS, answers) || completionInFlight.current) return
    if (!levelById(WIRD_LEVELS, selectedLevelId)) return

    completionInFlight.current = true
    setSubmitting(true)
    const date = now()
    const effectiveFrom = today
    try {
      const persisted = await createOnboardingRepository(database).complete({
        answers,
        selectedLevelId,
        completedAt: date.getTime(),
        effectiveFrom,
        versionId: `${LEVEL_VERSION_PREFIX}${selectedLevelId}`,
      })
      setOnboardingComplete(true)
      setGate({ status: 'ready', persisted })
    } catch (cause: unknown) {
      logger.error('Native onboarding completion failed', cause)
      completionInFlight.current = false
      setSubmitting(false)
      setGate({ status: 'error' })
    }
  }

  if (screen === 'permissions') {
    return (
      <OnboardingDeviceSetup>
        {({ battery, location, notifications }) => (
          <ScreenContainer testID="onboarding-permissions-screen">
            <PermissionsStep
              location={location}
              notifications={notifications}
              isFinalStep={battery.status !== 'optimized'}
              onContinue={() => {
                if (battery.status === 'optimized') {
                  setScreen('power')
                  return
                }
                void complete()
              }}
            />
          </ScreenContainer>
        )}
      </OnboardingDeviceSetup>
    )
  }

  if (screen === 'power') {
    return (
      <OnboardingDeviceSetup>
        {({ battery }) => (
          <ScreenContainer testID="onboarding-power-screen">
            <PowerStep
              status={battery.status}
              onRequest={battery.request}
              onFinish={() => void complete()}
            />
          </ScreenContainer>
        )}
      </OnboardingDeviceSetup>
    )
  }

  return (
    <ScreenContainer testID="onboarding-level">
      <Text
        accessibilityRole="header"
        className="font-display text-sheet-title text-start text-accent"
      >
        {SHARED_COPY.recommendationTitle}
      </Text>
      <Text className="text-body mt-2 text-start text-ink">{SHARED_COPY.otherLevels}</Text>
      <View className="mt-6 gap-3" accessibilityRole="radiogroup">
        {WIRD_LEVELS.map((level) => {
          const checked = selectedLevelId === level.id
          return (
            <Pressable
              accessibilityLabel={level.title}
              accessibilityRole="radio"
              accessibilityState={{ checked }}
              className={`rounded-card border p-4 ${
                checked
                  ? 'border-accent bg-accent/10 shadow-card'
                  : 'border-line bg-surface shadow-card'
              }`}
              key={level.id}
              onPress={() => setSelectedLevelId(level.id)}
              testID={`level-${level.id}`}
            >
              <Text className="font-display text-sheet-title text-start text-accent">
                {level.title}
              </Text>
              <Text className="text-body mt-2 text-start text-ink">{level.description}</Text>
            </Pressable>
          )
        })}
      </View>
      <OnboardingButton
        disabled={submitting}
        label={submitting ? ONBOARDING_COPY.loading : SHARED_COPY.confirm}
        onPress={() => setScreen('permissions')}
        testID="onboarding-confirm"
      />
    </ScreenContainer>
  )
}
