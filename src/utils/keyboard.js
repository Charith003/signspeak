const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

export function isEditableTarget(target) {
  if (!target) return false
  if (target.isContentEditable) return true
  return EDITABLE_TAGS.has(target.tagName)
}
