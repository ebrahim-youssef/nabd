'use client'

import type { LevelId } from '@/content/levels'
import { WIRD_LEVELS } from '@/content/levels'
import { useWirdLevel } from '@/features/wird/hooks/useWirdLevel'
import { now, today } from '@/lib/impure/clock'

export function LevelSettings() {
  const { currentLevelId, changeLevel, isLoading } = useWirdLevel()

  if (isLoading) {
    return <div className="bg-surface-2 h-24 w-full animate-pulse rounded-card" aria-hidden />
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    void changeLevel(e.target.value as LevelId, today(), now())
  }

  return (
    <section className="flex flex-col gap-3" data-testid="level-settings">
      <h2 className="font-display text-title text-primary">مستوى الورد</h2>
      <div className="border-border bg-surface shadow-card-sm flex flex-col gap-2 rounded-card border p-4">
        <label htmlFor="wird-level-select" className="text-body font-medium text-foreground">
          اختر مستوى الورد اليومي
        </label>
        <select
          id="wird-level-select"
          data-testid="wird-level-select"
          value={currentLevelId}
          onChange={handleChange}
          className="border-border bg-surface text-body text-foreground focus:border-primary w-full rounded-card border p-3 transition-colors focus:outline-none"
        >
          {WIRD_LEVELS.map((level) => (
            <option key={level.id} value={level.id}>
              {level.title} — {level.description}
            </option>
          ))}
        </select>
        <p className="text-small text-muted-foreground" data-testid="level-hint">
          يبدأ الورد الجديد من الغد
        </p>
      </div>
    </section>
  )
}
