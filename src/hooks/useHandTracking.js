/**
 * useHandTracking.js
 *
 * MediaPipe hands.js is NOT an ES module — it attaches to window.Hands.
 * We load it via a <script> tag injection, then read window.Hands.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { classifyASL, SignSmoother } from './aslClassifier.js'

const HOLD_FRAMES     = 18
const COOLDOWN_FRAMES = 22
const PAUSE_MS        = 2000

const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
]

/** Inject a <script> tag and resolve when it loads */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src
    s.crossOrigin = 'anonymous'
    s.onload  = resolve
    s.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(s)
  })
}

export function useHandTracking() {
  const videoRef   = useRef(null)
  const canvasRef  = useRef(null)
  const smoother   = useRef(new SignSmoother(14))
  const holdRef    = useRef({ sign: null, count: 0 })
  const coolRef    = useRef(0)
  const pauseTimer = useRef(null)
  const frameCount = useRef(0)
  const lastFpsTs  = useRef(Date.now())
  const handsRef   = useRef(null)
  const animRef    = useRef(null)

  const [currentSign, setCurrentSign] = useState(null)
  const [sentence,    setSentence]    = useState([])
  const [history,     setHistory]     = useState([])
  const [status,      setStatus]      = useState('init')
  const [statusMsg,   setStatusMsg]   = useState('Starting…')
  const [fps,         setFps]         = useState(0)
  const [handsCount,  setHandsCount]  = useState(0)

  const drawHand = useCallback((lms, ctx, w, h) => {
    ctx.strokeStyle = 'rgba(124,109,250,0.85)'
    ctx.lineWidth   = 2
    CONNECTIONS.forEach(([a, b]) => {
      ctx.beginPath()
      ctx.moveTo(lms[a].x * w, lms[a].y * h)
      ctx.lineTo(lms[b].x * w, lms[b].y * h)
      ctx.stroke()
    })
    lms.forEach((lm, i) => {
      ctx.fillStyle = [0,5,9,13,17].includes(i) ? '#00e5a0' : 'rgba(0,229,160,0.55)'
      ctx.beginPath()
      ctx.arc(lm.x * w, lm.y * h, [0,5,9,13,17].includes(i) ? 5 : 3, 0, Math.PI*2)
      ctx.fill()
    })
  }, [])

  const emitSign = useCallback((sign) => {
    clearTimeout(pauseTimer.current)
    setSentence(prev => {
      if (prev[prev.length - 1] === sign) return prev
      const next = [...prev, sign].slice(-30)
      pauseTimer.current = setTimeout(() => {
        setSentence(cur => {
          if (cur.length > 0)
            setHistory(h => [
              { text: cur.join(' '), time: new Date().toLocaleTimeString() },
              ...h,
            ].slice(0, 30))
          return []
        })
      }, PAUSE_MS)
      return next
    })
  }, [])

  const onResults = useCallback((results) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { width: w, height: h } = canvas
    ctx.clearRect(0, 0, w, h)

    frameCount.current++
    const now = Date.now()
    if (now - lastFpsTs.current >= 1000) {
      setFps(frameCount.current)
      frameCount.current = 0
      lastFpsTs.current  = now
    }

    const hands = results.multiHandLandmarks || []
    setHandsCount(hands.length)

    if (hands.length === 0) {
      smoother.current.clear()
      holdRef.current = { sign: null, count: 0 }
      setCurrentSign(null)
      return
    }

    drawHand(hands[0], ctx, w, h)
    if (coolRef.current > 0) { coolRef.current--; return }

    const raw    = classifyASL(hands[0])
    smoother.current.push(raw)
    const stable = smoother.current.best()
    setCurrentSign(stable)

    if (!stable) { holdRef.current = { sign: null, count: 0 }; return }

    if (stable.sign === holdRef.current.sign) {
      holdRef.current.count++
      if (holdRef.current.count >= HOLD_FRAMES) {
        emitSign(stable.sign)
        holdRef.current = { sign: null, count: 0 }
        coolRef.current = COOLDOWN_FRAMES
      }
    } else {
      holdRef.current = { sign: stable.sign, count: 1 }
    }
  }, [drawHand, emitSign])

  useEffect(() => {
    let mounted = true

    const createHands = (HandsClass) => new HandsClass({
      locateFile: (file) => {
        // Hard-force non-SIMD assets to avoid recurring SIMD abort crashes.
        // Keep extension/type aligned (js/data/wasm), only swap basename.
        const resolved = file.replace('hands_solution_simd_wasm_bin', 'hands_solution_wasm_bin')
        return `/mediapipe/hands/${resolved}`
      },
    })

    async function init() {
      try {
        // ── Step 1: camera ───────────────────────────────────────────────────
        setStatus('loading')
        setStatusMsg('Requesting camera access…')

        let stream
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: 'user' },
          })
        } catch {
          throw new Error('Camera access denied. Click the 🔒 icon → Allow camera → Refresh.')
        }

        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return }

        const video = videoRef.current
        video.srcObject = stream
        await new Promise(res => { video.onloadedmetadata = res })
        await video.play().catch(() => {})

        // ── Step 2: load MediaPipe via script tag → sets window.Hands ────────
        setStatusMsg('Loading MediaPipe hand model…')

        // hands.js already loaded via index.html <script> tag
        // Wait for window.Hands to be available (it's set synchronously)
        const HandsClass = window.Hands
        if (!HandsClass) throw new Error('window.Hands not found. Check index.html script order.')

        // ── Step 3: create & configure Hands instance ─────────────────────────
        setStatusMsg('Initialising hand tracking…')

        let hands = createHands(HandsClass)
        const applyOptions = (target) => target.setOptions({
          maxNumHands:             1,
          modelComplexity:         0,
          minDetectionConfidence:  0.7,
          minTrackingConfidence:   0.5,
          useCpuInference:         true,
        })
        applyOptions(hands)

        hands.onResults(onResults)

        // ── Step 4: send first frame to warm up WASM ──────────────────────────
        setStatusMsg('Warming up model…')
        try {
          await hands.send({ image: video })
        } catch (err) {
          if (!isAbortError(err) || !canUseSimd) throw err
          // Retry once in explicit non-SIMD mode.
          setStatusMsg('Retrying with non-SIMD fallback…')
          hands.close?.()
          hands = createHands(HandsClass, true)
          applyOptions(hands)
          hands.onResults(onResults)
          await hands.send({ image: video })
        }

        handsRef.current = hands

        handsRef.current = hands

        handsRef.current = hands

        handsRef.current = hands

        if (!mounted) return

        setStatus('ready')
        setStatusMsg('Ready')

        // ── Step 5: frame loop ────────────────────────────────────────────────
        const loop = async () => {
          if (!mounted) return
          if (video.readyState >= 2 && handsRef.current) {
            await handsRef.current.send({ image: video }).catch(() => {})
          }
          animRef.current = requestAnimationFrame(loop)
        }
        animRef.current = requestAnimationFrame(loop)

      } catch (err) {
        if (!mounted) return
        console.error('Init error:', err)
        const msg = String(err?.message || '')
        if (msg.toLowerCase().includes('abort')) {
          // Don't pretend tracking is "ready" when runtime failed; surface error.
          setStatus('error')
          setStatusMsg('WASM runtime failed to start on this device. Please refresh and try again.')
        } else {
          setStatus('error')
          setStatusMsg(msg || 'Something went wrong. Refresh and try again.')
        }
      }
    }

    init()

    return () => {
      mounted = false
      cancelAnimationFrame(animRef.current)
      handsRef.current?.close?.()
      videoRef.current?.srcObject?.getTracks().forEach(t => t.stop())
    }
  }, [onResults])

  const clearSentence = useCallback(() => {
    clearTimeout(pauseTimer.current); setSentence([])
  }, [])
  const clearHistory = useCallback(() => setHistory([]), [])

  return {
    videoRef, canvasRef,
    currentSign, sentence, history,
    status, statusMsg, fps, handsCount,
    clearSentence, clearHistory,
  }
}
