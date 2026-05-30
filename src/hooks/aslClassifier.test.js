import assert from 'node:assert/strict'
import test from 'node:test'
import { SignSmoother } from './aslClassifier.js'

test('SignSmoother returns null before enough valid frames exist', () => {
  const smoother = new SignSmoother(12)

  smoother.push({ sign: 'A', type: 'letter', confidence: 0.9 })
  smoother.push(null)
  smoother.push({ sign: 'A', type: 'letter', confidence: 0.9 })

  assert.equal(smoother.best(), null)
})

test('SignSmoother returns the top sign once it appears often enough', () => {
  const smoother = new SignSmoother(12)

  for (let i = 0; i < 4; i++) {
    smoother.push({ sign: 'B', type: 'letter', confidence: 0.9 })
  }
  smoother.push({ sign: 'A', type: 'letter', confidence: 0.8 })

  assert.deepEqual(smoother.best(), {
    sign: 'B',
    type: 'letter',
    confidence: 0.9,
    stability: 80,
  })
})

test('SignSmoother clear resets the smoothing buffer', () => {
  const smoother = new SignSmoother(12)

  for (let i = 0; i < 4; i++) {
    smoother.push({ sign: 'C', type: 'letter', confidence: 0.82 })
  }
  assert.equal(smoother.best()?.sign, 'C')

  smoother.clear()

  assert.equal(smoother.best(), null)
})
