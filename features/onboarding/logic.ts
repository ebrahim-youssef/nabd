import type { WirdLevel } from '@/content/levels'

import type { Answers, LevelId, Question } from './types'

// Pure questionnaire resolution: answers in, recommended level out. No I/O, no clock.

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

// Places the user in a level by mapping the score fraction onto equal buckets across the
// ranked levels (3 levels: < ⅓ → البداية, < ⅔ → المداومة, otherwise الاجتهاد). Written
// against the levels list so level 4 can slot in later without touching this function.
export function recommendLevel(
  levels: WirdLevel[],
  questions: Question[],
  answers: Answers,
): LevelId {
  const byRank = [...levels].sort((a, b) => a.rank - b.rank)
  const max = maxScore(questions)
  const fraction = max === 0 ? 0 : totalScore(questions, answers) / max
  const index = Math.min(byRank.length - 1, Math.floor(fraction * byRank.length))
  return byRank[index].id
}

export function levelById(levels: WirdLevel[], id: LevelId): WirdLevel | null {
  return levels.find((level) => level.id === id) ?? null
}
