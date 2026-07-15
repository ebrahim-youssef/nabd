import type { LevelId } from '@/content/levels'

// One selectable answer for a questionnaire question. `score` feeds the pure level
// recommendation in logic.ts — higher means a more established existing habit.
export type QuestionOption = {
  id: string
  label: string
  score: number
}

export type Question = {
  id: string
  prompt: string
  options: QuestionOption[]
}

// The user's chosen option per question id. Complete when every question has an answer.
export type Answers = Record<string, string>

export type { LevelId }
