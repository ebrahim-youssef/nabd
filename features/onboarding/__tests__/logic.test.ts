import { describe, expect, it } from 'vitest'

import { WIRD_LEVELS } from '@/content/levels'

import { QUESTIONS } from '../constants'
import { isComplete, levelById, maxScore, recommendLevel, totalScore } from '../logic'
import type { Answers } from '../types'

// Answer helpers: pick the option with the given score for every question.
function answersScoring(score: number): Answers {
  const answers: Answers = {}
  for (const question of QUESTIONS) {
    const option = question.options.find((candidate) => candidate.score === score)
    if (option) answers[question.id] = option.id
  }
  return answers
}

describe('isComplete', () => {
  it('is false until every question has a valid answer', () => {
    expect(isComplete(QUESTIONS, {})).toBe(false)
    const partial: Answers = { [QUESTIONS[0].id]: QUESTIONS[0].options[0].id }
    expect(isComplete(QUESTIONS, partial)).toBe(false)
    expect(isComplete(QUESTIONS, answersScoring(1))).toBe(true)
  })

  it('rejects an answer that is not one of the question options', () => {
    const answers = answersScoring(1)
    answers[QUESTIONS[0].id] = 'not-an-option'
    expect(isComplete(QUESTIONS, answers)).toBe(false)
  })
})

describe('scoring', () => {
  it('sums the chosen option scores', () => {
    expect(totalScore(QUESTIONS, answersScoring(2))).toBe(maxScore(QUESTIONS))
    expect(totalScore(QUESTIONS, answersScoring(0))).toBe(0)
  })

  it('counts unknown answers as zero instead of crashing', () => {
    expect(totalScore(QUESTIONS, { bogus: 'x' })).toBe(0)
  })
})

describe('recommendLevel', () => {
  it('recommends الاجتهاد for established habits across the pillars', () => {
    expect(recommendLevel(WIRD_LEVELS, QUESTIONS, answersScoring(2))).toBe('level-3')
  })

  it('recommends المداومة for middling habits', () => {
    expect(recommendLevel(WIRD_LEVELS, QUESTIONS, answersScoring(1))).toBe('level-2')
  })

  it('recommends البداية for beginners', () => {
    expect(recommendLevel(WIRD_LEVELS, QUESTIONS, answersScoring(0))).toBe('level-1')
  })
})

describe('levelById', () => {
  it('resolves a level and returns null for an unknown id', () => {
    expect(levelById(WIRD_LEVELS, 'level-1')?.rank).toBe(1)
    expect(levelById(WIRD_LEVELS, 'level-9' as never)).toBeNull()
  })
})
