import { readFileSync, writeFileSync } from 'node:fs'
import { extname } from 'node:path'

const defaultFiles = [
  'README.md',
  'CONTRIBUTING.md',
  'docs/ROADMAP.md',
  'docs/CONTRIBUTION_BACKLOG.md',
  'docs/LABELS.md',
  'package.json',
  '.github/PULL_REQUEST_TEMPLATE.md',
  '.github/workflows/ci.yml',
  '.prettierrc',
  'src/App.jsx',
  'src/App.module.css',
  'src/data/achievementCategories.js',
  'src/data/practiceLevels.js',
  'src/hooks/aslClassifier.js',
  'src/hooks/aslClassifier.test.js',
  'src/hooks/useHandTracking.js',
  'src/utils/clipboard.js',
  'src/utils/clipboard.test.js',
  'src/utils/keyboard.js',
  'src/utils/keyboard.test.js',
  'src/utils/lazyLibraries.js',
  'src/utils/lazyLibraries.test.js',
  'src/utils/learning.js',
  'src/utils/learning.test.js',
  'src/utils/preferences.js',
  'src/utils/preferences.test.js',
  'scripts/build-report.mjs',
  'scripts/format.mjs',
  'scripts/lint.mjs',
]

const textExtensions = new Set(['.css', '.js', '.jsx', '.json', '.md', '.yml'])
const files = process.argv.slice(2)
const targets = files.length > 0 ? files : defaultFiles
let changed = 0

for (const file of targets) {
  if (!textExtensions.has(extname(file))) continue
  const original = readFileSync(file, 'utf8')
  const formatted = `${original
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[\t ]+$/g, ''))
    .join('\n')
    .replace(/\n*$/g, '')}\n`

  if (formatted !== original) {
    writeFileSync(file, formatted)
    changed++
    console.log(`formatted ${file}`)
  }
}

console.log(`Format completed. ${changed} file${changed === 1 ? '' : 's'} updated.`)
