/**
 * aslClassifier.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure geometry-based ASL static hand-sign classifier.
 * Uses MediaPipe 21-landmark hand skeleton — NO model files, NO training.
 *
 * Landmark indices (MediaPipe Hands):
 *   0  = WRIST
 *   1-4  = THUMB  (CMC, MCP, IP, TIP)
 *   5-8  = INDEX  (MCP, PIP, DIP, TIP)
 *   9-12 = MIDDLE (MCP, PIP, DIP, TIP)
 *  13-16 = RING   (MCP, PIP, DIP, TIP)
 *  17-20 = PINKY  (MCP, PIP, DIP, TIP)
 */

// ── Geometry helpers ──────────────────────────────────────────────────────────

/** Euclidean distance between two landmarks */
function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0))
}

/**
 * Is a finger extended?
 * Compares TIP distance from wrist vs MCP distance from wrist.
 * ratio > 1 means the tip is farther out than the knuckle → extended.
 */
function isExtended(lm, mcp, pip, tip, threshold = 1.15) {
  const wrist = lm[0]
  const tipDist = dist(wrist, lm[tip])
  const mcpDist = dist(wrist, lm[mcp])
  return tipDist > mcpDist * threshold
}

/**
 * Finger curl ratio: 0 = fully extended, 1 = fully curled.
 * Uses PIP bend angle as proxy.
 */
function curlRatio(lm, mcp, pip, dip, tip) {
  const straight = dist(lm[mcp], lm[tip])
  const actual   = dist(lm[mcp], lm[pip]) + dist(lm[pip], lm[dip]) + dist(lm[dip], lm[tip])
  return 1 - (straight / actual)   // 0 = straight, approaches 1 = fully bent
}

/** Angle at vertex B formed by points A-B-C (degrees) */
function angleDeg(A, B, C) {
  const ab = { x: A.x - B.x, y: A.y - B.y }
  const cb = { x: C.x - B.x, y: C.y - B.y }
  const dot = ab.x * cb.x + ab.y * cb.y
  const mag = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y)
  return (Math.acos(Math.max(-1, Math.min(1, dot / (mag || 1)))) * 180) / Math.PI
}

/** True if hand is oriented palm-facing-camera (right hand) */
function isPalmFacing(lm) {
  // index MCP (5) is to the LEFT of pinky MCP (17) for palm-facing right hand
  return lm[5].x < lm[17].x
}

/** Normalised hand size (wrist → middle MCP) for scale-invariance */
function handScale(lm) {
  return dist(lm[0], lm[9]) || 0.01
}

// ── Per-finger state ──────────────────────────────────────────────────────────
function fingerStates(lm) {
  return {
    thumb:  isExtended(lm, 2, 3, 4,  1.05),   // thumb needs lower threshold
    index:  isExtended(lm, 5, 6, 8),
    middle: isExtended(lm, 9, 10, 12),
    ring:   isExtended(lm, 13, 14, 16),
    pinky:  isExtended(lm, 17, 18, 20),
    // curl values (0=straight, 1=curled)
    indexCurl:  curlRatio(lm, 5, 6, 7, 8),
    middleCurl: curlRatio(lm, 9, 10, 11, 12),
    ringCurl:   curlRatio(lm, 13, 14, 15, 16),
    pinkyCurl:  curlRatio(lm, 17, 18, 19, 20),
  }
}

