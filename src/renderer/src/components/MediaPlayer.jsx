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
  const [visible, setVisible] = useState(false)
  const hideTimer = useRef(null)

  useEffect(() => {
    window.electron?.onMediaUpdate((data) => {
      if (data && data.title) {
        setMedia(data)
        setVisible(true)
        clearTimeout(hideTimer.current)
      } else {
        // Fade out after media stops
        hideTimer.current = setTimeout(() => setVisible(false), 3000)
        if (media) setMedia((prev) => prev ? { ...prev, status: 'Stopped' } : null)
      }
    })
  }, [])

  const { dark } = useTheme()
  const ctrl = (key) => window.electron?.mediaControl(key)
  const isPlaying = media?.status === 'Playing'
  const appIcon = APP_ICONS[media?.app] || '🎵'

  return (
    <div
      className="transition-all duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)] overflow-hidden"
      style={{
        maxHeight: visible && media ? '80px' : '0px',
        opacity: visible && media ? 1 : 0,
        marginBottom: visible && media ? '0px' : '-4px'
      }}
    >
      <div
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl mx-5 mb-2"
        style={{
          background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
        }}
      >
        {/* App icon */}
        <span className="text-sm shrink-0">{appIcon}</span>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <p className={`font-mono text-[11px] font-medium truncate leading-tight ${dark ? 'text-[#f0f0f0]' : 'text-[#1d1d1f]'}`}>
            {media?.title || '—'}
          </p>
          <p className="font-mono text-[9px] text-[#86868b] truncate leading-tight mt-0.5">
            {media?.artist || ''}
            {media?.app && (
              <span className="text-[#aeaeb2]"> · {media.app}</span>
            )}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => ctrl('prev')}
            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/[0.04] active:scale-90"
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="#86868b">
              <path d="M3 2h2v12H3V2zm11 6L6 14V2l8 6z" transform="scale(-1,1) translate(-16,0)" />
            </svg>
          </button>

          <button
            onClick={() => ctrl('playpause')}
            className={`w-7 h-7 rounded-full flex items-center justify-center active:scale-90 ${dark ? 'bg-[#f0f0f0] hover:bg-[#ccc]' : 'bg-[#1d1d1f] hover:bg-[#333]'}`}
          >
            {isPlaying ? (
              <svg width="10" height="10" viewBox="0 0 16 16" fill="white">
                <rect x="3" y="2" width="3.5" height="12" rx="1" />
                <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 16 16" fill="white">
                <path d="M4 2l10 6-10 6V2z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => ctrl('next')}
            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/[0.04] active:scale-90"
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="#86868b">
              <path d="M11 2h2v12h-2V2zM2 8l8 6V2L2 8z" />
            </svg>
          </button>
        </div>

        {/* Status dot */}
        <div
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            background: isPlaying ? '#34C759' : '#aeaeb2',
            boxShadow: isPlaying ? '0 0 4px #34C75960' : 'none'
          }}
        />
      </div>
    </div>
  )
}
