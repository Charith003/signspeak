import assert from 'node:assert/strict'
import test from 'node:test'
import { isEditableTarget } from './keyboard.js'

test('isEditableTarget returns true for form fields', () => {
  assert.equal(isEditableTarget({ tagName: 'INPUT' }), true)
  assert.equal(isEditableTarget({ tagName: 'TEXTAREA' }), true)
  assert.equal(isEditableTarget({ tagName: 'SELECT' }), true)
})

test('isEditableTarget returns true for contenteditable nodes', () => {
  assert.equal(isEditableTarget({ tagName: 'DIV', isContentEditable: true }), true)
})

test('isEditableTarget returns false for non-editable controls', () => {
  assert.equal(isEditableTarget({ tagName: 'BUTTON' }), false)
  assert.equal(isEditableTarget(null), false)
})
