import { BarChart3, Bell, Check, ListChecks } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'

import { isComplete, ONBOARDING_COPY, QUESTIONS, recommendLevel, WIRD_LEVELS } from '@nabd/shared'
import type { Answers, LevelId } from '@nabd/shared'

import { useOnboarding } from './useOnboarding'

const WELCOME_POINT_ICONS: LucideIcon[] = [ListChecks, Bell, BarChart3]
const PRIMARY_BUTTON_CLASS =
  'rounded-button bg-primary px-5 py-2.5 text-body font-medium text-on-primary shadow-card-small transition-opacity disabled:cursor-not-allowed disabled:opacity-50'

export function OnboardingQuestionnaire() {
  const { complete, hasError, isSubmitting } = useOnboarding()
  const [answers, setAnswers] = useState<Answers>({})
  const [selectedLevel, setSelectedLevel] = useState<LevelId | null>(null)
  const [step, setStep] = useState<'welcome' | 'questions' | 'level'>('welcome')

  if (step === 'welcome') {
    return (
      <section className="flex flex-col gap-6" data-testid="onboarding-welcome">
        <header className="flex flex-col gap-2">
          <h2 className="font-display text-title text-primary">{ONBOARDING_COPY.title}</h2>
          <p className="m-0 text-body text-muted-foreground">{ONBOARDING_COPY.welcomeBody}</p>
        </header>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {ONBOARDING_COPY.welcomePoints.map((point, index) => {
            const Icon = WELCOME_POINT_ICONS[index]
            return (
              <li
                key={point}
                className="flex items-center gap-3 rounded-card border border-border bg-surface p-3 text-body shadow-card-small"
              >
                {Icon ? (
                  <span
                    aria-hidden
                    className="flex size-10 shrink-0 items-center justify-center rounded-icon bg-primary/10 text-primary"
                  >
                    <Icon className="size-5" />
                  </span>
                ) : null}
                <span className="min-w-0 flex-1">{point}</span>
              </li>
            )
          })}
        </ul>
        <button
          type="button"
          className={PRIMARY_BUTTON_CLASS}
          onClick={() => setStep('questions')}
          data-testid="onboarding-begin"
        >
          {ONBOARDING_COPY.welcomeStart}
        </button>
      </section>
    )
  }

  if (step === 'questions') {
    return (
      <section className="flex flex-col gap-6" data-testid="onboarding-questionnaire">
        <header className="flex flex-col gap-2">
          <h2 className="font-display text-title text-primary">{ONBOARDING_COPY.title}</h2>
          <p className="m-0 text-body text-muted-foreground">{ONBOARDING_COPY.intro}</p>
        </header>

        {QUESTIONS.map((question) => (
          <fieldset key={question.id} className="flex flex-col gap-2">
            <legend className="mb-2 text-body font-medium text-foreground">
              {question.prompt}
            </legend>
            {question.options.map((option) => {
              const checked = answers[question.id] === option.id
              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-card border p-3 transition-all ${
                    checked
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-surface shadow-card-small hover:border-accent/40'
                  }`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={option.id}
                    checked={checked}
                    onChange={() =>
                      setAnswers((current) => ({ ...current, [question.id]: option.id }))
                    }
                    className="size-4 shrink-0 accent-primary"
                    data-testid={`onboarding-${question.id}-${option.id}`}
                  />
                  <span className={`text-body ${checked ? 'font-medium text-primary' : ''}`}>
                    {option.label}
                  </span>
                </label>
              )
            })}
          </fieldset>
        ))}

        <button
          type="button"
          disabled={!isComplete(QUESTIONS, answers)}
          className={PRIMARY_BUTTON_CLASS}
          onClick={() => {
            setSelectedLevel(recommendLevel(WIRD_LEVELS, QUESTIONS, answers))
            setStep('level')
          }}
          data-testid="onboarding-submit"
        >
          {ONBOARDING_COPY.submit}
        </button>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-6" data-testid="onboarding-recommendation">
      <h2 className="font-display text-title text-primary">
        {ONBOARDING_COPY.recommendationTitle}
      </h2>
      <div className="flex flex-col gap-3">
        {[...WIRD_LEVELS]
          .sort((first, second) => first.rank - second.rank)
          .map((level) => {
            const selected = level.id === selectedLevel
            return (
              <button
                key={level.id}
                type="button"
                onClick={() => setSelectedLevel(level.id)}
                aria-pressed={selected}
                data-testid={`onboarding-level-${level.id}`}
                className={`relative flex flex-col gap-1 overflow-hidden rounded-card border p-4 text-start transition-all ${
                  selected
                    ? 'border-primary bg-primary/10 shadow-card'
                    : 'border-border bg-surface shadow-card-small hover:border-accent/40'
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-display text-title text-primary">{level.title}</span>
                  {selected ? (
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary text-on-primary">
                      <Check className="size-4" aria-hidden />
                    </span>
                  ) : null}
                </span>
                <span className="text-body text-muted-foreground">{level.description}</span>
              </button>
            )
          })}
      </div>

      {hasError ? (
        <p className="m-0 text-body text-destructive">{ONBOARDING_COPY.seedError}</p>
      ) : null}

      <button
        type="button"
        disabled={!selectedLevel || isSubmitting}
        className={PRIMARY_BUTTON_CLASS}
        onClick={() => selectedLevel && void complete(selectedLevel)}
        data-testid="onboarding-confirm"
      >
        {ONBOARDING_COPY.confirm}
      </button>
    </section>
  )
}
