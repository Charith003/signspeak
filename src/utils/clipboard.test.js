import assert from 'node:assert/strict'
import { test } from 'node:test'
import { COPY_STATUS, copyText, getCopyStatusLabel, resetCopyStatus } from './clipboard.js'

test('getCopyStatusLabel maps copy feedback states', () => {
  assert.equal(getCopyStatusLabel(COPY_STATUS.idle), 'Copy')
  assert.equal(getCopyStatusLabel(COPY_STATUS.copied), 'Copied!')
  assert.equal(getCopyStatusLabel(COPY_STATUS.failed), 'Copy failed')
})

test('copyText uses the async Clipboard API when available', async () => {
  const writes = []
  const ok = await copyText('hello', undefined, {
    clipboard: {
      writeText: async (value) => writes.push(value),
    },
  })

  assert.equal(ok, true)
  assert.deepEqual(writes, ['hello'])
})

test('copyText falls back to textarea copy when Clipboard API fails', async () => {
  let appended = false
  let removed = false
  let focusedBack = false
  const textarea = {
    style: {},
    setAttribute() {},
    focus() {},
    select() {},
    setSelectionRange(start, end) {
      this.selection = [start, end]
    },
    remove() {
      removed = true
    },
  }
  const doc = {
    activeElement: { focus: () => { focusedBack = true } },
    body: {
      appendChild(node) {
        appended = node === textarea
      },
    },
    createElement: () => textarea,
    execCommand: (command) => command === 'copy',
  }

  const ok = await copyText('fallback', doc, {
    clipboard: {
      writeText: async () => { throw new Error('blocked') },
    },
  })

  assert.equal(ok, true)
  assert.equal(appended, true)
  assert.equal(removed, true)
  assert.equal(focusedBack, true)
  assert.deepEqual(textarea.selection, [0, 8])
})

test('copyText returns false when no copy route is available', async () => {
  assert.equal(await copyText('hello', undefined, {}), false)
  assert.equal(await copyText('', undefined, {}), false)
})

test('resetCopyStatus schedules and clears idle feedback', async () => {
  const states = []
  const cleanup = resetCopyStatus((status) => states.push(status), 5)
  await new Promise((resolve) => setTimeout(resolve, 10))
  assert.deepEqual(states, [COPY_STATUS.idle])
  cleanup()
})
