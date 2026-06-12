let practiceLibraryPromise
let achievementLibraryPromise

export function loadPracticeLibrary() {
  if (!practiceLibraryPromise) {
    practiceLibraryPromise = import('../data/practiceLibrary.js')
      .then(({ PRACTICE_LIBRARY }) => PRACTICE_LIBRARY)
      .catch((error) => {
        practiceLibraryPromise = undefined
        throw error
      })
  }

  return practiceLibraryPromise
}

export function preloadPracticeLibrary() {
  return loadPracticeLibrary().catch(() => [])
}

export function loadAchievementLibrary() {
  if (!achievementLibraryPromise) {
    achievementLibraryPromise = import('../data/achievementLibrary.js')
      .then(({ ACHIEVEMENT_LIBRARY }) => ACHIEVEMENT_LIBRARY)
      .catch((error) => {
        achievementLibraryPromise = undefined
        throw error
      })
  }

  return achievementLibraryPromise
}

export function preloadAchievementLibrary() {
  return loadAchievementLibrary().catch(() => [])
}
