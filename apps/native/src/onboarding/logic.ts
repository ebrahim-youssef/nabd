import { QUESTIONS, isComplete, type Answers } from '@nabd/shared'

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
