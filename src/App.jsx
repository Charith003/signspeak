import { useEffect, useMemo, useRef, useState } from 'react'
import { useHandTracking } from './hooks/useHandTracking.js'
import styles from './App.module.css'

const SIGN_REFERENCE = [
  { sign: 'A', desc: 'Fist, thumb to side', category: 'letter' },
  { sign: 'B', desc: 'Four fingers up, thumb tucked', category: 'letter' },
  { sign: 'C', desc: 'Curved hand, C-shape', category: 'letter' },
  { sign: 'D', desc: 'Index up, others curl to thumb', category: 'letter' },
  { sign: 'E', desc: 'All fingers curled under', category: 'letter' },
  { sign: 'F', desc: 'Index+thumb touch, others up', category: 'letter' },
  { sign: 'I', desc: 'Pinky only extended', category: 'letter' },
  { sign: 'L', desc: 'Index + thumb out (L-shape)', category: 'letter' },
  { sign: 'O', desc: 'All fingers curve to form O', category: 'letter' },
  { sign: 'U', desc: 'Index + middle up, together', category: 'letter' },
  { sign: 'V', desc: 'Index + middle up, spread', category: 'letter' },
  { sign: 'W', desc: 'Index + middle + ring up', category: 'letter' },
  { sign: 'Y', desc: 'Thumb + pinky extended', category: 'letter' },
  { sign: 'HELLO', desc: 'Open hand, all 5 fingers, palm out', category: 'word' },
  { sign: 'STOP', desc: 'Flat hand, palm facing forward', category: 'word' },
  { sign: 'YES', desc: 'Closed fist, thumb side', category: 'word' },
  { sign: 'NO', desc: 'Index + middle together, forward', category: 'word' },
  { sign: 'LOVE ❤', desc: 'Index + pinky + thumb (ILY sign)', category: 'word' },
  { sign: 'GOOD 👍', desc: 'Thumbs up', category: 'word' },
  { sign: 'BAD 👎', desc: 'Thumbs down', category: 'word' },
  { sign: 'PEACE ✌', desc: 'V-sign, palm out', category: 'word' },
  { sign: 'PLEASE', desc: 'Flat hand, thumb near palm', category: 'word' },
  { sign: 'HELP', desc: 'Thumb up from fist', category: 'word' },
  { sign: 'MORE', desc: 'Pinched O-shape', category: 'word' },
  { sign: 'WHERE?', desc: 'Single index pointing up', category: 'word' },
]

const STORAGE_KEYS = {
  ttsEnabled: 'signspeak.ttsEnabled',
  tab: 'signspeak.tab',
  speechRate: 'signspeak.speechRate',
  speechPitch: 'signspeak.speechPitch',
  guideFilter: 'signspeak.guideFilter',
}

