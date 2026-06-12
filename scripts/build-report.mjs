import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const assetsDir = 'dist/assets'
const rows = readdirSync(assetsDir)
  .map((file) => {
    const path = join(assetsDir, file)
    const size = statSync(path).size
    return { file, size }
  })
  .sort((a, b) => b.size - a.size)

const total = rows.reduce((sum, row) => sum + row.size, 0)
const formatKb = (bytes) => `${(bytes / 1024).toFixed(2)} kB`

console.log('Build asset report')
for (const row of rows) {
  console.log(`- ${row.file}: ${formatKb(row.size)}`)
}
console.log(`Total assets: ${formatKb(total)}`)
