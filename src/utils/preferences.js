import { ACHIEVEMENT_CATEGORIES } from '../data/achievementLibrary.js'
import { PRACTICE_LEVELS } from '../data/practiceLibrary.js'

export const STORAGE_KEYS = {
  ttsEnabled: 'signspeak.ttsEnabled',
  tab: 'signspeak.tab',
  speechRate: 'signspeak.speechRate',
  speechPitch: 'signspeak.speechPitch',
  guideFilter: 'signspeak.guideFilter',
  practiceLevel: 'signspeak.practiceLevel',
  achievementCategory: 'signspeak.achievementCategory',
}

export const DEFAULT_SETTINGS = {
  tts: true,
  tab: 'stats',
  speechRate: 0.92,
  speechPitch: 1,
  guideFilter: 'all',
  practiceLevel: 'All',
  achievementCategory: 'All',
}

export function readStoredValue(key, fallback) {
  try {
    const storage = globalThis.localStorage
    if (!storage) return fallback
    const value = storage.getItem(key)
    if (value == null) return fallback
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export function writeStoredValue(key, value) {
  try {
    const storage = globalThis.localStorage
    if (!storage) return
    storage.setItem(key, JSON.stringify(value))
  } catch {
    // no-op when storage is unavailable
  }
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function sanitizeTab(value) {
  return ['stats', 'guide', 'practice', 'achievements'].includes(value) ? value : DEFAULT_SETTINGS.tab
}

export function sanitizeGuideFilter(value) {
  return ['all', 'letter', 'word'].includes(value) ? value : DEFAULT_SETTINGS.guideFilter
}

export function sanitizePracticeLevel(value) {
  return PRACTICE_LEVELS.includes(value) ? value : DEFAULT_SETTINGS.practiceLevel
}

export function sanitizeAchievementCategory(value) {
  return ACHIEVEMENT_CATEGORIES.includes(value) ? value : DEFAULT_SETTINGS.achievementCategory
}
