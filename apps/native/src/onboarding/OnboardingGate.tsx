import {
  ONBOARDING_COPY as SHARED_COPY,
  QUESTIONS,
  WIRD_LEVELS,
  isComplete,
  levelById,
  recommendLevel,
  toDayId,
  type Answers,
  type LevelId,
} from '@nabd/shared'
import { useSQLiteContext } from 'expo-sqlite'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { captureException } from '../observability/sentry'
import { ONBOARDING_COPY } from './constants'
import { createOnboardingRepository, type PersistedOnboarding } from './db'

type Screen = 'welcome' | 'questions' | 'level'
type GateState =
  | { status: 'loading' }
  | { status: 'ready'; persisted: PersistedOnboarding | null }
  | { status: 'error' }

const LEVEL_VERSION_PREFIX = 'initial-wird-'

type ButtonProps = {
  label: string
  onPress: () => void
  disabled?: boolean
  testID?: string
}

function Button({ label, onPress, disabled = false, testID }: ButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={`mt-6 rounded-button bg-primary px-5 py-4 ${disabled ? 'opacity-50' : ''}`}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
    >
      <Text className="text-body text-center font-medium text-primary-foreground">{label}</Text>
    </Pressable>
  )
}

function ScreenContainer({ children, testID }: { children: React.ReactNode; testID: string }) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" testID={testID}>
        <View className="px-6 py-8">{children}</View>
      </ScrollView>
    </SafeAreaView>
  )
}

function LoadingState() {
  return (
    <View
      accessibilityLabel={ONBOARDING_COPY.loading}
      className="flex-1 justify-center gap-4 bg-background px-6"
      testID="gate-loading"
    >
      <ActivityIndicator />
      <View className="h-8 rounded-card bg-surface-2" />
      <View className="h-24 rounded-card bg-surface-2" />
      <View className="h-14 rounded-button bg-surface-2" />
      <Text className="text-body text-center text-muted-foreground">{ONBOARDING_COPY.loading}</Text>
    </View>
  )
}

function HomeShell({ persisted }: { persisted: PersistedOnboarding }) {
  const level = levelById(WIRD_LEVELS, persisted.selectedLevelId)
  if (!level) return null

  return (
    <ScreenContainer testID="home-shell">
      <Text accessibilityRole="header" className="text-title text-start text-primary">
        {ONBOARDING_COPY.readyTitle}
      </Text>
      <View className="mt-6 rounded-card border border-border bg-surface p-4 shadow-card-sm">
        <Text className="text-title text-start text-primary">{level.title}</Text>
        <Text className="text-body mt-2 text-start text-muted-foreground">{level.description}</Text>
      </View>
      <Text className="text-body mt-6 text-start text-foreground">{ONBOARDING_COPY.readyBody}</Text>
    </ScreenContainer>
  )
}

export function OnboardingGate({ now }: { now: () => Date }) {
  const database = useSQLiteContext()
  const [gate, setGate] = useState<GateState>({ status: 'loading' })
  const [screen, setScreen] = useState<Screen>('welcome')
  const [answers, setAnswers] = useState<Answers>({})
  const [selectedLevelId, setSelectedLevelId] = useState<LevelId | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const completionInFlight = useRef(false)

  useEffect(() => {
    if (gate.status !== 'loading') return
    let active = true
    void createOnboardingRepository(database)
      .load()
      .then((persisted) => {
        if (active) setGate({ status: 'ready', persisted })
      })
      .catch((cause: unknown) => {
        captureException(cause)
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
        <Text className="text-body text-start text-foreground">{SHARED_COPY.seedError}</Text>
        <Button label={ONBOARDING_COPY.retry} onPress={() => setGate({ status: 'loading' })} />
      </ScreenContainer>
    )
  }

  if (gate.persisted) return <HomeShell persisted={gate.persisted} />

  if (screen === 'welcome') {
    return (
      <ScreenContainer testID="onboarding-welcome">
        <Text accessibilityRole="header" className="text-title text-start text-primary">
          {SHARED_COPY.title}
        </Text>
        <Text className="text-body mt-4 text-start text-muted-foreground">
          {SHARED_COPY.welcomeBody}
        </Text>
        <View className="mt-6 gap-3">
          {SHARED_COPY.welcomePoints.map((point) => (
            <View
              className="flex-row items-center gap-3 rounded-card border border-border bg-surface p-3 shadow-card-sm"
              key={point}
            >
              <Text accessibilityElementsHidden className="text-title text-gold">
                ✦
              </Text>
              <Text className="text-body flex-1 text-start text-foreground">{point}</Text>
            </View>
          ))}
        </View>
        <Button
          label={SHARED_COPY.welcomeStart}
          onPress={() => setScreen('questions')}
          testID="onboarding-begin"
        />
      </ScreenContainer>
    )
  }

  if (screen === 'questions') {
    const answered = isComplete(QUESTIONS, answers)
    return (
      <ScreenContainer testID="onboarding-questionnaire">
        <Text accessibilityRole="header" className="text-title text-start text-primary">
          {SHARED_COPY.title}
        </Text>
        <Text className="text-body mt-2 text-start text-muted-foreground">{SHARED_COPY.intro}</Text>
        <View className="mt-6 gap-6">
          {QUESTIONS.map((question) => (
            <View accessibilityRole="radiogroup" key={question.id}>
              <Text className="text-body mb-2 text-start font-medium text-foreground">
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
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-surface shadow-card-sm'
                      }`}
                      key={option.id}
                      onPress={() =>
                        setAnswers((current) => ({ ...current, [question.id]: option.id }))
                      }
                      testID={`answer-${question.id}-${option.id}`}
                    >
                      <Text className="text-body text-start text-foreground">{option.label}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          ))}
        </View>
        <Button
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
    const effectiveFrom = toDayId(date)
    try {
      const persisted = await createOnboardingRepository(database).complete({
        answers,
        selectedLevelId,
        completedAt: date.getTime(),
        effectiveFrom,
        versionId: `${LEVEL_VERSION_PREFIX}${selectedLevelId}`,
      })
      setGate({ status: 'ready', persisted })
    } catch (cause: unknown) {
      captureException(cause)
      completionInFlight.current = false
      setSubmitting(false)
      setGate({ status: 'error' })
    }
  }

  return (
    <ScreenContainer testID="onboarding-level">
      <Text accessibilityRole="header" className="text-title text-start text-primary">
        {SHARED_COPY.recommendationTitle}
      </Text>
      <Text className="text-body mt-2 text-start text-muted-foreground">
        {SHARED_COPY.otherLevels}
      </Text>
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
                  ? 'border-primary bg-primary/10 shadow-card'
                  : 'border-border bg-surface shadow-card-sm'
              }`}
              key={level.id}
              onPress={() => setSelectedLevelId(level.id)}
              testID={`level-${level.id}`}
            >
              <Text className="text-title text-start text-primary">{level.title}</Text>
              <Text className="text-body mt-2 text-start text-muted-foreground">
                {level.description}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <Button
        disabled={submitting}
        label={submitting ? ONBOARDING_COPY.loading : SHARED_COPY.finish}
        onPress={() => void complete()}
        testID="onboarding-confirm"
      />
    </ScreenContainer>
  )
}
