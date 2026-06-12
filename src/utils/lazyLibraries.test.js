import assert from 'node:assert/strict'
import test from 'node:test'
import {
  loadAchievementLibrary,
  loadPracticeLibrary,
  preloadAchievementLibrary,
  preloadPracticeLibrary,
} from './lazyLibraries.js'

test('loadPracticeLibrary caches and resolves the practice library', async () => {
  const first = loadPracticeLibrary()
  const second = loadPracticeLibrary()

  assert.equal(first, second)
  const lessons = await first
  assert.ok(lessons.length > 0)
  assert.ok(lessons.every((lesson) => lesson.id && lesson.title))
})

test('loadAchievementLibrary caches and resolves the achievement library', async () => {
  const first = loadAchievementLibrary()
  const second = loadAchievementLibrary()

  assert.equal(first, second)
  const achievements = await first
  assert.ok(achievements.length > 0)
  assert.ok(achievements.every((achievement) => achievement.id && achievement.title))
})

test('preload helpers resolve arrays for hover/focus warmups', async () => {
  assert.ok(Array.isArray(await preloadPracticeLibrary()))
  assert.ok(Array.isArray(await preloadAchievementLibrary()))
})