// ── Main classifier ───────────────────────────────────────────────────────────
export function classifyASL(landmarks) {
  if (!landmarks || landmarks.length < 21) return null

  const lm   = landmarks
  const f    = fingerStates(lm)
  const sc   = handScale(lm)
  const palm = isPalmFacing(lm)

  // Derived distances (normalised by hand scale)
  const thumbTipIndex  = dist(lm[4], lm[8])  / sc
  const thumbTipMiddle = dist(lm[4], lm[12]) / sc
  const thumbTipRing   = dist(lm[4], lm[16]) / sc
  const thumbTipPinky  = dist(lm[4], lm[20]) / sc
  const indexMiddleTip = dist(lm[8], lm[12]) / sc
  const thumbIndexBase = dist(lm[4], lm[5])  / sc

  const allCurled   = !f.index && !f.middle && !f.ring && !f.pinky
  const allExtended = f.index && f.middle && f.ring && f.pinky

  // ── ASL Letters ────────────────────────────────────────────────────────────

  // A — fist, thumb to the side
  if (allCurled && f.thumb && thumbTipIndex > 0.4)
    return { sign: 'A', type: 'letter', confidence: 0.88 }

  // B — four fingers up, thumb tucked
  if (f.index && f.middle && f.ring && f.pinky && !f.thumb)
    return { sign: 'B', type: 'letter', confidence: 0.90 }

  // C — curved hand, all fingers slightly bent like a C
  if (!f.index && !f.middle && !f.ring && !f.pinky && !f.thumb
      && f.indexCurl > 0.15 && f.indexCurl < 0.55
      && thumbTipIndex < 1.2 && thumbTipIndex > 0.5)
    return { sign: 'C', type: 'letter', confidence: 0.82 }

  // D — index up, middle+ring+pinky curled touching thumb
  if (f.index && !f.middle && !f.ring && !f.pinky && thumbTipMiddle < 0.35)
    return { sign: 'D', type: 'letter', confidence: 0.85 }

  // E — all fingers curled, thumb tucked under
  if (!f.index && !f.middle && !f.ring && !f.pinky && !f.thumb
      && f.indexCurl > 0.5 && f.middleCurl > 0.5)
    return { sign: 'E', type: 'letter', confidence: 0.80 }

  // F — index+thumb touch, others extended
  if (thumbTipIndex < 0.25 && f.middle && f.ring && f.pinky)
    return { sign: 'F', type: 'letter', confidence: 0.87 }

  // I — pinky up only
  if (!f.index && !f.middle && !f.ring && f.pinky && !f.thumb)
    return { sign: 'I', type: 'letter', confidence: 0.88 }

  // L — index + thumb extended at ~90°
  if (f.index && f.thumb && !f.middle && !f.ring && !f.pinky) {
    const ang = angleDeg(lm[8], lm[5], lm[4])
    if (ang > 50) return { sign: 'L', type: 'letter', confidence: 0.90 }
  }

  // O — all fingers curved, tip-to-tip circle
  if (!f.index && !f.middle && !f.ring && !f.pinky
      && thumbTipIndex < 0.4 && f.indexCurl > 0.3 && f.indexCurl < 0.7)
    return { sign: 'O', type: 'letter', confidence: 0.82 }

  // U — index + middle up together, others down
  if (f.index && f.middle && !f.ring && !f.pinky && !f.thumb
      && indexMiddleTip < 0.3)
    return { sign: 'U', type: 'letter', confidence: 0.87 }

  // V — index + middle up, spread apart
  if (f.index && f.middle && !f.ring && !f.pinky && !f.thumb
      && indexMiddleTip >= 0.3)
    return { sign: 'V', type: 'letter', confidence: 0.88 }

  // W — index + middle + ring up
  if (f.index && f.middle && f.ring && !f.pinky && !f.thumb)
    return { sign: 'W', type: 'letter', confidence: 0.87 }

  // Y — thumb + pinky extended
  if (f.thumb && !f.index && !f.middle && !f.ring && f.pinky)
    return { sign: 'Y', type: 'letter', confidence: 0.90 }

  // ── ASL Words / Phrases ────────────────────────────────────────────────────

  // HELLO — open hand, all 5 extended, palm facing out
  if (allExtended && f.thumb && palm)
    return { sign: 'HELLO', type: 'word', confidence: 0.91 }

  // STOP — flat hand, all extended, palm facing forward
  if (allExtended && f.thumb && !palm)
    return { sign: 'STOP', type: 'word', confidence: 0.87 }

  // YES — fist nodding (closed fist, thumb on side)
  if (allCurled && !f.thumb && thumbTipIndex > 0.3)
    return { sign: 'YES', type: 'word', confidence: 0.85 }

  // NO — index + middle together point forward, others curled
  if (f.index && f.middle && !f.ring && !f.pinky && !f.thumb
      && indexMiddleTip < 0.25)
    return { sign: 'NO', type: 'word', confidence: 0.86 }

  // LOVE / ILY — index + pinky + thumb extended
  if (f.index && !f.middle && !f.ring && f.pinky && f.thumb)
    return { sign: 'LOVE ❤', type: 'word', confidence: 0.93 }

  // BAD — thumb down (thumb extended, others curled, tip pointing down)
  if (f.thumb && !f.index && !f.middle && !f.ring && !f.pinky
      && lm[4].y > lm[3].y)   // tip below IP joint → pointing down
    return { sign: 'BAD 👎', type: 'word', confidence: 0.88 }

  // GOOD — thumb up
  if (f.thumb && !f.index && !f.middle && !f.ring && !f.pinky)
    return { sign: 'GOOD 👍', type: 'word', confidence: 0.92 }

  // PEACE / THANK YOU — index + middle spread, palm out
  if (f.index && f.middle && !f.ring && !f.pinky
      && indexMiddleTip > 0.3 && !f.thumb)
    return { sign: 'PEACE ✌', type: 'word', confidence: 0.88 }

  // PLEASE — flat hand on chest (all extended, thumb close to palm)
  if (f.index && f.middle && f.ring && f.pinky && f.thumb
      && thumbIndexBase < 0.4)
    return { sign: 'PLEASE', type: 'word', confidence: 0.82 }

  // HELP — fist with thumb up, non-dominant hand lift (approximate: thumb+fist)
  if (!f.index && !f.middle && !f.ring && !f.pinky && f.thumb
      && thumbTipIndex < 0.6)
    return { sign: 'HELP', type: 'word', confidence: 0.83 }

  // WATER — W shape (index+middle+ring up, others down)
  // already covered by W above, so this maps W → WATER context
  // (handled via W letter above — user sees W then maps word themselves)

  // MORE — both hands pinched (single hand: O shape with touch)
  if (!f.index && !f.middle && !f.ring && !f.pinky && !f.thumb
      && thumbTipIndex < 0.35)
    return { sign: 'MORE', type: 'word', confidence: 0.81 }

  // POINT / WHERE — single index finger pointing up
  if (f.index && !f.middle && !f.ring && !f.pinky && !f.thumb)
    return { sign: 'WHERE?', type: 'word', confidence: 0.84 }

  return null
}

/** Smoothing buffer — returns most common sign over last N frames */
export class SignSmoother {
  constructor(windowSize = 12) {
    this.buffer = []
    this.windowSize = windowSize
  }

  push(result) {
    this.buffer.push(result)
    if (this.buffer.length > this.windowSize) this.buffer.shift()
  }

  best() {
    const valid = this.buffer.filter(Boolean)
    if (valid.length < 3) return null

    const counts = {}
    for (const r of valid) {
      counts[r.sign] = (counts[r.sign] || 0) + 1
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    if (!top || top[1] < 4) return null   // need at least 4/12 frames

    const best = valid.find(r => r.sign === top[0])
    return { ...best, stability: Math.round((top[1] / valid.length) * 100) }
  }

  clear() { this.buffer = [] }
}
