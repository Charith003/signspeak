import { useState, useRef } from 'react'
import { useHandTracking } from './hooks/useHandTracking.js'
import styles from './App.module.css'

const SIGN_REFERENCE = [
  { sign:'A',        desc:'Fist, thumb to side' },
  { sign:'B',        desc:'Four fingers up, thumb tucked' },
  { sign:'C',        desc:'Curved hand, C-shape' },
  { sign:'D',        desc:'Index up, others curl to thumb' },
  { sign:'E',        desc:'All fingers curled under' },
  { sign:'F',        desc:'Index+thumb touch, others up' },
  { sign:'I',        desc:'Pinky only extended' },
  { sign:'L',        desc:'Index + thumb out (L-shape)' },
  { sign:'O',        desc:'All fingers curve to form O' },
  { sign:'U',        desc:'Index + middle up, together' },
  { sign:'V',        desc:'Index + middle up, spread' },
  { sign:'W',        desc:'Index + middle + ring up' },
  { sign:'Y',        desc:'Thumb + pinky extended' },
  { sign:'HELLO',    desc:'Open hand, all 5 fingers, palm out' },
  { sign:'STOP',     desc:'Flat hand, palm facing forward' },
  { sign:'YES',      desc:'Closed fist, thumb side' },
  { sign:'NO',       desc:'Index + middle together, forward' },
  { sign:'LOVE ❤',  desc:'Index + pinky + thumb (ILY sign)' },
  { sign:'GOOD 👍',  desc:'Thumbs up' },
  { sign:'BAD 👎',   desc:'Thumbs down' },
  { sign:'PEACE ✌', desc:'V-sign, palm out' },
  { sign:'PLEASE',   desc:'Flat hand, thumb near palm' },
  { sign:'HELP',     desc:'Thumb up from fist' },
  { sign:'MORE',     desc:'Pinched O-shape' },
  { sign:'WHERE?',   desc:'Single index pointing up' },
]

