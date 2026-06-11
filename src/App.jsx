import { useEffect, useMemo, useRef, useState } from 'react'
import { useHandTracking } from './hooks/useHandTracking.js'
import { ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_LIBRARY } from './data/achievementLibrary.js'
import { PRACTICE_LEVELS } from './data/practiceLevels.js'
import { COPY_STATUS, copyText, getCopyStatusLabel, resetCopyStatus } from './utils/clipboard.js'
import { isEditableTarget } from './utils/keyboard.js'
import {
  asStringArray,
  getAchievementProgress,
  getLessonProgress,
  toggleStringId,
} from './utils/learning.js'
import {
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  clamp,
  readStoredValue,
  sanitizeAchievementCategory,
  sanitizeGuideFilter,
  sanitizePracticeLevel,
  sanitizeTab,
  writeStoredValue,
} from './utils/preferences.js'
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

const STATUS_LABELS = {
  init: 'Initializing',
  loading: 'Loading',
  ready: 'Ready',
  error: 'Error',
}

const SHORTCUTS = [
  { key: 'T', action: 'Toggle Auto TTS' },
  { key: 'C', action: 'Clear sentence' },
  { key: 'H', action: 'Clear history' },
  { key: 'S', action: 'Toggle settings' },
  { key: 'P', action: 'Open practice' },
  { key: 'A', action: 'Open achievements' },
  { key: '?', action: 'Show shortcut help' },
]

const PRACTICE_GOALS = [
  { key: 'sentence', label: 'Build sentence', target: 5, suffix: 'words' },
  { key: 'sessionWords', label: 'Session words', target: 25, suffix: 'words' },
  { key: 'history', label: 'Saved phrases', target: 3, suffix: 'saved' },
  { key: 'stability', label: 'Stable sign', target: 80, suffix: '%' },
]

function buildPracticeGoals({ wordCount, recognizedTotal, historyLength, stability }) {
  const values = {
    sentence: wordCount,
    sessionWords: recognizedTotal,
    history: historyLength,
    stability,
  }

  return PRACTICE_GOALS.map((goal) => {
    const value = values[goal.key] || 0
    const progress = clamp((value / goal.target) * 100, 0, 100)

    return {
      ...goal,
      value,
      progress,
      complete: progress >= 100,
    }
  })
}


function normalizeQuery(value) {
  return value.trim().toLowerCase()
}

function includesQuery(values, query) {
  if (!query) return true
  return values.some((value) => String(value).toLowerCase().includes(query))
}

function matchesPracticeLesson(lesson, query) {
  return includesQuery([
    lesson.title,
    lesson.focus,
    lesson.level,
    ...lesson.signs,
    ...lesson.goals,
    ...lesson.drills,
  ], query)
}

function matchesAchievement(achievement, query) {
  return includesQuery([
    achievement.title,
    achievement.description,
    achievement.category,
    achievement.tier,
    achievement.points,
    achievement.target,
    ...achievement.unlockTips,
    ...achievement.progressHints,
  ], query)
}

function EmptyState({ title, body, action }) {
  return (
    <div className={styles.emptyState}>
      <strong>{title}</strong>
      <span>{body}</span>
      {action}
    </div>
  )
}

