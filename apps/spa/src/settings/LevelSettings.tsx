import { SETTINGS_COPY, WIRD_LEVELS, toDayId } from '@nabd/shared'
import type { LevelId } from '@nabd/shared'

import { useWirdLevel } from '../wird/useWirdLevel'

export function LevelSettings() {
  const { currentLevelId, changeLevel, isLoading } = useWirdLevel()

  if (isLoading)
    return <div className="h-24 w-full animate-pulse rounded-card bg-surface2" aria-hidden />

  return (
    <section className="flex flex-col gap-3" data-testid="level-settings">
      <h2 className="font-display text-title text-primary">{SETTINGS_COPY.level.title}</h2>
      <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4 shadow-card-small">
        <label htmlFor="wird-level-select" className="text-body font-medium text-foreground">
          {SETTINGS_COPY.level.label}
        </label>
        <select
          id="wird-level-select"
          data-testid="wird-level-select"
          value={currentLevelId}
          onChange={(event) =>
            void changeLevel(event.target.value as LevelId, toDayId(new Date()), Date.now())
          }
          className="w-full rounded-card border border-border bg-surface p-3 text-body text-foreground transition-colors focus:border-primary focus:outline-none"
        >
          {WIRD_LEVELS.map((level) => (
            <option key={level.id} value={level.id}>
              {level.title} — {level.description}
            </option>
          ))}
        </select>
        <p className="text-small text-muted-foreground" data-testid="level-hint">
          {SETTINGS_COPY.level.hint}
        </p>
      </div>
    </section>
  )
}
