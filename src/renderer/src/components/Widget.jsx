import { useState, useEffect, useRef } from 'react'

// ── Same cat sprite tokens as PixelMascot ──
const F = 'F', Fd = 'Fd', Fw = 'Fw', Fp = 'Fp', E = 'E', Ep = 'Ep'
const _ = null

const CAT_PRESETS = [
  { name: 'Grey',      fur: '#6B6B6B', furDark: '#4A4A4A', belly: '#D4D4D4', pink: '#FFB6C1', eyeW: '#FFFFFF', pupil: '#1d1d1f' },
  { name: 'Orange',    fur: '#D4843E', furDark: '#A8652A', belly: '#F5DCC0', pink: '#FFB6C1', eyeW: '#FFFFFF', pupil: '#2D5016' },
  { name: 'Black',     fur: '#2A2A2A', furDark: '#151515', belly: '#4A4A4A', pink: '#CC8B96', eyeW: '#E8D44D', pupil: '#1d1d1f' },
  { name: 'White',     fur: '#E8E8E8', furDark: '#C8C8C8', belly: '#FFFFFF', pink: '#FFB6C1', eyeW: '#87CEEB', pupil: '#1d1d1f' },
  { name: 'Siamese',   fur: '#F0E6D3', furDark: '#8B7355', belly: '#FAF5ED', pink: '#FFB6C1', eyeW: '#6CB4EE', pupil: '#1d1d1f' },
  { name: 'Tuxedo',    fur: '#1A1A1A', furDark: '#000000', belly: '#FFFFFF', pink: '#FFB6C1', eyeW: '#90EE90', pupil: '#1d1d1f' },
  { name: 'Calico',    fur: '#C4813C', furDark: '#3D3D3D', belly: '#F5E6D0', pink: '#FFB6C1', eyeW: '#FFFFFF', pupil: '#5D4E37' },
  { name: 'Russian Blue', fur: '#7B8FA0', furDark: '#5A6E7F', belly: '#B8C8D4', pink: '#D4A0AA', eyeW: '#90EE90', pupil: '#1d1d1f' },
]