function readStoredValue(key, fallback) {
  try {
    const value = localStorage.getItem(key)
    if (value == null) return fallback
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function writeStoredValue(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // no-op when storage is unavailable
  }
}

function speakText(text, rate, pitch) {
  if (!text || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = rate
  utterance.pitch = pitch
  window.speechSynthesis.speak(utterance)
}

function copyText(text) {
  if (!text || !navigator.clipboard) return false
  navigator.clipboard.writeText(text).catch(() => {})
  return true
}

function exportHistory(history) {
  if (!history || history.length === 0) return false
  const payload = {
    exportedAt: new Date().toISOString(),
    records: history,
  }

  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `signspeak-history-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return true
  } catch {
    return false
  }
}

function copyText(text) {
  if (!text || !navigator.clipboard) return false
  navigator.clipboard.writeText(text).catch(() => {})
  return true
}

export default function App() {
  const {
    videoRef,
    canvasRef,
    currentSign,
    sentence,
    history,
    status,
    statusMsg,
    fps,
    handsCount,
    clearSentence,
    clearHistory,
  } = useHandTracking()

  const [tts, setTts] = useState(() => readStoredValue(STORAGE_KEYS.ttsEnabled, true))
  const [tab, setTab] = useState(() => readStoredValue(STORAGE_KEYS.tab, 'stats'))
  const [speechRate, setSpeechRate] = useState(() => readStoredValue(STORAGE_KEYS.speechRate, 0.92))
  const [speechPitch, setSpeechPitch] = useState(() => readStoredValue(STORAGE_KEYS.speechPitch, 1))
  const [guideFilter, setGuideFilter] = useState(() => readStoredValue(STORAGE_KEYS.guideFilter, 'all'))

  const [copied, setCopied] = useState(false)
  const [historyExported, setHistoryExported] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const prevSign = useRef('')

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.ttsEnabled, tts)
  }, [tts])

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.tab, tab)
  }, [tab])

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.speechRate, speechRate)
  }, [speechRate])

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.speechPitch, speechPitch)
  }, [speechPitch])

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.guideFilter, guideFilter)
  }, [guideFilter])

  // Auto-TTS per word
  useEffect(() => {
    if (tts && currentSign && currentSign.sign !== prevSign.current) {
      prevSign.current = currentSign.sign
      speakText(currentSign.sign, speechRate, speechPitch)
    }

    if (!currentSign) prevSign.current = ''
  }, [tts, currentSign, speechRate, speechPitch])

  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat) return
      const key = e.key.toLowerCase()
      if (key === 't') setTts((v) => !v)
      if (key === 'c') clearSentence()
      if (key === 'h') clearHistory()
      if (key === 's') setShowSettings((v) => !v)
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [clearHistory, clearSentence])

  const confColor = !currentSign
    ? 'var(--t3)'
    : currentSign.stability >= 80
      ? 'var(--acc)'
      : currentSign.stability >= 55
        ? 'var(--acc2)'
        : 'var(--warn)'

  const isReady = status === 'ready'
  const isError = status === 'error'

  const wordCount = sentence.length
  const charCount = sentence.join(' ').length

  const filteredSigns = useMemo(() => {
    if (guideFilter === 'all') return SIGN_REFERENCE
    return SIGN_REFERENCE.filter((s) => s.category === guideFilter)
  }, [guideFilter])

  const recognizedTotal = history.reduce((sum, entry) => sum + entry.text.split(' ').filter(Boolean).length, 0)

  return (
    <div className={styles.app}>
      <header className={styles.hdr}>
        <div className={styles.logo}>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--acc)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
            <line x1="6" y1="1" x2="6" y2="4" />
            <line x1="10" y1="1" x2="10" y2="4" />
            <line x1="14" y1="1" x2="14" y2="4" />
          </svg>
          <span className={styles.logoName}>SignSpeak</span>
          <span className={styles.logoBadge}>ASL · No Model · No Training</span>
        </div>
        <div className={styles.hdrRight}>
          <span className={styles.dot} data-status={status} />
          <span className={styles.statusTxt}>
            {isError
              ? statusMsg
              : !isReady
                ? statusMsg
                : handsCount === 0
                  ? 'No hand detected'
                  : `Hand detected · ${fps} fps`}
          </span>
        </div>
      </header>

      <div className={styles.grid}>
        <div className={styles.camCol}>
          <div className={styles.camWrap}>
            <video ref={videoRef} className={styles.video} autoPlay muted playsInline />
            <canvas ref={canvasRef} className={styles.canvas} width={640} height={480} />

            <span className={`${styles.corner} ${styles.tl}`} />
            <span className={`${styles.corner} ${styles.tr}`} />
            <span className={`${styles.corner} ${styles.bl}`} />
            <span className={`${styles.corner} ${styles.br}`} />

            {!isReady && (
              <div className={`${styles.loadOverlay} ${isError ? styles.errorOverlay : ''}`}>
                {isError ? (
                  <>
                    <span className={styles.errorIcon}>⚠</span>
                    <span className={styles.errorMsg}>{statusMsg}</span>
                    <button
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      style={{ marginTop: 8 }}
                      onClick={() => window.location.reload()}
                    >
                      Refresh & retry
                    </button>
                  </>
                ) : (
                  <>
                    <div className={styles.spinner} />
                    <span>{statusMsg}</span>
                    <span className={styles.loadSub}>
                      {status === 'init'
                        ? 'Starting up…'
                        : status === 'loading'
                          ? 'Using local files — no internet needed'
                          : 'Almost ready…'}
                    </span>
                  </>
                )}
              </div>
            )}

            {isReady && currentSign && (
              <div className={styles.badge}>
                <span className={styles.badgeSign}>{currentSign.sign}</span>
                <span className={styles.badgeConf} style={{ color: confColor }}>
                  {currentSign.stability}%
                </span>
                <span className={styles.badgeType}>{currentSign.type}</span>
              </div>
            )}

            {isReady && handsCount === 0 && <div className={styles.noHand}>✋ Show your hand to the camera</div>}
          </div>

          <div className={styles.sentBar}>
            <div className={styles.sentMetaRow}>
              <div className={styles.sentLabel}>Current sentence</div>
              <div className={styles.counts}>{wordCount} words · {charCount} chars</div>
            </div>

            <div className={styles.sentText}>
              {sentence.length === 0 ? (
                <span className={styles.sentPlaceholder}>Make a sign to start…</span>
              ) : (
                sentence.map((w, i) => (
                  <span
                    key={`${w}-${i}`}
                    className={styles.sentWord}
                    style={{ color: i === sentence.length - 1 ? 'var(--acc)' : 'var(--t1)' }}
                  >
                    {w}
                    {i < sentence.length - 1 ? ' ' : ''}
                  </span>
                ))
              )}
            </div>

            <div className={styles.sentActions}>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => speakText(sentence.join(' '), speechRate, speechPitch)}
                disabled={sentence.length === 0}
              >
                Speak sentence
              </button>

              <button className={`${styles.btn} ${tts ? styles.btnAccent2 : ''}`} onClick={() => setTts((v) => !v)}>
                Auto TTS: {tts ? 'ON' : 'OFF'}
              </button>

              <button className={styles.btn} onClick={clearSentence} disabled={sentence.length === 0}>
                Clear
              </button>

              <button
                className={styles.btn}
                onClick={() => {
                  const ok = copyText(sentence.join(' '))
                  if (ok) {
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1200)
                  }
                }}
                disabled={sentence.length === 0}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>

              <button className={styles.btn} onClick={() => setShowSettings((v) => !v)}>
                {showSettings ? 'Hide settings' : 'Show settings'}
              </button>
            </div>

            {showSettings && (
              <div className={styles.settingsPanel}>
                <div className={styles.settingRow}>
                  <label htmlFor="speech-rate">Speech rate ({speechRate.toFixed(2)})</label>
                  <input
                    id="speech-rate"
                    type="range"
                    min="0.6"
                    max="1.4"
                    step="0.01"
                    value={speechRate}
                    onChange={(e) => setSpeechRate(Number(e.target.value))}
                  />
                </div>
                <div className={styles.settingRow}>
                  <label htmlFor="speech-pitch">Speech pitch ({speechPitch.toFixed(2)})</label>
                  <input
                    id="speech-pitch"
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.01"
                    value={speechPitch}
                    onChange={(e) => setSpeechPitch(Number(e.target.value))}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${tab === 'stats' ? styles.tabAct : ''}`} onClick={() => setTab('stats')}>
              Live stats
            </button>
            <button className={`${styles.tab} ${tab === 'guide' ? styles.tabAct : ''}`} onClick={() => setTab('guide')}>
              Sign guide
            </button>
          </div>

          {tab === 'stats' ? (
            <div className={styles.panel}>
              <div className={styles.panelLabel}>Recognition</div>

              <div className={styles.statRow}>
                <span className={styles.statKey}>Sign</span>
                <span className={styles.statHighlight}>{currentSign ? currentSign.sign : '—'}</span>
              </div>

              <div className={styles.statRow}>
                <span className={styles.statKey}>Stability</span>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${currentSign?.stability || 0}%`, background: confColor }} />
                </div>
                <span className={styles.statVal} style={{ color: confColor }}>
                  {currentSign ? `${currentSign.stability}%` : '—'}
                </span>
              </div>

              <div className={styles.statRow}>
                <span className={styles.statKey}>Type</span>
                <span className={styles.statVal}>{currentSign?.type || '—'}</span>
              </div>

              <div className={styles.statRow}>
                <span className={styles.statKey}>FPS</span>
                <span className={styles.statVal}>{fps || '—'}</span>
              </div>

              <div className={styles.statRow}>
                <span className={styles.statKey}>Hands</span>
                <span className={styles.statVal} style={{ color: handsCount > 0 ? 'var(--acc)' : 'var(--t3)' }}>
                  {handsCount > 0 ? `${handsCount} detected` : 'none'}
                </span>
              </div>

              <div className={styles.statRow}>
                <span className={styles.statKey}>Status</span>
                <span className={`${styles.chip} ${isReady ? styles.chipGreen : styles.chipOrange}`}>{status}</span>
              </div>

              <div className={styles.statRow}>
                <span className={styles.statKey}>History</span>
                <span className={styles.statVal}>{history.length} entries · {recognizedTotal} words total</span>
              </div>

              <div className={styles.divider} />
              <div className={styles.panelLabel} style={{ marginTop: 0 }}>Tips</div>
              <ul className={styles.tips}>
                <li>Good lighting on your hand</li>
                <li>Hold each sign for ~1 second</li>
                <li>Keep full hand in frame</li>
                <li>Plain background works best</li>
                <li>Pause 2 s to save sentence</li>
                <li>Shortcuts: T toggle TTS · C clear sentence · H clear history · S settings</li>
              </ul>
            </div>
          ) : (
            <div className={styles.panel}>
              <div className={styles.panelTopRow}>
                <div className={styles.panelLabel}>{filteredSigns.length} supported signs</div>
                <div className={styles.filterButtons}>
                  <button className={`${styles.btn} ${guideFilter === 'all' ? styles.btnAccent2 : ''}`} onClick={() => setGuideFilter('all')}>All</button>
                  <button className={`${styles.btn} ${guideFilter === 'letter' ? styles.btnAccent2 : ''}`} onClick={() => setGuideFilter('letter')}>Letters</button>
                  <button className={`${styles.btn} ${guideFilter === 'word' ? styles.btnAccent2 : ''}`} onClick={() => setGuideFilter('word')}>Words</button>
                </div>
              </div>

              <div className={styles.guideGrid}>
                {filteredSigns.map(({ sign, desc }) => (
                  <div key={sign} className={styles.guideCard} style={{ borderColor: currentSign?.sign === sign ? 'var(--acc)' : 'transparent' }}>
                    <span className={styles.guideSign}>{sign}</span>
                    <span className={styles.guideDesc}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {history.length > 0 && (
        <div className={styles.histSection}>
          <div className={styles.histHeader}>
            <span className={styles.panelLabel} style={{ margin: 0 }}>Session history</span>
            <div className={styles.histActions}>
              <button className={`${styles.btn} ${styles.btnSm}`} onClick={clearHistory}>Clear all</button>
              <button
                className={`${styles.btn} ${styles.btnSm}`}
                onClick={() => {
                  const ok = exportHistory(history)
                  if (ok) {
                    setHistoryExported(true)
                    setTimeout(() => setHistoryExported(false), 1200)
                  }
                }}
              >
                {historyExported ? 'Exported!' : 'Export JSON'}
              </button>
            </div>
          </div>

          <div className={styles.histList}>
            {history.map((h, i) => (
              <div key={`${h.time}-${i}`} className={styles.histItem}>
                <span className={styles.histText}>{h.text}</span>
                <div className={styles.histMeta}>
                  <span className={styles.histTime}>{h.time}</span>
                  <button className={`${styles.btn} ${styles.btnSm}`} onClick={() => speakText(h.text, speechRate, speechPitch)}>
                    ▶
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <footer className={styles.footer}>
        <span>MediaPipe Hands (local) · Geometry classifier · Web Speech API</span>
        <span>100% offline after install · No model files</span>
        <span className={styles.shortcutHint}>Shortcuts: [T] TTS · [C] Clear sentence · [H] Clear history · [S] Settings</span>
      </footer>
    </div>
  )
}