function speakText(text, rate, pitch) {
  if (!text || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = rate
  utterance.pitch = pitch
  window.speechSynthesis.speak(utterance)
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

  const [tts, setTts] = useState(() => readStoredValue(STORAGE_KEYS.ttsEnabled, DEFAULT_SETTINGS.tts))
  const [tab, setTab] = useState(() => sanitizeTab(readStoredValue(STORAGE_KEYS.tab, DEFAULT_SETTINGS.tab)))
  const [speechRate, setSpeechRate] = useState(() => clamp(readStoredValue(STORAGE_KEYS.speechRate, DEFAULT_SETTINGS.speechRate), 0.6, 1.4))
  const [speechPitch, setSpeechPitch] = useState(() => clamp(readStoredValue(STORAGE_KEYS.speechPitch, DEFAULT_SETTINGS.speechPitch), 0.5, 1.5))
  const [guideFilter, setGuideFilter] = useState(() => sanitizeGuideFilter(readStoredValue(STORAGE_KEYS.guideFilter, DEFAULT_SETTINGS.guideFilter)))
  const [practiceLevel, setPracticeLevel] = useState(() => sanitizePracticeLevel(readStoredValue(STORAGE_KEYS.practiceLevel, DEFAULT_SETTINGS.practiceLevel)))
  const [achievementCategory, setAchievementCategory] = useState(() => sanitizeAchievementCategory(readStoredValue(STORAGE_KEYS.achievementCategory, DEFAULT_SETTINGS.achievementCategory)))
  const [favoriteLessonIds, setFavoriteLessonIds] = useState(() => asStringArray(readStoredValue(STORAGE_KEYS.favoriteLessons, DEFAULT_SETTINGS.favoriteLessons)))
  const [completedLessonIds, setCompletedLessonIds] = useState(() => asStringArray(readStoredValue(STORAGE_KEYS.completedLessons, DEFAULT_SETTINGS.completedLessons)))

  const [copyStatus, setCopyStatus] = useState(COPY_STATUS.idle)
  const [historyExported, setHistoryExported] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [practiceSearch, setPracticeSearch] = useState('')
  const [achievementSearch, setAchievementSearch] = useState('')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [activeLessonId, setActiveLessonId] = useState(null)
  const [practiceLibrary, setPracticeLibrary] = useState([])
  const [practiceLoadStatus, setPracticeLoadStatus] = useState('idle')
  const [sessionStartedAt] = useState(() => Date.now())
  const [nowTs, setNowTs] = useState(() => Date.now())
  const prevSign = useRef('')
  const copyResetRef = useRef(null)

  const showCopyStatus = (status) => {
    if (copyResetRef.current) copyResetRef.current()
    setCopyStatus(status)
    copyResetRef.current = resetCopyStatus(setCopyStatus)
  }

  const handleCopySentence = async () => {
    const ok = await copyText(sentence.join(' '))
    showCopyStatus(ok ? COPY_STATUS.copied : COPY_STATUS.failed)
  }

  useEffect(() => () => {
    if (copyResetRef.current) copyResetRef.current()
  }, [])

  const resetPreferences = () => {
    setTts(DEFAULT_SETTINGS.tts)
    setTab(DEFAULT_SETTINGS.tab)
    setSpeechRate(DEFAULT_SETTINGS.speechRate)
    setSpeechPitch(DEFAULT_SETTINGS.speechPitch)
    setGuideFilter(DEFAULT_SETTINGS.guideFilter)
    setPracticeLevel(DEFAULT_SETTINGS.practiceLevel)
    setAchievementCategory(DEFAULT_SETTINGS.achievementCategory)
    setShowFavoritesOnly(false)
    setActiveLessonId(null)
    setShowSettings(false)
  }

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

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.practiceLevel, practiceLevel)
  }, [practiceLevel])

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.achievementCategory, achievementCategory)
  }, [achievementCategory])

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.favoriteLessons, favoriteLessonIds)
  }, [favoriteLessonIds])

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.completedLessons, completedLessonIds)
  }, [completedLessonIds])

  useEffect(() => {
    if (tab !== 'practice' || practiceLoadStatus !== 'idle') return undefined

    let cancelled = false
    setPracticeLoadStatus('loading')
    import('./data/practiceLibrary.js')
      .then(({ PRACTICE_LIBRARY }) => {
        if (cancelled) return
        setPracticeLibrary(PRACTICE_LIBRARY)
        setPracticeLoadStatus('loaded')
      })
      .catch(() => {
        if (!cancelled) setPracticeLoadStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [practiceLoadStatus, tab])

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
      if (e.repeat || isEditableTarget(e.target)) return
      const key = e.key.toLowerCase()
      if (key === 't') setTts((v) => !v)
      if (key === 'c') clearSentence()
      if (key === 'h') clearHistory()
      if (key === 's') setShowSettings((v) => !v)
      if (key === 'p') setTab('practice')
      if (key === 'a') setTab('achievements')
      if (key === '?' || (key === '/' && e.shiftKey)) setShowShortcuts(true)
      if (key === 'escape') setShowShortcuts(false)
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

  const filteredPractice = useMemo(() => {
    const query = normalizeQuery(practiceSearch)
    return practiceLibrary.filter((lesson) => (practiceLevel === 'All' || lesson.level === practiceLevel)
      && (!showFavoritesOnly || favoriteLessonIds.includes(lesson.id))
      && matchesPracticeLesson(lesson, query))
  }, [favoriteLessonIds, practiceLevel, practiceLibrary, practiceSearch, showFavoritesOnly])

  const filteredAchievements = useMemo(() => {
    const query = normalizeQuery(achievementSearch)
    return ACHIEVEMENT_LIBRARY.filter((achievement) => (achievementCategory === 'All' || achievement.category === achievementCategory)
      && matchesAchievement(achievement, query))
  }, [achievementCategory, achievementSearch])

  const historyMetrics = useMemo(() => {
    const recognizedTotal = history.reduce((sum, entry) => sum + entry.text.split(' ').filter(Boolean).length, 0)
    return {
      recognizedTotal,
      avgWordsPerSentence: history.length === 0 ? 0 : (recognizedTotal / history.length),
      historyLength: history.length,
    }
  }, [history])
  const { avgWordsPerSentence, historyLength, recognizedTotal } = historyMetrics
  const activeLabel = STATUS_LABELS[status] || 'Unknown'
  const elapsedMin = Math.max(1, Math.round((nowTs - sessionStartedAt) / 60000))
  const currentStability = currentSign?.stability || 0
  const activeLesson = useMemo(() => practiceLibrary.find((lesson) => lesson.id === activeLessonId) || null, [activeLessonId, practiceLibrary])
  const activeLessonProgress = useMemo(() => getLessonProgress(activeLesson, sentence), [activeLesson, sentence])
  const practiceGoals = useMemo(() => buildPracticeGoals({
    wordCount,
    recognizedTotal,
    historyLength,
    stability: currentStability,
  }), [currentStability, historyLength, recognizedTotal, wordCount])
  const achievementMetrics = useMemo(() => ({
    completedLessons: completedLessonIds.length,
    currentStability,
    elapsedMin,
    favoriteLessons: favoriteLessonIds.length,
    historyLength,
    recognizedTotal,
    wordCount,
  }), [completedLessonIds.length, currentStability, elapsedMin, favoriteLessonIds.length, historyLength, recognizedTotal, wordCount])
  const achievementProgress = useMemo(() => Object.fromEntries(ACHIEVEMENT_LIBRARY.map((achievement) => [
    achievement.id,
    getAchievementProgress(achievement, achievementMetrics),
  ])), [achievementMetrics])
  const unlockedAchievements = useMemo(
    () => ACHIEVEMENT_LIBRARY.filter((achievement) => achievementProgress[achievement.id]?.complete),
    [achievementProgress],
  )
  const totalAwardPoints = useMemo(
    () => unlockedAchievements.reduce((sum, achievement) => sum + achievement.points, 0),
    [unlockedAchievements],
  )
  const tierSummary = useMemo(() => unlockedAchievements.reduce((summary, achievement) => ({
    ...summary,
    [achievement.tier]: (summary[achievement.tier] || 0) + 1,
  }), {}), [unlockedAchievements])

  useEffect(() => {
    if (sentence.length === 0) setCopyStatus(COPY_STATUS.idle)
  }, [sentence.length])

  useEffect(() => {
    if (history.length === 0) setHistoryExported(false)
  }, [history.length])

  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (activeLesson && activeLessonProgress.complete && !completedLessonIds.includes(activeLesson.id)) {
      setCompletedLessonIds((ids) => [...ids, activeLesson.id])
    }
  }, [activeLesson, activeLessonProgress.complete, completedLessonIds])

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

              <button aria-label="Toggle automatic text to speech" className={`${styles.btn} ${tts ? styles.btnAccent2 : ''}`} onClick={() => setTts((v) => !v)}>
                Auto TTS: {tts ? 'ON' : 'OFF'}
              </button>

              <button aria-label="Clear current sentence" className={styles.btn} onClick={clearSentence} disabled={sentence.length === 0}>
                Clear
              </button>

              <button
                className={styles.btn}
                onClick={handleCopySentence}
                disabled={sentence.length === 0}
              >
                {getCopyStatusLabel(copyStatus)}
              </button>
              <span className={styles.copyStatus} role="status" aria-live="polite">
                {copyStatus === COPY_STATUS.copied ? 'Sentence copied.' : copyStatus === COPY_STATUS.failed ? 'Copy failed. Select the sentence manually if needed.' : ''}
              </span>

              <button className={styles.btn} onClick={() => setShowSettings((v) => !v)}>
                {showSettings ? 'Hide settings' : 'Show settings'}
              </button>
            </div>

            <div className={styles.quickHelp}>
              <span>Tip: Hold signs steady for consistent stability.</span>
              <span>Current mode: {tab === 'stats' ? 'Live stats' : tab === 'guide' ? 'Sign guide' : tab === 'practice' ? 'Practice library' : 'Achievements'}</span>
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
                <button className={`${styles.btn} ${styles.btnSm}`} onClick={resetPreferences}>
                  Reset saved preferences
                </button>
              </div>
            )}
          </div>
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.tabs} role="tablist" aria-label="Sidebar panels">
            <button id="tab-stats" role="tab" aria-selected={tab === 'stats'} aria-controls="panel-stats" className={`${styles.tab} ${tab === 'stats' ? styles.tabAct : ''}`} onClick={() => setTab('stats')}>
              Live stats
            </button>
            <button id="tab-guide" role="tab" aria-selected={tab === 'guide'} aria-controls="panel-guide" className={`${styles.tab} ${tab === 'guide' ? styles.tabAct : ''}`} onClick={() => setTab('guide')}>
              Sign guide
            </button>
            <button id="tab-practice" role="tab" aria-selected={tab === 'practice'} aria-controls="panel-practice" className={`${styles.tab} ${tab === 'practice' ? styles.tabAct : ''}`} onClick={() => setTab('practice')}>
              Practice
            </button>
            <button id="tab-achievements" role="tab" aria-selected={tab === 'achievements'} aria-controls="panel-achievements" className={`${styles.tab} ${tab === 'achievements' ? styles.tabAct : ''}`} onClick={() => setTab('achievements')}>
              Awards
            </button>
          </div>

          {tab === 'stats' ? (
            <div id="panel-stats" role="tabpanel" aria-labelledby="tab-stats" className={styles.panel}>
              <div className={styles.panelLabel}>Recognition</div>
              <div className={styles.statusRibbon}>
                <span className={styles.statusBadge}>{activeLabel}</span>
                <span className={styles.statusSub}>Session {elapsedMin} min</span>
              </div>

              <div className={styles.goalGrid}>
                {practiceGoals.map((goal) => (
                  <div key={goal.key} className={`${styles.goalCard} ${goal.complete ? styles.goalDone : ''}`}>
                    <div className={styles.goalTop}>
                      <span>{goal.label}</span>
                      <strong>{Math.round(goal.progress)}%</strong>
                    </div>
                    <div className={styles.goalTrack}>
                      <div className={styles.goalFill} style={{ width: `${goal.progress}%` }} />
                    </div>
                    <span className={styles.goalMeta}>
                      {goal.value} / {goal.target} {goal.suffix}
                    </span>
                  </div>
                ))}
              </div>

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
                <span className={styles.statVal}>{historyLength} entries · {recognizedTotal} words total</span>
              </div>

              <div className={styles.statRow}>
                <span className={styles.statKey}>Avg words</span>
                <span className={styles.statVal}>{avgWordsPerSentence.toFixed(1)} / sentence</span>
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
          ) : tab === 'guide' ? (
            <div id="panel-guide" role="tabpanel" aria-labelledby="tab-guide" className={styles.panel}>
              <div className={styles.panelTopRow}>
                <div className={styles.panelLabel}>{filteredSigns.length} supported signs</div>
                <div className={styles.filterButtons}>
                  <button className={`${styles.btn} ${guideFilter === 'all' ? styles.btnAccent2 : ''}`} onClick={() => setGuideFilter('all')}>All</button>
                  <button className={`${styles.btn} ${guideFilter === 'letter' ? styles.btnAccent2 : ''}`} onClick={() => setGuideFilter('letter')}>Letters</button>
                  <button className={`${styles.btn} ${guideFilter === 'word' ? styles.btnAccent2 : ''}`} onClick={() => setGuideFilter('word')}>Words</button>
                </div>
              </div>

              <div className={styles.guideGrid}>
                {filteredSigns.length === 0 ? (
                  <EmptyState
                    title="No signs in this filter"
                    body="Try switching back to All signs."
                    action={<button className={`${styles.btn} ${styles.btnSm}`} onClick={() => setGuideFilter('all')}>Show all signs</button>}
                  />
                ) : filteredSigns.map(({ sign, desc }) => (
                  <div key={sign} className={styles.guideCard} style={{ borderColor: currentSign?.sign === sign ? 'var(--acc)' : 'transparent' }}>
                    <span className={styles.guideSign}>{sign}</span>
                    <span className={styles.guideDesc}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : tab === 'practice' ? (
            <div id="panel-practice" role="tabpanel" aria-labelledby="tab-practice" className={styles.panel}>
              <div className={styles.panelTopRow}>
                <div className={styles.panelLabel}>{practiceLoadStatus === 'loaded' ? filteredPractice.length : 'Loading'} practice lessons</div>
                <div className={styles.filterButtons}>
                  {PRACTICE_LEVELS.map((level) => (
                    <button
                      key={level}
                      className={`${styles.btn} ${practiceLevel === level ? styles.btnAccent2 : ''}`}
                      onClick={() => setPracticeLevel(level)}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.practiceToolbar}>
                <button className={`${styles.btn} ${showFavoritesOnly ? styles.btnAccent2 : ''}`} onClick={() => setShowFavoritesOnly((value) => !value)}>
                  Favorites {favoriteLessonIds.length > 0 ? `(${favoriteLessonIds.length})` : ''}
                </button>
                <span>{completedLessonIds.length} completed</span>
              </div>

              {activeLesson && (
                <div className={styles.activeLesson}>
                  <div>
                    <strong>Active: {activeLesson.title}</strong>
                    <span>{activeLessonProgress.complete ? 'Lesson complete — great work!' : `Next sign: ${activeLessonProgress.nextSign || 'finish'}`}</span>
                  </div>
                  <div className={styles.goalTrack}>
                    <div className={styles.goalFill} style={{ width: `${activeLessonProgress.percent}%` }} />
                  </div>
                </div>
              )}

              <div className={styles.searchRow}>
                <label className={styles.srOnly} htmlFor="practice-search">Search practice lessons</label>
                <input
                  id="practice-search"
                  className={styles.searchInput}
                  type="search"
                  placeholder="Search lessons, signs, or drills…"
                  value={practiceSearch}
                  onChange={(e) => setPracticeSearch(e.target.value)}
                />
                {practiceSearch && <button className={`${styles.btn} ${styles.btnSm}`} onClick={() => setPracticeSearch('')}>Reset</button>}
              </div>

              <div className={styles.practiceList}>
                {practiceLoadStatus === 'loading' || practiceLoadStatus === 'idle' ? (
                  <EmptyState
                    title="Loading practice lessons"
                    body="The lesson library is loading only when you open Practice to keep the first app load lighter."
                  />
                ) : practiceLoadStatus === 'error' ? (
                  <EmptyState
                    title="Practice lessons could not load"
                    body="Try loading the lesson library again."
                    action={<button className={`${styles.btn} ${styles.btnSm}`} onClick={() => setPracticeLoadStatus('idle')}>Retry</button>}
                  />
                ) : filteredPractice.length === 0 ? (
                  <EmptyState
                    title="No practice lessons found"
                    body="Try a different search term or level filter."
                    action={<button className={`${styles.btn} ${styles.btnSm}`} onClick={() => { setPracticeSearch(''); setPracticeLevel('All') }}>Reset practice filters</button>}
                  />
                ) : filteredPractice.map((lesson) => (
                  <article key={lesson.id} className={`${styles.practiceCard} ${activeLessonId === lesson.id ? styles.practiceActive : ''} ${completedLessonIds.includes(lesson.id) ? styles.practiceComplete : ''}`}>
                    <div className={styles.practiceHead}>
                      <div>
                        <h3>{lesson.title}</h3>
                        <p>{lesson.focus}</p>
                      </div>
                      <div className={styles.lessonActions}>
                        <span className={styles.practiceLevel}>{lesson.level}</span>
                        <button className={`${styles.iconBtn} ${favoriteLessonIds.includes(lesson.id) ? styles.iconBtnActive : ''}`} aria-label={favoriteLessonIds.includes(lesson.id) ? 'Remove favorite lesson' : 'Favorite lesson'} onClick={() => setFavoriteLessonIds((ids) => toggleStringId(ids, lesson.id))}>★</button>
                        <button className={`${styles.iconBtn} ${completedLessonIds.includes(lesson.id) ? styles.iconBtnActive : ''}`} aria-label={completedLessonIds.includes(lesson.id) ? 'Mark lesson incomplete' : 'Mark lesson complete'} onClick={() => setCompletedLessonIds((ids) => toggleStringId(ids, lesson.id))}>✓</button>
                      </div>
                    </div>
                    <div className={styles.practiceMeta}>
                      <span>{lesson.durationMin} min</span>
                      <span>{lesson.signs.length} signs</span>
                    </div>
                    <div className={styles.practiceSigns}>
                      {lesson.signs.map((sign) => (
                        <span key={`${lesson.id}-${sign}`} className={activeLessonId === lesson.id && activeLessonProgress.matched.includes(sign) ? styles.signMatched : ''}>{sign}</span>
                      ))}
                    </div>
                    <details className={styles.practiceDetails}>
                      <summary>Lesson details</summary>
                      <div className={styles.lessonDetailGrid}>
                        <section>
                          <h4>Goals</h4>
                          <ul>{lesson.goals.map((goal) => <li key={goal}>{goal}</li>)}</ul>
                        </section>
                        <section>
                          <h4>Drills</h4>
                          <ul>{lesson.drills.map((drill) => <li key={drill}>{drill}</li>)}</ul>
                        </section>
                        <section>
                          <h4>Success</h4>
                          <ul>{lesson.successCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul>
                        </section>
                        <section>
                          <h4>Tips</h4>
                          <ul>{lesson.coachingTips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
                        </section>
                      </div>
                    </details>
                    <button className={`${styles.btn} ${styles.btnSm}`} onClick={() => setActiveLessonId(lesson.id)}>
                      {activeLessonId === lesson.id ? 'Restart active lesson' : 'Start practice'}
                    </button>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div id="panel-achievements" role="tabpanel" aria-labelledby="tab-achievements" className={styles.panel}>
              <div className={styles.panelTopRow}>
                <div className={styles.panelLabel}>{filteredAchievements.length} achievements</div>
                <div className={styles.filterButtons}>
                  {ACHIEVEMENT_CATEGORIES.map((category) => (
                    <button
                      key={category}
                      className={`${styles.btn} ${achievementCategory === category ? styles.btnAccent2 : ''}`}
                      onClick={() => setAchievementCategory(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.awardsSummary}>
                <span><strong>{unlockedAchievements.length}</strong> unlocked</span>
                <span><strong>{totalAwardPoints}</strong> points</span>
                <span>{Object.entries(tierSummary).map(([tier, count]) => `${tier}: ${count}`).join(' · ') || 'No tiers unlocked yet'}</span>
              </div>

              <div className={styles.searchRow}>
                <label className={styles.srOnly} htmlFor="achievement-search">Search achievements</label>
                <input
                  id="achievement-search"
                  className={styles.searchInput}
                  type="search"
                  placeholder="Search awards, tiers, or tips…"
                  value={achievementSearch}
                  onChange={(e) => setAchievementSearch(e.target.value)}
                />
                {(achievementSearch || achievementCategory !== 'All') && (
                  <button className={`${styles.btn} ${styles.btnSm}`} onClick={() => { setAchievementSearch(''); setAchievementCategory('All') }}>Reset</button>
                )}
              </div>

              <div className={styles.achievementList}>
                {filteredAchievements.length === 0 ? (
                  <EmptyState
                    title="No awards found"
                    body="Try a different search term or achievement category."
                    action={<button className={`${styles.btn} ${styles.btnSm}`} onClick={() => { setAchievementSearch(''); setAchievementCategory('All') }}>Reset award filters</button>}
                  />
                ) : filteredAchievements.map((achievement) => (
                  <article key={achievement.id} className={`${styles.achievementCard} ${achievementProgress[achievement.id]?.complete ? styles.achievementUnlocked : ''}`}>
                    <div className={styles.achievementHead}>
                      <div>
                        <h3>{achievement.title}</h3>
                        <p>{achievement.description}</p>
                      </div>
                      <span className={styles.achievementTier}>{achievement.tier}</span>
                    </div>
                    <div className={styles.achievementMeta}>
                      <span>{achievement.category}</span>
                      <span>{achievement.points} pts</span>
                      <span>Target {achievementProgress[achievement.id]?.value || 0} / {achievement.target}</span>
                    </div>
                    <div className={styles.awardProgressTrack}>
                      <div className={styles.awardProgressFill} style={{ width: `${achievementProgress[achievement.id]?.percent || 0}%` }} />
                    </div>
                    <details className={styles.achievementDetails}>
                      <summary>Unlock tips</summary>
                      <ul>
                        {achievement.unlockTips.slice(0, 2).map((tip) => <li key={tip}>{tip}</li>)}
                        {achievement.progressHints.slice(0, 1).map((hint) => <li key={hint}>{hint}</li>)}
                      </ul>
                    </details>
                  </article>
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
                disabled={history.length === 0}
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
            {history.map((h) => (
              <div key={h.id} className={styles.histItem}>
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

      {showShortcuts && (
        <div className={styles.shortcutOverlay} role="presentation" onClick={() => setShowShortcuts(false)}>
          <div className={styles.shortcutDialog} role="dialog" aria-modal="true" aria-labelledby="shortcut-title" aria-describedby="shortcut-description" onClick={(e) => e.stopPropagation()}>
            <div className={styles.shortcutDialogHead}>
              <h2 id="shortcut-title">Keyboard shortcuts</h2>
              <button aria-label="Dismiss keyboard shortcut help" className={`${styles.btn} ${styles.btnSm}`} onClick={() => setShowShortcuts(false)}>Close</button>
            </div>
            <p id="shortcut-description" className={styles.shortcutDescription}>Use these keys outside text fields. Press Escape or click the backdrop to dismiss this panel.</p>
            <dl className={styles.shortcutList}>
              {SHORTCUTS.map((shortcut) => (
                <div key={shortcut.key}>
                  <dt>{shortcut.key}</dt>
                  <dd>{shortcut.action}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}

      <footer className={styles.footer}>
        <span>MediaPipe Hands (local) · Geometry classifier · Web Speech API</span>
        <span>100% offline after install · No model files</span>
        <span className={styles.shortcutHint}>Shortcuts: {SHORTCUTS.map((s) => `[${s.key}] ${s.action}`).join(' · ')}</span>
        <button className={`${styles.btn} ${styles.btnSm}`} onClick={() => setShowShortcuts(true)}>Shortcut help</button>
      </footer>
    </div>
  )
}
