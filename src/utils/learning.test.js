import assert from 'node:assert/strict'
import test from 'node:test'
import { ACHIEVEMENT_LIBRARY } from '../data/achievementLibrary.js'
import { PRACTICE_LIBRARY } from '../data/practiceLibrary.js'
import {
  asStringArray,
  getAchievementProgress,
  getLessonProgress,
  toggleStringId,
  validateAchievementLibrary,
  validatePracticeLibrary,
} from './learning.js'

test('toggleStringId adds and removes string ids', () => {
  assert.deepEqual(toggleStringId([], 'a'), ['a'])
  assert.deepEqual(toggleStringId(['a', 'b'], 'a'), ['b'])
})

test('asStringArray filters non-string values', () => {
  assert.deepEqual(asStringArray(['a', 1, 'b', null]), ['a', 'b'])
  assert.deepEqual(asStringArray('nope'), [])
})

test('getLessonProgress returns matched signs, next sign, and completion', () => {
  const lesson = { signs: ['A', 'B', 'C'] }

  assert.deepEqual(getLessonProgress(lesson, ['A', 'C']), {
    matched: ['A', 'C'],
    nextSign: 'B',
    percent: 67,
    complete: false,
  })

  assert.deepEqual(getLessonProgress(lesson, ['A', 'B', 'C']), {
    matched: ['A', 'B', 'C'],
    nextSign: null,
    percent: 100,
    complete: true,
  })
})

test('getAchievementProgress maps category metrics to bounded progress', () => {
  assert.deepEqual(getAchievementProgress({ category: 'Practice', target: 2 }, {
    completedLessons: 3,
  }), {
    value: 3,
    target: 2,
    percent: 100,
    complete: true,
  })
})

test('practice and achievement libraries contain required fields', () => {
  assert.deepEqual(validatePracticeLibrary(PRACTICE_LIBRARY), [])
  assert.deepEqual(validateAchievementLibrary(ACHIEVEMENT_LIBRARY), [])
})
