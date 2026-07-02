import { readFileSync } from 'node:fs'
import { extname } from 'node:path'
import { ACHIEVEMENT_LIBRARY } from '../src/data/achievementLibrary.js'
import { PRACTICE_LIBRARY } from '../src/data/practiceLibrary.js'
import { validateAchievementLibrary, validatePracticeLibrary } from '../src/utils/learning.js'

const files = process.argv.slice(2)
const sourceFiles = files.length > 0 ? files : [
  'README.md',
  'CONTRIBUTING.md',
  'docs/ROADMAP.md',
  'docs/LABELS.md',
  'docs/CONTRIBUTION_BACKLOG.md',
  'package.json',
  '.github/workflows/ci.yml',
  '.prettierrc',
  'src/App.jsx',
  'src/App.module.css',
  'src/data/achievementCategories.js',
  'src/data/practiceLevels.js',
  'src/hooks/aslClassifier.js',
  'src/hooks/useHandTracking.js',
  'src/utils/keyboard.js',
  'src/utils/clipboard.js',
  'src/utils/clipboard.test.js',
  'src/utils/lazyLibraries.js',
  'src/utils/lazyLibraries.test.js',
  'src/utils/learning.js',
  'src/utils/preferences.js',
  'scripts/build-report.mjs',
  'scripts/format.mjs',
  'scripts/lint.mjs',
]

const textExtensions = new Set(['.css', '.js', '.jsx', '.json', '.md', '.yml'])
const failures = []

for (const file of sourceFiles) {
  if (!textExtensions.has(extname(file))) continue
  const text = readFileSync(file, 'utf8')

  text.split('\n').forEach((line, index) => {
    if (/\s+$/.test(line)) failures.push(`${file}:${index + 1} has trailing whitespace`)
  })

  if (!text.endsWith('\n')) failures.push(`${file} must end with a newline`)
}

for (const issue of validatePracticeLibrary(PRACTICE_LIBRARY)) {
  failures.push(`practice:${issue.id} ${issue.message}`)
}

for (const issue of validateAchievementLibrary(ACHIEVEMENT_LIBRARY)) {
  failures.push(`achievement:${issue.id} ${issue.message}`)
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`Lint checks passed for ${sourceFiles.length} files and learning data libraries.`)
