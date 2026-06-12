const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

export function isEditableTarget(target) {
  if (!target) return false
  if (target.isContentEditable) return true
  return EDITABLE_TAGS.has(target.tagName)
}

export function normalizeShortcutKey(event) {
  if (!event?.key) return ''
  if (event.key === '?' || (event.key === '/' && event.shiftKey)) return '?'
  return event.key.toLowerCase()
}

export function isShortcutEvent(event) {
  return Boolean(event && !event.repeat && !isEditableTarget(event.target))
}
