import type { WirdLevel } from '@/content/levels'

import type { Answers, LevelId, Question } from './types'

// Pure questionnaire resolution: answers in, recommended level out. No I/O, no clock.

// Total score at or above this fraction of the maximum recommends the more demanding level.
// With three questions scored 0–2 (max 6) the cut is ≥ 4: an established habit in at least
// two of the three pillars.
const UPPER_LEVEL_SCORE_FRACTION = 2 / 3

export function isComplete(questions: Question[], answers: Answers): boolean {
  return questions.every((question) =>
    question.options.some((option) => option.id === answers[question.id]),
  )
}

// Sums the chosen options' scores. Unanswered or unknown answers count as 0 so a partial
// submission can never crash — isComplete gates submission in the UI anyway.
export function totalScore(questions: Question[], answers: Answers): number {
  let total = 0
  for (const question of questions) {
    const chosen = question.options.find((option) => option.id === answers[question.id])
    total += chosen?.score ?? 0
  }
  return total
}

export function maxScore(questions: Question[]): number {
  let total = 0
  for (const question of questions) {
    total += Math.max(...question.options.map((option) => option.score))
  }
  return total
}

// Places the user in a level: high scorers (existing habits across the pillars) get the
// higher-rank level, everyone else starts at the lowest. Written against the levels list so
// levels 3 and 4 can slot in later without touching this function.
export function recommendLevel(
  levels: WirdLevel[],
  questions: Question[],
  answers: Answers,
): LevelId {
  const byRank = [...levels].sort((a, b) => a.rank - b.rank)
  const lowest = byRank[0]
  const highest = byRank[byRank.length - 1]
  const threshold = maxScore(questions) * UPPER_LEVEL_SCORE_FRACTION
  return totalScore(questions, answers) >= threshold ? highest.id : lowest.id
}

export function levelById(levels: WirdLevel[], id: LevelId): WirdLevel | null {
  return levels.find((level) => level.id === id) ?? null
}
