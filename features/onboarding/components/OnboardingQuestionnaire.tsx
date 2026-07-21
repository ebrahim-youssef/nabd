'use client'

import { BarChart3, BatteryCharging, Bell, Check, ListChecks, MapPin } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'

import { WIRD_LEVELS } from '@/content/levels'
import { Button } from '@/components/ui/button'
import { requestBatteryExemption } from '@/lib/impure/battery'
import { LOCATION_FAILURE_COPY } from '@/lib/impure/location'
import { isNativePlatform } from '@/lib/impure/native'
import { cn } from '@/lib/utils'

import { COPY, QUESTIONS } from '../constants'
import { isComplete, recommendLevel } from '../logic'
import type { Answers, LevelId } from '../types'
import { useOnboarding } from '../hooks/useOnboarding'
import { usePermissionsSetup } from '../hooks/usePermissionsSetup'

// One glyph per welcome point (same order as COPY.welcomePoints): the wird itself, prayer
// times, then accountability stats.
const WELCOME_POINT_ICONS: LucideIcon[] = [ListChecks, Bell, BarChart3]

// The first-entry flow (NBD-6 + NBD-28): three short questions recommend a level, the user
// confirms (or picks another level), grants permissions (location for prayer times,
// notifications opt-in with per-moment toggles — ADR-0009), and the chosen level's wird
// becomes version 1.
export function OnboardingQuestionnaire() {
  const { complete, hasError } = useOnboarding()
  const permissions = usePermissionsSetup()
  const [answers, setAnswers] = useState<Answers>({})
  const [selectedLevel, setSelectedLevel] = useState<LevelId | null>(null)
  const [step, setStep] = useState<'welcome' | 'questions' | 'level' | 'permissions' | 'power'>(
    'welcome',
  )

  const answered = isComplete(QUESTIONS, answers)

  if (step === 'welcome') {
    return (
      <section className="flex flex-col gap-6" data-testid="onboarding-welcome">
        <header className="flex flex-col gap-2">
          <h2 className="font-display text-title text-primary">{COPY.title}</h2>
          <p className="text-muted-foreground text-body">{COPY.welcomeBody}</p>
        </header>
        <ul className="flex flex-col gap-3">
          {COPY.welcomePoints.map((point, index) => {
            const Icon = WELCOME_POINT_ICONS[index]
            return (
              <li
                key={point}
                className="border-border bg-surface shadow-card-sm text-body flex items-center gap-3 rounded-card border p-3"
              >
                {Icon && (
                  <span
                    aria-hidden
                    className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-icon"
                  >
                    <Icon className="size-5" />
                  </span>
                )}
                <span className="min-w-0 flex-1">{point}</span>
              </li>
            )
          })}
        </ul>
        <Button onClick={() => setStep('questions')} data-testid="onboarding-begin">
          {COPY.welcomeStart}
        </Button>
      </section>
    )
  }

  if (step === 'questions') {
    return (
      <section className="flex flex-col gap-6" data-testid="onboarding-questionnaire">
        <header className="flex flex-col gap-2">
          <h2 className="font-display text-title text-primary">{COPY.title}</h2>
          <p className="text-muted-foreground text-body">{COPY.intro}</p>
        </header>

        {QUESTIONS.map((question) => (
          <fieldset key={question.id} className="flex flex-col gap-2">
            <legend className="text-body text-foreground mb-2 font-medium">
              {question.prompt}
            </legend>
            {question.options.map((option) => {
              const checked = answers[question.id] === option.id
              return (
                <label
                  key={option.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-card border p-3 transition-all duration-200',
                    checked
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-surface shadow-card-sm hover:border-accent/40',
                  )}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={option.id}
                    checked={checked}
                    onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: option.id }))}
                    className="accent-primary size-4 shrink-0"
                    data-testid={`onboarding-${question.id}-${option.id}`}
                  />
                  <span className={cn('text-body', checked && 'text-primary font-medium')}>
                    {option.label}
                  </span>
                </label>
              )
            })}
          </fieldset>
        ))}

        <Button
          disabled={!answered}
          onClick={() => {
            setSelectedLevel(recommendLevel(WIRD_LEVELS, QUESTIONS, answers))
            setStep('level')
          }}
          data-testid="onboarding-submit"
        >
          {COPY.submit}
        </Button>
      </section>
    )
  }

  if (step === 'level') {
    return (
      <section className="flex flex-col gap-6" data-testid="onboarding-recommendation">
        <h2 className="font-display text-title text-primary">{COPY.recommendationTitle}</h2>

        <div className="flex flex-col gap-3">
          {[...WIRD_LEVELS]
            .sort((a, b) => a.rank - b.rank)
            .map((level) => {
              const selected = level.id === selectedLevel
              return (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => setSelectedLevel(level.id)}
                  aria-pressed={selected}
                  data-testid={`onboarding-level-${level.id}`}
                  className={cn(
                    'relative flex flex-col gap-1 overflow-hidden rounded-card border p-4 text-start transition-all duration-200',
                    selected
                      ? 'border-primary bg-primary/10 shadow-card'
                      : 'border-border bg-surface shadow-card-sm hover:border-accent/40',
                  )}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-display text-title text-primary">{level.title}</span>
                    {selected && (
                      <span className="border-primary bg-primary text-on-primary animate-in zoom-in flex size-6 shrink-0 items-center justify-center rounded-full border-2 duration-200">
                        <Check className="size-4" aria-hidden />
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground text-body">{level.description}</span>
                </button>
              )
            })}
        </div>

        <Button onClick={() => setStep('permissions')} data-testid="onboarding-confirm">
          {COPY.confirm}
        </Button>
      </section>
    )
  }

  if (step === 'power') {
    return (
      <section className="flex flex-col gap-6" data-testid="onboarding-power">
        <h2 className="font-display text-title text-primary">{COPY.powerTitle}</h2>

        <div className="border-border bg-surface shadow-card-sm flex flex-col gap-3 rounded-card border p-4">
          <span className="text-body text-foreground flex items-center gap-2 font-medium">
            <span
              aria-hidden
              className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-icon"
            >
              <BatteryCharging className="size-5" />
            </span>
            {COPY.powerTitle}
          </span>
          <p className="text-muted-foreground text-small">{COPY.powerBody}</p>
          <ol className="text-muted-foreground text-small flex list-decimal flex-col gap-1 ps-5">
            {COPY.powerSteps.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ol>
          <Button
            variant="secondary"
            onClick={() => void requestBatteryExemption()}
            data-testid="onboarding-power-enable"
          >
            {COPY.powerButton}
          </Button>
        </div>

        {hasError && <p className="text-body text-destructive">{COPY.seedError}</p>}

        <Button
          onClick={() => selectedLevel && void complete(selectedLevel)}
          data-testid="onboarding-finish"
        >
          {COPY.finish}
        </Button>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-6" data-testid="onboarding-permissions">
      <h2 className="font-display text-title text-primary">{COPY.permissionsTitle}</h2>

      <div className="border-border bg-surface shadow-card-sm flex flex-col gap-3 rounded-card border p-4">
        <span className="text-body text-foreground flex items-center gap-2 font-medium">
          <span
            aria-hidden
            className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-icon"
          >
            <MapPin className="size-5" />
          </span>
          {COPY.locationHeading}
        </span>
        <p className="text-muted-foreground text-small">{COPY.locationBody}</p>
        {permissions.locationGranted ? (
          <span className="text-primary text-small flex items-center gap-1 font-medium">
            <Check className="size-4" aria-hidden />
            {COPY.locationGranted}
          </span>
        ) : (
          <>
            <Button
              variant="secondary"
              onClick={() => void permissions.requestLocation()}
              data-testid="onboarding-location"
            >
              {COPY.locationButton}
            </Button>
            {/* GPS off vs denied read differently for the user (NBD-48 follow-up). */}
            {permissions.locationError && (
              <p className="text-gold text-small" data-testid="onboarding-location-error">
                {LOCATION_FAILURE_COPY[permissions.locationError]}
              </p>
            )}
          </>
        )}
      </div>

      <div className="border-border bg-surface shadow-card-sm flex flex-col gap-3 rounded-card border p-4">
        <span className="text-body text-foreground flex items-center gap-2 font-medium">
          <span
            aria-hidden
            className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-icon"
          >
            <Bell className="size-5" />
          </span>
          {COPY.notificationsHeading}
        </span>
        <p className="text-muted-foreground text-small">{COPY.notificationsBody}</p>
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={permissions.prefs.enabled}
            onChange={() => void permissions.toggleNotifications()}
            className="accent-primary size-4"
            data-testid="onboarding-notifications"
          />
          <span className="text-body">{COPY.notificationsToggle}</span>
        </label>
        {permissions.notificationPermission === 'denied' && (
          <p className="text-gold text-small">{COPY.notificationsDenied}</p>
        )}
        {permissions.prefs.enabled && (
          <div className="flex flex-col gap-2 ps-7">
            {(
              [
                ['beforeAdhan', COPY.momentBefore],
                ['atAdhan', COPY.momentAdhan],
                ['atIqamah', COPY.momentIqamah],
                ['morningAdhkar', COPY.momentMorningAdhkar],
                ['eveningAdhkar', COPY.momentEveningAdhkar],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={permissions.prefs[key]}
                  onChange={(event) => permissions.setMoment(key, event.target.checked)}
                  className="accent-primary size-4"
                  data-testid={`onboarding-moment-${key}`}
                />
                <span className="text-small">{label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {hasError && <p className="text-body text-destructive">{COPY.seedError}</p>}

      <Button
        onClick={() => {
          permissions.persist()
          // Native gets one more step: exempt نبض from battery optimization so the adhan fires
          // with the app closed (NBD-58). On web there's no such setting — finish here.
          if (isNativePlatform()) setStep('power')
          else if (selectedLevel) void complete(selectedLevel)
        }}
        data-testid="onboarding-finish"
      >
        {isNativePlatform() ? COPY.confirm : COPY.finish}
      </Button>
    </section>
  )
}
