'use client'

import { useState } from 'react'

import { WIRD_LEVELS } from '@/content/levels'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { COPY, QUESTIONS } from '../constants'
import { isComplete, recommendLevel } from '../logic'
import type { Answers, LevelId } from '../types'
import { useOnboarding } from '../hooks/useOnboarding'

// The first-entry questionnaire (NBD-6): three short questions recommend a level, the user
// confirms (or picks another level), and the chosen level's wird becomes version 1.
export function OnboardingQuestionnaire() {
  const { complete, hasError } = useOnboarding()
  const [answers, setAnswers] = useState<Answers>({})
  const [selectedLevel, setSelectedLevel] = useState<LevelId | null>(null)

  const answered = isComplete(QUESTIONS, answers)

  if (selectedLevel === null) {
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
          onClick={() => setSelectedLevel(recommendLevel(WIRD_LEVELS, QUESTIONS, answers))}
          data-testid="onboarding-submit"
        >
          {COPY.submit}
        </Button>
      </section>
    )
  }

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

      {hasError && <p className="text-body text-destructive">{COPY.seedError}</p>}

      <Button onClick={() => void complete(selectedLevel)} data-testid="onboarding-confirm">
        {COPY.confirm}
      </Button>
    </section>
  )
}
