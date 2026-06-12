import assert from 'node:assert/strict'
import test from 'node:test'
import { isEditableTarget, isShortcutEvent, normalizeShortcutKey } from './keyboard.js'

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

test('normalizeShortcutKey lowercases keys and handles question mark chords', () => {
  assert.equal(normalizeShortcutKey({ key: 'T' }), 't')
  assert.equal(normalizeShortcutKey({ key: '?' }), '?')
  assert.equal(normalizeShortcutKey({ key: '/', shiftKey: true }), '?')
  assert.equal(normalizeShortcutKey({ key: '/', shiftKey: false }), '/')
  assert.equal(normalizeShortcutKey({}), '')
})

test('isShortcutEvent ignores repeats and editable targets', () => {
  assert.equal(isShortcutEvent({ repeat: false, target: { tagName: 'BUTTON' } }), true)
  assert.equal(isShortcutEvent({ repeat: true, target: { tagName: 'BUTTON' } }), false)
  assert.equal(isShortcutEvent({ repeat: false, target: { tagName: 'INPUT' } }), false)
  assert.equal(isShortcutEvent(null), false)
})
