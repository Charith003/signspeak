const REQUIRED_PRACTICE_FIELDS = ['id', 'title', 'level', 'durationMin', 'focus', 'signs', 'goals', 'drills', 'successCriteria', 'coachingTips']
const REQUIRED_ACHIEVEMENT_FIELDS = ['id', 'title', 'category', 'tier', 'points', 'target', 'description', 'signals', 'unlockTips', 'progressHints']

export function asStringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []
}

export function toggleStringId(ids, id) {
  const current = asStringArray(ids)
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
}

export function validatePracticeLibrary(library) {
  return validateLibrary(library, REQUIRED_PRACTICE_FIELDS)
}

export function validateAchievementLibrary(library) {
  return validateLibrary(library, REQUIRED_ACHIEVEMENT_FIELDS)
}

function validateLibrary(library, requiredFields) {
  if (!Array.isArray(library)) return [{ id: 'library', field: 'root', message: 'Library must be an array.' }]

  return library.flatMap((entry, index) => requiredFields
    .filter((field) => entry?.[field] == null)
    .map((field) => ({
      id: entry?.id || `entry-${index}`,
      field,
      message: `Missing required field: ${field}`,
    })))
}

export function getLessonProgress(lesson, sentence) {
  if (!lesson) return { matched: [], nextSign: null, percent: 0, complete: false }

  const signed = asStringArray(sentence)
  const matched = lesson.signs.filter((sign) => signed.includes(sign))
  const nextSign = lesson.signs.find((sign) => !matched.includes(sign)) || null
  const percent = lesson.signs.length === 0 ? 0 : Math.round((matched.length / lesson.signs.length) * 100)

  return {
    matched,
    nextSign,
    percent,
    complete: percent >= 100,
  }
}

export function getAchievementProgress(achievement, metrics) {
  const value = getAchievementMetricValue(achievement, metrics)
  const target = Math.max(achievement.target || 1, 1)
  const percent = Math.min(100, Math.round((value / target) * 100))

  return {
    value,
    target,
    percent,
    complete: percent >= 100,
  }
}

function getAchievementMetricValue(achievement, metrics) {
  switch (achievement.category) {
    case 'Recognition':
      return metrics.currentStability >= 80 ? 1 : 0
    case 'Practice':
      return metrics.completedLessons
    case 'Consistency':
      return metrics.favoriteLessons + metrics.completedLessons
    case 'Fluency':
      return metrics.wordCount + metrics.recognizedTotal
    case 'Session':
      return metrics.elapsedMin
    default:
      return metrics.historyLength
  }
}
