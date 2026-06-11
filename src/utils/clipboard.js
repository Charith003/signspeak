export const COPY_STATUS = {
  idle: 'idle',
  copied: 'copied',
  failed: 'failed',
}

export function getCopyStatusLabel(status) {
  if (status === COPY_STATUS.copied) return 'Copied!'
  if (status === COPY_STATUS.failed) return 'Copy failed'
  return 'Copy'
}

export function resetCopyStatus(setCopyStatus, delayMs = 1400) {
  const timeoutId = globalThis.setTimeout(() => setCopyStatus(COPY_STATUS.idle), delayMs)
  return () => globalThis.clearTimeout(timeoutId)
}

export async function copyText(text, doc = globalThis.document, nav = globalThis.navigator) {
  if (!text) return false

  if (nav?.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(text)
      return true
    } catch {
      // Fall back to a temporary textarea for browsers that block clipboard writes.
    }
  }

  if (!doc?.body?.appendChild || !doc?.createElement || !doc?.execCommand) return false

  const activeElement = doc.activeElement
  const textarea = doc.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.setAttribute('aria-hidden', 'true')
  textarea.style.position = 'fixed'
  textarea.style.inset = '0 auto auto 0'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'
  doc.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  if (textarea.setSelectionRange) textarea.setSelectionRange(0, text.length)

  try {
    return Boolean(doc.execCommand('copy'))
  } catch {
    return false
  } finally {
    textarea.remove()
    if (activeElement?.focus) activeElement.focus()
  }
}