function speakText(text) {
  if (!text || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 0.92; u.pitch = 1
  window.speechSynthesis.speak(u)
}

export default function App() {
  const {
    videoRef, canvasRef,
    currentSign, sentence, history,
    status, statusMsg,
    fps, handsCount,
    clearSentence, clearHistory,
  } = useHandTracking()

  const [tts, setTts] = useState(true)
  const [tab, setTab] = useState('stats')
  const prevSign = useRef('')

  // Auto-TTS per word
  if (tts && currentSign && currentSign.sign !== prevSign.current) {
    prevSign.current = currentSign.sign
    speakText(currentSign.sign)
  }
  if (!currentSign) prevSign.current = ''

  const confColor = !currentSign ? 'var(--t3)'
    : currentSign.stability >= 80 ? 'var(--acc)'
    : currentSign.stability >= 55 ? 'var(--acc2)'
    : 'var(--warn)'

  const isReady = status === 'ready'
  const isError = status === 'error'

  return (
    <div className={styles.app}>

      {/* ── HEADER ── */}
      <header className={styles.hdr}>
        <div className={styles.logo}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="var(--acc)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
            <line x1="6" y1="1" x2="6" y2="4"/>
            <line x1="10" y1="1" x2="10" y2="4"/>
            <line x1="14" y1="1" x2="14" y2="4"/>
          </svg>
          <span className={styles.logoName}>SignSpeak</span>
          <span className={styles.logoBadge}>ASL · No Model · No Training</span>
        </div>
        <div className={styles.hdrRight}>
          <span className={styles.dot}
            data-status={status} />
          <span className={styles.statusTxt}>
            {isError ? statusMsg
              : !isReady ? statusMsg
              : handsCount === 0 ? 'No hand detected'
              : `Hand detected · ${fps} fps`}
          </span>
        </div>
      </header>

      {/* ── MAIN GRID ── */}
      <div className={styles.grid}>

        {/* LEFT */}
        <div className={styles.camCol}>
          <div className={styles.camWrap}>
            <video ref={videoRef} className={styles.video}
              autoPlay muted playsInline />
            <canvas ref={canvasRef} className={styles.canvas}
              width={640} height={480} />

            <span className={`${styles.corner} ${styles.tl}`}/>
            <span className={`${styles.corner} ${styles.tr}`}/>
            <span className={`${styles.corner} ${styles.bl}`}/>
            <span className={`${styles.corner} ${styles.br}`}/>

            {/* Loading / Error overlay */}
            {!isReady && (
              <div className={`${styles.loadOverlay} ${isError ? styles.errorOverlay : ''}`}>
                {isError ? (
                  <>
                    <span className={styles.errorIcon}>⚠</span>
                    <span className={styles.errorMsg}>{statusMsg}</span>
                    <button className={`${styles.btn} ${styles.btnPrimary}`}
                      style={{marginTop:8}}
                      onClick={() => window.location.reload()}>
                      Refresh & retry
                    </button>
                  </>
                ) : (
                  <>
                    <div className={styles.spinner}/>
                    <span>{statusMsg}</span>
                    <span className={styles.loadSub}>
                      {status === 'init'    ? 'Starting up…'     :
                       status === 'loading' ? 'Using local files — no internet needed' :
                       'Almost ready…'}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Sign badge */}
            {isReady && currentSign && (
              <div className={styles.badge}>
                <span className={styles.badgeSign}>{currentSign.sign}</span>
                <span className={styles.badgeConf} style={{ color: confColor }}>
                  {currentSign.stability}%
                </span>
                <span className={styles.badgeType}>{currentSign.type}</span>
              </div>
            )}

            {/* No-hand hint */}
            {isReady && handsCount === 0 && (
              <div className={styles.noHand}>✋ Show your hand to the camera</div>
            )}
          </div>

          {/* ── SENTENCE BAR ── */}
          <div className={styles.sentBar}>
            <div className={styles.sentLabel}>Current sentence</div>
            <div className={styles.sentText}>
              {sentence.length === 0
                ? <span className={styles.sentPlaceholder}>Make a sign to start…</span>
                : sentence.map((w, i) => (
                    <span key={i} className={styles.sentWord}
                      style={{ color: i === sentence.length-1 ? 'var(--acc)' : 'var(--t1)' }}>
                      {w}{i < sentence.length-1 ? ' ' : ''}
                    </span>
                  ))
              }
            </div>
            <div className={styles.sentActions}>
              <button className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => speakText(sentence.join(' '))}
                disabled={sentence.length === 0}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
                Speak sentence
              </button>
              <button className={`${styles.btn} ${tts ? styles.btnAccent2 : ''}`}
                onClick={() => setTts(v => !v)}>
                Auto TTS: {tts ? 'ON' : 'OFF'}
              </button>
              <button className={styles.btn}
                onClick={clearSentence} disabled={sentence.length === 0}>
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <aside className={styles.sidebar}>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${tab==='stats'?styles.tabAct:''}`}
              onClick={() => setTab('stats')}>Live stats</button>
            <button className={`${styles.tab} ${tab==='guide'?styles.tabAct:''}`}
              onClick={() => setTab('guide')}>Sign guide</button>
          </div>

          {tab === 'stats' ? (
            <div className={styles.panel}>
              <div className={styles.panelLabel}>Recognition</div>

              <div className={styles.statRow}>
                <span className={styles.statKey}>Sign</span>
                <span style={{
                  fontFamily:'var(--fh)', fontWeight:800,
                  color: currentSign ? 'var(--acc)' : 'var(--t3)',
                  fontSize:'1rem', textTransform:'uppercase'
                }}>
                  {currentSign ? currentSign.sign : '—'}
                </span>
              </div>

              <div className={styles.statRow}>
                <span className={styles.statKey}>Stability</span>
                <div className={styles.barTrack}>
                  <div className={styles.barFill}
                    style={{ width:`${currentSign?.stability||0}%`, background:confColor }}/>
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
                <span className={styles.statVal}
                  style={{ color: handsCount>0 ? 'var(--acc)':'var(--t3)' }}>
                  {handsCount > 0 ? `${handsCount} detected` : 'none'}
                </span>
              </div>

              <div className={styles.statRow}>
                <span className={styles.statKey}>Status</span>
                <span className={`${styles.chip} ${isReady ? styles.chipGreen : styles.chipOrange}`}>
                  {status}
                </span>
              </div>

              <div className={styles.divider}/>
              <div className={styles.panelLabel} style={{marginTop:0}}>Tips</div>
              <ul className={styles.tips}>
                <li>Good lighting on your hand</li>
                <li>Hold each sign for ~1 second</li>
                <li>Keep full hand in frame</li>
                <li>Plain background works best</li>
                <li>Pause 2 s to save sentence</li>
              </ul>
            </div>
          ) : (
            <div className={styles.panel}>
              <div className={styles.panelLabel}>{SIGN_REFERENCE.length} supported signs</div>
              <div className={styles.guideGrid}>
                {SIGN_REFERENCE.map(({ sign, desc }) => (
                  <div key={sign} className={styles.guideCard}
                    style={{ borderColor: currentSign?.sign===sign ? 'var(--acc)':'transparent' }}>
                    <span className={styles.guideSign}>{sign}</span>
                    <span className={styles.guideDesc}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ── HISTORY ── */}
      {history.length > 0 && (
        <div className={styles.histSection}>
          <div className={styles.histHeader}>
            <span className={styles.panelLabel} style={{margin:0}}>Session history</span>
            <button className={`${styles.btn} ${styles.btnSm}`} onClick={clearHistory}>
              Clear all
            </button>
          </div>
          <div className={styles.histList}>
            {history.map((h, i) => (
              <div key={i} className={styles.histItem}>
                <span className={styles.histText}>{h.text}</span>
                <div className={styles.histMeta}>
                  <span className={styles.histTime}>{h.time}</span>
                  <button className={`${styles.btn} ${styles.btnSm}`}
                    onClick={() => speakText(h.text)}>▶</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <footer className={styles.footer}>
        <span>MediaPipe Hands (local) · Geometry classifier · Web Speech API</span>
        <span>100% offline after install · No model files</span>
      </footer>
    </div>
  )
}
