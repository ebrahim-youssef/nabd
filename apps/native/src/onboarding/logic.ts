import { QUESTIONS } from './copy'
import type { WirdLevel } from '../content/levels'
import type { Answers, LevelId, Question } from './types'

export function parseAnswers(source: string): Answers | null {
  try {
    const value: unknown = JSON.parse(source)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const answers = Object.entries(value).every(
      ([key, answer]) => typeof key === 'string' && typeof answer === 'string',
    )
      ? (value as Answers)
      : null
    return answers && hasCanonicalAnswers(answers) ? answers : null
  } catch {
    return null
  }
}

export function hasCanonicalAnswers(answers: Answers): boolean {
  return Object.keys(answers).length === QUESTIONS.length && isComplete(QUESTIONS, answers)
}

export function isComplete(questions: Question[], answers: Answers): boolean {
  return questions.every((question) =>
    question.options.some((option) => option.id === answers[question.id]),
  )
}

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
