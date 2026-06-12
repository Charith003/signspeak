import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_SETTINGS,
  clamp,
  readStoredValue,
  sanitizeAchievementCategory,
  sanitizeGuideFilter,
  sanitizePracticeLevel,
  sanitizeSpeechPitch,
  sanitizeSpeechRate,
  sanitizeTab,
  writeStoredValue,
} from './preferences.js'

test('clamp keeps numbers inside the given range', () => {
  assert.equal(clamp(2, 0, 1), 1)
  assert.equal(clamp(-1, 0, 1), 0)
  assert.equal(clamp(0.5, 0, 1), 0.5)
})

test('speech sanitizers coerce numeric strings and clamp invalid values', () => {
  assert.equal(sanitizeSpeechRate('1.2'), 1.2)
  assert.equal(sanitizeSpeechRate('5'), 1.4)
  assert.equal(sanitizeSpeechRate('bad'), DEFAULT_SETTINGS.speechRate)
  assert.equal(sanitizeSpeechPitch('0.7'), 0.7)
  assert.equal(sanitizeSpeechPitch('-2'), 0.5)
  assert.equal(sanitizeSpeechPitch(null), DEFAULT_SETTINGS.speechPitch)
})

test('sanitizeTab preserves known tabs and falls back for invalid values', () => {
  assert.equal(sanitizeTab('stats'), 'stats')
  assert.equal(sanitizeTab('guide'), 'guide')
  assert.equal(sanitizeTab('practice'), 'practice')
  assert.equal(sanitizeTab('achievements'), 'achievements')
  assert.equal(sanitizeTab('missing'), DEFAULT_SETTINGS.tab)
})

test('guide, practice, and achievement sanitizers preserve valid filters', () => {
  assert.equal(sanitizeGuideFilter('letter'), 'letter')
  assert.equal(sanitizeGuideFilter('word'), 'word')
  assert.equal(sanitizePracticeLevel('Beginner'), 'Beginner')
  assert.equal(sanitizeAchievementCategory('Recognition'), 'Recognition')
})

test('guide, practice, and achievement sanitizers reject invalid filters', () => {
  assert.equal(sanitizeGuideFilter('letters'), DEFAULT_SETTINGS.guideFilter)
  assert.equal(sanitizePracticeLevel('Expert'), DEFAULT_SETTINGS.practiceLevel)
  assert.equal(sanitizeAchievementCategory('Badges'), DEFAULT_SETTINGS.achievementCategory)
})

test('readStoredValue and writeStoredValue handle JSON values', () => {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
  }

  writeStoredValue('signspeak.test', { ok: true })

  assert.deepEqual(readStoredValue('signspeak.test', null), { ok: true })
  assert.equal(readStoredValue('signspeak.missing', 'fallback'), 'fallback')

  delete globalThis.localStorage
})
