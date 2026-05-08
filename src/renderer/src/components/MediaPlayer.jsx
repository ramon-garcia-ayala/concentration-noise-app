import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../ThemeContext'

const APP_ICONS = {
  Spotify: '🟢',
  Chrome: '🌐',
  Edge: '🔵',
  Firefox: '🦊',
  Brave: '🦁',
  Opera: '🔴',
}

export default function MediaPlayer() {
  const [media, setMedia] = useState(null)
  const [open, setOpen] = useState(false)
  const [sysVol, setSysVol] = useState(1)
  const [thumbSrc, setThumbSrc] = useState(null)
  const hideTimer = useRef(null)
  const closeTimer = useRef(null)
  const discAngle = useRef(0)
  const animRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const cleanup = window.electron?.onMediaUpdate((data) => {
      if (data && data.title) {
        if (data.thumb && data.thumb.length > 0) {
          setThumbSrc('data:image/png;base64,' + data.thumb)
        }
        setMedia(data)
        if (data.systemVolume !== undefined) setSysVol(data.systemVolume)
        clearTimeout(hideTimer.current)
      } else {
        hideTimer.current = setTimeout(() => setOpen(false), 3000)
        if (data === null) setMedia((prev) => prev ? { ...prev, status: 'Stopped' } : null)
      }
    })
    return () => cleanup?.()
  }, [])

  const { dark } = useTheme()
  const ctrl = (key) => window.electron?.mediaControl(key)
  const isPlaying = media?.status === 'Playing'
  const appIcon = APP_ICONS[media?.app] || '🎵'
  const isPlayingRef = useRef(isPlaying)
  isPlayingRef.current = isPlaying

  // Sound wave animation
  const waveAmplitude = useRef(0) // smooth amplitude for fade in/out

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const W = 44
    const H = 28
    canvas.width = W * 2
    canvas.height = H * 2

    const draw = () => {
      // Smooth amplitude transition
      const target = isPlayingRef.current ? 1 : 0
      waveAmplitude.current += (target - waveAmplitude.current) * 0.04
      const amp = waveAmplitude.current

      if (isPlayingRef.current) discAngle.current += 0.03

      ctx.clearRect(0, 0, W * 2, H * 2)

      const cx = W
      const cy = H
      const color = dark ? '255,255,255' : '30,30,30'

      // Draw 3 layered waves
      for (let layer = 0; layer < 3; layer++) {
        const opacity = (0.5 - layer * 0.15) * amp + 0.05
        const layerAmp = (6 - layer * 1.5) * amp
        const speed = discAngle.current * (1 + layer * 0.3)
        const freq = 0.08 + layer * 0.02

        ctx.beginPath()
        for (let x = 0; x < W * 2; x++) {
          const nx = x / (W * 2)
          // Envelope: fade edges to 0
          const env = Math.sin(nx * Math.PI)
          const y = cy
            + Math.sin(x * freq + speed) * layerAmp * env
            + Math.sin(x * freq * 1.8 + speed * 0.7 + layer) * layerAmp * 0.4 * env
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = `rgba(${color},${opacity})`
        ctx.lineWidth = 1.5 - layer * 0.3
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.stroke()
      }

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [dark])

  return (
    <div className="relative h-full"
      onMouseEnter={() => clearTimeout(closeTimer.current)}
      onMouseLeave={() => { closeTimer.current = setTimeout(() => setOpen(false), 300) }}
    >
        {/* Collapsed tab — spinning disc + track name */}
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 px-3 h-full rounded-xl active:scale-95 transition-all"
          style={{
            width: '200px',
            background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'}`,
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: 28, height: 16 }}
            className="shrink-0"
          />
          <div className="flex flex-col items-center min-w-0 flex-1">
            <span className={`font-mono text-[9px] font-medium truncate w-full text-center leading-tight ${dark ? 'text-[#f0f0f0]' : 'text-[#1d1d1f]'}`}>
              {media?.title || '—'}
            </span>
            <span className="font-mono text-[7px] text-[#86868b] truncate w-full text-center leading-tight">
              {media?.artist || ''}
            </span>
          </div>
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="#86868b" strokeWidth="1.2" strokeLinecap="round"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
            <path d="M1 3L4 6L7 3" />
          </svg>
        </button>

        {/* Invisible bridge so mouse doesn't leave between button and panel */}
        {open && <div className="absolute top-full right-0 w-full h-3 z-40" />}

        {/* Expanded dropdown panel */}
        <div
          className="absolute top-full right-0 pt-1.5 z-50"
          style={{ pointerEvents: open ? 'auto' : 'none' }}
        >
        <div
          onClick={e => e.stopPropagation()}
          className="rounded-2xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
          style={{
            maxHeight: open ? '280px' : '0px',
            opacity: open ? 1 : 0,
            transform: open ? 'translateY(0) scale(1)' : 'translateY(-4px) scale(0.98)',
            pointerEvents: open ? 'auto' : 'none',
            width: '200px',
            background: dark ? '#2c2c2e' : '#ffffff',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            boxShadow: open ? (dark ? '0 12px 40px rgba(0,0,0,0.5)' : '0 12px 40px rgba(0,0,0,0.12)') : 'none',
          }}
        >
          {/* Album art */}
          <div className="relative w-full overflow-hidden" style={{ height: '90px' }}>
            {thumbSrc ? (
              <img
                src={thumbSrc}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center"
                style={{ background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}>
                <span className="text-3xl opacity-30">{appIcon}</span>
              </div>
            )}
            {/* Gradient overlay at bottom */}
            <div className="absolute inset-x-0 bottom-0 h-12"
              style={{ background: `linear-gradient(transparent, ${dark ? '#2c2c2e' : '#ffffff'})` }} />
          </div>

          <div className="px-2.5 pb-2.5 -mt-3 relative">
            {/* Track info */}
            <div className="flex items-center gap-1.5 mb-2">
              <div className="flex-1 min-w-0">
                <p className={`font-mono text-[10px] font-semibold truncate leading-tight ${dark ? 'text-[#f0f0f0]' : 'text-[#1d1d1f]'}`}>
                  {media?.title || '—'}
                </p>
                <p className="font-mono text-[8px] text-[#86868b] truncate leading-tight mt-0.5">
                  {media?.artist || ''}
                  {media?.album && <span className="text-[#aeaeb2]"> · {media.album}</span>}
                </p>
              </div>
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  background: isPlaying ? '#34C759' : '#aeaeb2',
                  boxShadow: isPlaying ? '0 0 4px #34C75960' : 'none'
                }}
              />
            </div>

            {/* Playback controls */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <button
                onClick={() => ctrl('prev')}
                className={`w-6 h-6 rounded-full flex items-center justify-center active:scale-90 transition-transform ${dark ? 'hover:bg-white/[0.06]' : 'hover:bg-black/[0.04]'}`}
              >
                <svg width="9" height="9" viewBox="0 0 16 16" fill={dark ? '#ccc' : '#555'}>
                  <path d="M3 2h2v12H3V2zm11 6L6 14V2l8 6z" transform="scale(-1,1) translate(-16,0)" />
                </svg>
              </button>

              <button
                onClick={() => ctrl('playpause')}
                className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform ${dark ? 'bg-[#f0f0f0] hover:bg-[#ddd]' : 'bg-[#1d1d1f] hover:bg-[#333]'}`}
              >
                {isPlaying ? (
                  <svg width="10" height="10" viewBox="0 0 16 16" fill={dark ? '#1d1d1f' : '#fff'}>
                    <rect x="3" y="2" width="3.5" height="12" rx="1" />
                    <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
                  </svg>
                ) : (
                  <svg width="10" height="10" viewBox="0 0 16 16" fill={dark ? '#1d1d1f' : '#fff'}>
                    <path d="M4 2l10 6-10 6V2z" />
                  </svg>
                )}
              </button>

              <button
                onClick={() => ctrl('next')}
                className={`w-6 h-6 rounded-full flex items-center justify-center active:scale-90 transition-transform ${dark ? 'hover:bg-white/[0.06]' : 'hover:bg-black/[0.04]'}`}
              >
                <svg width="9" height="9" viewBox="0 0 16 16" fill={dark ? '#ccc' : '#555'}>
                  <path d="M3 2h2v12H3V2zM6 8l8-6v12L6 8z" />
                </svg>
              </button>
            </div>

            {/* System volume slider */}
            <div className="flex items-center gap-2">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#86868b" strokeWidth="1.2" strokeLinecap="round">
                <path d="M2 6v4M5 4v8l5-3V1z" />
                {sysVol === 0 ? (
                  <>
                    <path d="M12 5l4 4" />
                    <path d="M16 5l-4 4" />
                  </>
                ) : sysVol < 0.5 ? (
                  <path d="M12 6c1 1 1 3 0 4" />
                ) : (
                  <>
                    <path d="M12 6c1 1 1 3 0 4" />
                    <path d="M14 4c1.8 1.8 1.8 6.2 0 8" />
                  </>
                )}
              </svg>
              <div className="flex-1 relative h-4 flex items-center">
                <div className="absolute w-full h-[3px] rounded-full"
                  style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }} />
                <div className="absolute h-[3px] rounded-full"
                  style={{
                    width: `${sysVol * 100}%`,
                    background: dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)'
                  }} />
                <input
                  type="range" min="0" max="1" step="0.02" value={sysVol}
                  onChange={e => {
                    const v = parseFloat(e.target.value)
                    setSysVol(v)
                    window.electron?.setSystemVolume(v)
                  }}
                  className="absolute w-full h-4 cursor-pointer opacity-0 z-10"
                />
                <div className="absolute w-2.5 h-2.5 rounded-full pointer-events-none transition-[left] duration-75"
                  style={{
                    left: `calc(${sysVol * 100}% - 5px)`,
                    background: dark ? '#f0f0f0' : '#1d1d1f',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                  }}
                />
              </div>
              <span className="font-mono text-[8px] text-[#86868b] w-6 text-right tabular-nums">
                {Math.round(sysVol * 100)}
              </span>
            </div>
          </div>
        </div>
        </div>
    </div>
  )
}
