'use client'

import { Bell, Check, MapPin } from 'lucide-react'
import { useState } from 'react'

import { WIRD_LEVELS } from '@/content/levels'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { COPY, QUESTIONS } from '../constants'
import { isComplete, recommendLevel } from '../logic'
import type { Answers, LevelId } from '../types'
import { useOnboarding } from '../hooks/useOnboarding'
import { usePermissionsSetup } from '../hooks/usePermissionsSetup'

// The first-entry flow (NBD-6 + NBD-28): three short questions recommend a level, the user
// confirms (or picks another level), grants permissions (location for prayer times,
// notifications opt-in with per-moment toggles — ADR-0009), and the chosen level's wird
// becomes version 1.
export function OnboardingQuestionnaire() {
  const { complete, hasError } = useOnboarding()
  const permissions = usePermissionsSetup()
  const [answers, setAnswers] = useState<Answers>({})
  const [selectedLevel, setSelectedLevel] = useState<LevelId | null>(null)
  const [step, setStep] = useState<'welcome' | 'questions' | 'level' | 'permissions'>('welcome')

  const answered = isComplete(QUESTIONS, answers)

  if (step === 'welcome') {
    return (
      <section className="flex flex-col gap-6" data-testid="onboarding-welcome">
        <header className="flex flex-col gap-2">
          <h2 className="font-display text-title text-primary">{COPY.title}</h2>
          <p className="text-muted-foreground text-body">{COPY.welcomeBody}</p>
        </header>
        <ul className="flex flex-col gap-3">
          {COPY.welcomePoints.map((point) => (
            <li key={point} className="bg-surface-2 text-body rounded-card p-3">
              {point}
            </li>
          ))}
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
                    'flex cursor-pointer items-center gap-3 rounded-card p-3 transition-colors',
                    checked ? 'bg-primary/10' : 'bg-surface-2 hover:bg-surface-2/70',
                  )}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={option.id}
                    checked={checked}
                    onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: option.id }))}
                    className="accent-primary size-4"
                    data-testid={`onboarding-${question.id}-${option.id}`}
                  />
                  <span className="text-body">{option.label}</span>
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
                    'flex flex-col gap-1 rounded-card border p-4 text-start transition-colors',
                    selected ? 'border-primary bg-primary/10' : 'border-border bg-surface-2',
                  )}
                >
                  <span className="font-display text-title text-primary">{level.title}</span>
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

  return (
    <section className="flex flex-col gap-6" data-testid="onboarding-permissions">
      <h2 className="font-display text-title text-primary">{COPY.permissionsTitle}</h2>

      <div className="bg-surface-2 flex flex-col gap-3 rounded-card p-4">
        <span className="text-body text-foreground flex items-center gap-2 font-medium">
          <MapPin className="text-primary size-5" aria-hidden />
          {COPY.locationHeading}
        </span>
        <p className="text-muted-foreground text-small">{COPY.locationBody}</p>
        {permissions.locationGranted ? (
          <span className="text-primary text-small flex items-center gap-1 font-medium">
            <Check className="size-4" aria-hidden />
            {COPY.locationGranted}
          </span>
        ) : (
          <Button
            variant="secondary"
            onClick={() => void permissions.requestLocation()}
            data-testid="onboarding-location"
          >
            {COPY.locationButton}
          </Button>
        )}
      </div>

      <div className="bg-surface-2 flex flex-col gap-3 rounded-card p-4">
        <span className="text-body text-foreground flex items-center gap-2 font-medium">
          <Bell className="text-primary size-5" aria-hidden />
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
          if (selectedLevel) void complete(selectedLevel)
        }}
        data-testid="onboarding-finish"
      >
        {COPY.finish}
      </Button>
    </section>
  )
}