// All sprites — identical to PixelMascot
const SPRITE_DATA = {
  idle: [
    [_,F,_,_,_,_,_,_,F,_],[F,Fp,F,F,F,F,F,F,Fp,F],[F,Fw,Fw,Fw,Fw,Fw,Fw,Fw,Fw,F],
    [F,Fw,Ep,E,Fw,Fw,Ep,E,Fw,F],[F,Fw,Ep,Ep,Fw,Fw,Ep,Ep,Fw,F],[F,Fw,Fw,Fw,Fp,Fp,Fw,Fw,Fw,F],
    [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],[_,F,F,Fw,Fw,Fw,Fw,F,F,_],[_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
    [_,F,F,_,_,_,_,F,F,_],[_,_,_,_,_,_,_,_,_,_],[_,_,_,_,_,_,_,_,F,F],
  ],
  listening: [
    [_,F,_,_,_,_,_,_,F,_],[F,Fp,F,F,F,F,F,F,Fp,F],[F,Fw,Fw,Fw,Fw,Fw,Fw,Fw,Fw,F],
    [F,Fw,Fw,Fw,Fw,Fw,Fw,Fw,Fw,F],[F,Fw,Fd,Fd,Fw,Fw,Fd,Fd,Fw,F],[F,Fw,Fw,Fw,Fp,Fp,Fw,Fw,Fw,F],
    [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],[_,F,F,Fw,Fw,Fw,Fw,F,F,_],[_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
    [_,F,F,_,_,_,_,F,F,_],[_,_,_,_,_,_,_,_,_,_],[_,_,_,_,_,_,F,F,_,_],
  ],
  studying1: [
    [_,F,_,_,_,_,_,_,F,_],[F,Fp,F,F,F,F,F,F,Fp,F],[F,Fw,Fw,Fw,Fw,Fw,Fw,Fw,Fw,F],
    [F,Fw,Ep,E,Fw,Fw,Ep,E,Fw,F],[F,Fw,Ep,Ep,Fw,Fw,Ep,Ep,Fw,F],[F,Fw,Fw,Fw,Fp,Fp,Fw,Fw,Fw,F],
    [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],[_,F,F,Fw,Fw,Fw,Fw,F,F,_],[_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
    [_,F,F,_,_,_,_,F,F,_],[_,_,_,_,_,_,_,_,_,_],[_,_,_,_,_,_,_,_,F,F],
  ],
  studying2: [
    [_,_,F,_,_,_,_,F,_,_],[_,F,Fp,F,F,F,F,Fp,F,_],[F,Fw,Fw,Fw,Fw,Fw,Fw,Fw,Fw,F],
    [F,Fw,Ep,E,Fw,Fw,Ep,E,Fw,F],[F,Fw,Ep,Ep,Fw,Fw,Ep,Ep,Fw,F],[F,Fw,Fw,Fw,Fp,Fp,Fw,Fw,Fw,F],
    [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],[_,F,F,Fw,Fw,Fw,Fw,F,F,_],[_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
    [_,F,F,_,_,_,_,F,F,_],[_,_,_,_,_,_,_,_,_,_],[_,_,_,_,_,F,F,_,_,_],
  ],
  dance1: [
    [_,F,_,_,_,_,_,_,F,_],[F,Fp,F,F,F,F,F,F,Fp,F],[F,Fw,Fw,Fw,Fw,Fw,Fw,Fw,Fw,F],
    [F,Fw,Ep,E,Fw,Fw,Ep,E,Fw,F],[F,Fw,Ep,Ep,Fw,Fw,Ep,Ep,Fw,F],[F,Fp,Fw,Fw,Fw,Fw,Fw,Fw,Fp,F],
    [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],[F,F,F,Fw,Fw,Fw,Fw,F,F,_],[_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
    [_,F,F,_,_,_,_,F,F,_],[_,_,_,_,_,_,_,_,_,_],[_,_,_,_,_,_,_,_,_,F],
  ],
  dance2: [
    [_,F,_,_,_,_,_,_,F,_],[F,Fp,F,F,F,F,F,F,Fp,F],[F,Fw,Fw,Fw,Fw,Fw,Fw,Fw,Fw,F],
    [F,Fw,E,Ep,Fw,Fw,E,Ep,Fw,F],[F,Fw,Ep,Ep,Fw,Fw,Ep,Ep,Fw,F],[F,Fp,Fw,Fw,Fw,Fw,Fw,Fw,Fp,F],
    [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],[_,F,F,Fw,Fw,Fw,Fw,F,F,F],[_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
    [_,F,F,_,_,_,_,F,F,_],[_,_,_,_,_,_,_,_,_,_],[F,_,_,_,_,_,_,_,_,_],
  ],
  sleeping: [
    [_,F,_,_,_,_,_,_,F,_],[F,Fp,F,F,F,F,F,F,Fp,F],[F,Fw,Fw,Fw,Fw,Fw,Fw,Fw,Fw,F],
    [F,Fw,Fw,Fw,Fw,Fw,Fw,Fw,Fw,F],[F,Fw,Fd,Fd,Fw,Fw,Fd,Fd,Fw,F],[F,Fw,Fw,Fw,Fp,Fp,Fw,Fw,Fw,F],
    [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],[_,F,F,Fw,Fw,Fw,Fw,F,F,_],[_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
    [_,F,F,_,_,_,_,F,F,_],[_,_,_,_,_,_,_,_,_,_],[_,_,_,_,_,_,_,_,_,_],
  ],
  vibing1: [
    [_,F,_,_,_,_,_,_,F,_],[F,Fp,F,F,F,F,F,F,Fp,F],[F,Fw,Fw,Fw,Fw,Fw,Fw,Fw,Fw,F],
    [F,Fw,Ep,E,Fw,Fw,Ep,E,Fw,F],[F,Fw,Ep,Ep,Fw,Fw,Ep,Ep,Fw,F],[F,Fp,Fw,Fw,Fp,Fp,Fw,Fw,Fp,F],
    [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],[F,_,F,Fw,Fw,Fw,Fw,F,_,F],[_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
    [_,F,F,_,_,_,_,F,F,_],[_,_,_,_,_,_,_,_,_,_],[_,_,_,_,_,_,_,_,F,F],
  ],
  vibing2: [
    [_,F,_,_,_,_,_,_,F,_],[F,Fp,F,F,F,F,F,F,Fp,F],[F,Fw,Fw,Fw,Fw,Fw,Fw,Fw,Fw,F],
    [F,Fw,E,Ep,Fw,Fw,E,Ep,Fw,F],[F,Fw,Ep,Ep,Fw,Fw,Ep,Ep,Fw,F],[F,Fp,Fw,Fw,Fp,Fp,Fw,Fw,Fp,F],
    [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],[F,_,F,Fw,Fw,Fw,Fw,F,_,F],[_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
    [_,F,F,_,_,_,_,F,F,_],[_,_,_,_,_,_,_,_,_,_],[F,F,_,_,_,_,_,_,_,_],
  ],
}

// Same motion logic as PixelMascot
function getMotion(k, bp, t) {
  const m = {
    sleeping: { bx: 0, by: Math.sin(t * 0.8) },
    idle: { bx: 0, by: Math.sin(t * 1.2) * 1.5 },
    listening: { bx: Math.sin(bp * 1.5) * 2, by: Math.sin(bp * 2) },
    studying1: { bx: 0, by: Math.sin(bp * 2) * 2 },
    studying2: { bx: 0, by: Math.sin(bp * 2) * 2 },
    dance1: { bx: Math.sin(bp * 3) * 3, by: Math.abs(Math.sin(bp * 4)) * -3 },
    dance2: { bx: Math.sin(bp * 3) * 3, by: Math.abs(Math.sin(bp * 4)) * -3 },
    vibing1: { bx: Math.sin(bp * 3) * 3.5, by: Math.abs(Math.sin(bp * 5)) * -4 },
    vibing2: { bx: Math.sin(bp * 3) * 3.5, by: Math.abs(Math.sin(bp * 5)) * -4 },
  }
  return m[k] || { bx: 0, by: 0 }
}

function resolveSprite(spriteData, colors) {
  const { fur, furDark, belly, pink, eyeW, pupil } = colors
  const R = {[F]: fur, [Fd]: furDark, [Fw]: belly, [Fp]: pink, [E]: eyeW, [Ep]: pupil, [_]: null }
  return spriteData.map(row => row.map(tok => R[tok] ?? null))
}

export default function Widget() {
  const [timer, setTimer] = useState(null)
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const timerRef = useRef(null)

  const [masterVol, setMasterVol] = useState(1)
  const draggingVol = useRef(false)

  useEffect(() => {
    const cleanup = window.electron?.onTimerUpdate((data) => {
      setTimer(data)
      timerRef.current = data
      if (data?.masterVolume !== undefined && !draggingVol.current) {
        setMasterVol(data.masterVolume)
      }
    })
    return () => cleanup?.()
  }, [])

  // Cat mascot animation — mirrors main app
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false

    const PX = 4
    const CW = 10 * PX + 20, CH = 12 * PX + 14
    canvas.width = CW
    canvas.height = CH

    let frame = 0, beatPhase = 0

    // Load cat config
    let presetIdx = 0
    try {
      const saved = localStorage.getItem('cat-config')
      if (saved) presetIdx = JSON.parse(saved).presetIdx || 0
    } catch {}
    const colors = CAT_PRESETS[presetIdx] || CAT_PRESETS[0]

    // Resolve all sprites
    const resolved = {}
    for (const [key, data] of Object.entries(SPRITE_DATA)) {
      resolved[key] = resolveSprite(data, colors)
    }

    function drawSprite(sprite, ox, oy) {
      for (let r = 0; r < sprite.length; r++) {
        for (let c = 0; c < sprite[r].length; c++) {
          const color = sprite[r][c]
          if (!color) continue
          ctx.fillStyle = color
          ctx.fillRect(Math.round(ox + c * PX), Math.round(oy + r * PX), PX, PX)
        }
      }
    }

    function drawZzz(ox, t) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      for (let i = 0; i < 3; i++) {
        const x = ox + 10 * PX + 2 + i * 5 + Math.sin(t * 1.5 + i * 1.2) * 2
        const y = 8 - i * 8 + Math.sin(t + i) * 2
        const s = 2.5 - i * 0.4
        ctx.fillRect(Math.round(x), Math.round(y), Math.round(s * 2), 1)
        ctx.fillRect(Math.round(x + s * 2 - 1), Math.round(y), 1, Math.round(s))
        ctx.fillRect(Math.round(x), Math.round(y + s), Math.round(s * 2), 1)
      }
    }

    function drawNotes(ox, oy, t, col) {
      ctx.globalAlpha = 0.35
      ctx.fillStyle = col
      for (let i = 0; i < 2; i++) {
        const nx = ox + 10 * PX + 1 + Math.sin(t * 2 + i * 1.5) * 5
        const ny = oy - 3 - i * 6 + Math.sin(t * 3 + i) * 2
        ctx.fillRect(Math.round(nx), Math.round(ny), 2, 2)
        ctx.fillRect(Math.round(nx + 2), Math.round(ny - 3), 1, 4)
      }
      ctx.globalAlpha = 1
    }

    function drawHearts(ox, oy, t) {
      ctx.globalAlpha = 0.4 + Math.sin(t * 3) * 0.15
      ctx.fillStyle = colors.pink
      for (let h = 0; h < 2; h++) {
        const hx = ox + 10 * PX + 1 + Math.sin(t * 1.5 + h * 2) * 4 + h * 6
        const hy = oy - 1 + Math.sin(t * 2 + h) * 2 - h * 5
        ctx.fillRect(Math.round(hx), Math.round(hy+1),1,2)
        ctx.fillRect(Math.round(hx+1), Math.round(hy),1,2)
        ctx.fillRect(Math.round(hx+2), Math.round(hy+1),1,2)
        ctx.fillRect(Math.round(hx+3), Math.round(hy),1,2)
        ctx.fillRect(Math.round(hx+4), Math.round(hy+1),1,2)
        ctx.fillRect(Math.round(hx+1), Math.round(hy+2),3,1)
        ctx.fillRect(Math.round(hx+2), Math.round(hy+3),1,1)
      }
      ctx.globalAlpha = 1
    }

    function animate() {
      frame++
      beatPhase += 0.03 + 0.03
      const t = frame * 0.016
      ctx.clearRect(0, 0, CW, CH)

      const data = timerRef.current
      // Use mascot state from main app, fallback to sleeping
      const spriteKey = data?.mascot || 'sleeping'

      if (!resolved[spriteKey]) {
        animRef.current = requestAnimationFrame(animate)
        return
      }

      const motion = getMotion(spriteKey, beatPhase, t)
      const sw = 10 * PX

      const ox = (CW - sw) / 2 + motion.bx
      const oy = (CH - 12 * PX) / 2 + motion.by

      drawSprite(resolved[spriteKey], ox, oy)

      if (spriteKey === 'sleeping') {
        drawZzz(ox, t)
      } else if (spriteKey.startsWith('vibing') || spriteKey.startsWith('dance')) {
        drawHearts(ox, oy, t)
        drawNotes(ox, oy, t, colors.fur)
      } else if (spriteKey !== 'idle') {
        drawNotes(ox, oy, t, colors.fur)
      }

      animRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  const close = () => window.electron?.closeWidget()
  const togglePlay = () => window.electron?.toggleTimer()

  const mins = timer ? timer.minutes.toString().padStart(2, '0') : '--'
  const secs = timer ? timer.seconds.toString().padStart(2, '0') : '--'
  const color = timer?.color || '#bf5af2'
  const isRunning = timer?.running
  const isInfinite = timer?.infinite
  const wfStepsData = timer?.wfSteps || null
  const wfCurrentStep = timer?.wfStepIdx ?? -1
  const totalSeconds = timer?.totalSeconds || 0
  const elapsed = (timer?.minutes || 0) * 60 + (timer?.seconds || 0)

  // Progress: 0 → 1 as timer counts down (or spins for infinite)
  let progress = 0
  if (isRunning && isInfinite) {
    // Infinite mode: continuous spin based on elapsed time
    progress = (elapsed % 60) / 60
  } else if (totalSeconds > 0) {
    // Normal mode: progress based on remaining time
    progress = 1 - (elapsed / totalSeconds)
  }

  // SVG border dimensions matching widget (290×85 with 16px radius)
  const W = 290, H = 85, R = 16, SW = 2.5
  // Perimeter of rounded rect
  const straight = 2 * (W - 2 * R) + 2 * (H - 2 * R)
  const corners = 2 * Math.PI * R
  const perimeter = straight + corners

  return (
    <div className="relative w-full h-full select-none">
      {/* Widget content */}
      <div
        className="flex flex-col h-full"
        style={{
          background: 'rgba(28, 28, 30, 0.88)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          WebkitAppRegion: 'drag'
        }}
      >
        <div className="flex items-center justify-between px-4 flex-1">
          {/* Cat mascot */}
          <canvas
            ref={canvasRef}
            style={{ imageRendering: 'pixelated', width: '52px', height: '58px' }}
          />

          <div className="flex items-center gap-3">
            {/* Pulsing indicator */}
            <div className="relative">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              {isRunning && (
                <div
                  className="absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping"
                  style={{ backgroundColor: color, opacity: 0.4 }}
                />
              )}
            </div>

            <span className="text-[26px] font-light tabular-nums text-white tracking-tight">
              {mins}:{secs}
            </span>
          </div>

          <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' }}>
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="w-6 h-6 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-90 transition-all"
            >
              {isRunning ? (
                <svg width="8" height="8" viewBox="0 0 12 12" fill="white">
                  <rect x="1.5" y="1" width="3.5" height="10" rx="1"/>
                  <rect x="7" y="1" width="3.5" height="10" rx="1"/>
                </svg>
              ) : (
                <svg width="8" height="8" viewBox="0 0 12 12" fill="white">
                  <path d="M2 1.5l9 4.5-9 4.5V1.5z"/>
                </svg>
              )}
            </button>

            {/* Volume knob */}
            <div
              className="relative w-6 h-6 group"
              onMouseDown={(e) => {
                e.preventDefault()
                draggingVol.current = true
                const rect = e.currentTarget.getBoundingClientRect()
                const updateVol = (clientY) => {
                  const ratio = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
                  setMasterVol(ratio)
                  window.electron?.setMasterVolume(ratio)
                }
                updateVol(e.clientY)
                const onMove = (ev) => updateVol(ev.clientY)
                const onUp = () => {
                  draggingVol.current = false
                  window.removeEventListener('mousemove', onMove)
                  window.removeEventListener('mouseup', onUp)
                }
                window.addEventListener('mousemove', onMove)
                window.addEventListener('mouseup', onUp)
              }}
              onWheel={(e) => {
                const delta = e.deltaY > 0 ? -0.05 : 0.05
                const next = Math.max(0, Math.min(1, masterVol + delta))
                setMasterVol(next)
                window.electron?.setMasterVolume(next)
              }}
              title={`Volume: ${Math.round(masterVol * 100)}%`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" className="cursor-pointer">
                {/* Background ring */}
                <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                {/* Volume arc */}
                <circle
                  cx="12" cy="12" r="8"
                  fill="none"
                  stroke={masterVol > 0 ? color : 'rgba(255,255,255,0.15)'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 8}
                  strokeDashoffset={2 * Math.PI * 8 * (1 - masterVol)}
                  style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 0.1s', filter: masterVol > 0 ? `drop-shadow(0 0 3px ${color}40)` : 'none' }}
                />
                {/* Speaker icon */}
                {masterVol === 0 ? (
                  <g transform="translate(8, 8)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" fill="none" strokeLinecap="round">
                    <path d="M1 3v2l2.5 0L6 7V1L3.5 3z" fill="rgba(255,255,255,0.3)" />
                    <path d="M6.5 3l1 2" /><path d="M7.5 3l-1 2" />
                  </g>
                ) : (
                  <g transform="translate(8, 8)" stroke="rgba(255,255,255,0.5)" strokeWidth="1" fill="none" strokeLinecap="round">
                    <path d="M1 3v2l2.5 0L6 7V1L3.5 3z" fill="rgba(255,255,255,0.35)" />
                    {masterVol > 0.3 && <path d="M7 3.5c.5.5.5 1.5 0 2" />}
                    {masterVol > 0.6 && <path d="M7.5 2.5c1 1 1 3 0 4" />}
                  </g>
                )}
              </svg>
            </div>

            {/* Close */}
            <button
              onClick={close}
              className="w-5 h-5 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center transition-colors"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M1 1L7 7M7 1L1 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Workflow step bar */}
        {wfStepsData && (
          <div className="flex gap-[2px] px-3 pb-2 pt-0">
            {wfStepsData.map((s, i) => (
              <div
                key={i}
                className="flex-1 rounded-full transition-all"
                style={{
                  height: i === wfCurrentStep ? '3px' : '2px',
                  background: s.color,
                  opacity: i < wfCurrentStep ? 0.3 : i === wfCurrentStep ? 1 : 0.15,
                  boxShadow: i === wfCurrentStep ? `0 0 6px ${s.color}60` : 'none'
                }}
              />
            ))}
          </div>
        )}
        {/* Animated progress border — inside panel, clipped to panel bounds */}
        {(isRunning || progress > 0) && (
          <svg
            className="absolute inset-0 pointer-events-none"
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            style={{ zIndex: 10, width: '100%', height: '100%', filter: `drop-shadow(0 0 6px ${color}50)` }}
          >
            <rect
              x={SW / 2} y={SW / 2}
              width={W - SW} height={H - SW}
              rx={R} ry={R}
              fill="none"
              stroke={color}
              strokeWidth={SW}
              strokeLinecap="round"
              strokeDasharray={perimeter}
              strokeDashoffset={isInfinite ? 0 : perimeter * (1 - progress)}
              style={{
                transition: isInfinite ? 'none' : 'stroke-dashoffset 1s linear, stroke 0.3s ease',
                animation: isInfinite && isRunning ? 'spin-border 4s linear infinite' : 'none',
                transformOrigin: 'center',
              }}
            />
          </svg>
        )}

        {/* Keyframes for infinite mode spinning border */}
        <style>{`
          @keyframes spin-border {
            from { stroke-dashoffset: ${perimeter}; }
            to { stroke-dashoffset: 0; }
          }
        `}</style>
      </div>
    </div>
  )
}
