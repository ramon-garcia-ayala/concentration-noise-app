import { useState } from 'react'
import { useTheme } from '../ThemeContext'

// 30 moods — one per day cycling monthly
const MOODS = [
  { phrase: 'Deep Work Mode',       emoji: '🧠', timer: 50, color: '#5856D6', eq: { sub: 0.2, low: 0.3, lowmid: 0.1, mid: 0, himid: 0, pres: 0, air: 0, full: 0 } },
  { phrase: 'Calm & Collected',     emoji: '🌿', timer: 25, color: '#34C759', eq: { sub: 0, low: 0.15, lowmid: 0.2, mid: 0.1, himid: 0, pres: 0, air: 0.05, full: 0 } },
  { phrase: 'Creative Burst',       emoji: '⚡', timer: 15, color: '#FF9500', eq: { sub: 0, low: 0, lowmid: 0.1, mid: 0.3, himid: 0.2, pres: 0.15, air: 0.1, full: 0 } },
  { phrase: 'Midnight Focus',       emoji: '🌙', timer: 45, color: '#AF52DE', eq: { sub: 0.3, low: 0.25, lowmid: 0.15, mid: 0, himid: 0, pres: 0, air: 0, full: 0 } },
  { phrase: 'Flow State',           emoji: '🌊', timer: 40, color: '#5AC8FA', eq: { sub: 0.1, low: 0.2, lowmid: 0.15, mid: 0.1, himid: 0.05, pres: 0, air: 0, full: 0 } },
  { phrase: 'Power Sprint',         emoji: '🔥', timer: 10, color: '#FF3B30', eq: { sub: 0, low: 0, lowmid: 0, mid: 0.2, himid: 0.3, pres: 0.25, air: 0.15, full: 0 } },
  { phrase: 'Zen Garden',           emoji: '🪷', timer: 30, color: '#30B0C7', eq: { sub: 0.15, low: 0.2, lowmid: 0.25, mid: 0.1, himid: 0, pres: 0, air: 0.05, full: 0 } },
  { phrase: 'Warm Frequencies',     emoji: '☀️', timer: 25, color: '#E07A2F', eq: { sub: 0.1, low: 0.35, lowmid: 0.3, mid: 0.15, himid: 0, pres: 0, air: 0, full: 0 } },
  { phrase: 'Neural Sync',          emoji: '🔮', timer: 35, color: '#5E5CE6', eq: { sub: 0.2, low: 0.15, lowmid: 0.1, mid: 0.15, himid: 0.1, pres: 0.05, air: 0.05, full: 0 } },
  { phrase: 'Silence + Clarity',    emoji: '💎', timer: 20, color: '#8E8E93', eq: { sub: 0, low: 0, lowmid: 0, mid: 0, himid: 0, pres: 0, air: 0.1, full: 0.05 } },
  { phrase: 'Subterranean',         emoji: '🕳️', timer: 45, color: '#C2550F', eq: { sub: 0.5, low: 0.3, lowmid: 0, mid: 0, himid: 0, pres: 0, air: 0, full: 0 } },
  { phrase: 'Electric Calm',        emoji: '🔋', timer: 30, color: '#34C759', eq: { sub: 0, low: 0.1, lowmid: 0.15, mid: 0.2, himid: 0.1, pres: 0.1, air: 0.1, full: 0 } },
  { phrase: 'Analog Warmth',        emoji: '📻', timer: 25, color: '#D4631D', eq: { sub: 0.15, low: 0.3, lowmid: 0.35, mid: 0.2, himid: 0, pres: 0, air: 0, full: 0 } },
  { phrase: 'Ultra Focus',          emoji: '🎯', timer: 60, color: '#FF3B30', eq: { sub: 0.1, low: 0.15, lowmid: 0.1, mid: 0.05, himid: 0, pres: 0, air: 0, full: 0.15 } },
  { phrase: 'Soft Static',          emoji: '✨', timer: 20, color: '#AF52DE', eq: { sub: 0, low: 0, lowmid: 0, mid: 0, himid: 0, pres: 0.2, air: 0.3, full: 0.1 } },
  { phrase: 'Bass Meditation',      emoji: '🫀', timer: 30, color: '#5856D6', eq: { sub: 0.4, low: 0.35, lowmid: 0.1, mid: 0, himid: 0, pres: 0, air: 0, full: 0 } },
  { phrase: 'Clear Horizon',        emoji: '🌅', timer: 25, color: '#FF9500', eq: { sub: 0, low: 0.1, lowmid: 0.15, mid: 0.2, himid: 0.15, pres: 0.1, air: 0.1, full: 0 } },
  { phrase: 'White Canvas',         emoji: '🤍', timer: 35, color: '#8E8E93', eq: { sub: 0, low: 0, lowmid: 0, mid: 0, himid: 0, pres: 0, air: 0, full: 0.3 } },
  { phrase: 'Drone Zone',           emoji: '🛸', timer: 40, color: '#5E5CE6', eq: { sub: 0.35, low: 0.25, lowmid: 0.2, mid: 0.1, himid: 0, pres: 0, air: 0, full: 0 } },
  { phrase: 'Micro Breaks',         emoji: '🫧', timer: 5,  color: '#5AC8FA', eq: { sub: 0, low: 0, lowmid: 0.1, mid: 0.15, himid: 0.1, pres: 0.2, air: 0.15, full: 0 } },
  { phrase: 'Concentration Peaks',  emoji: '⛰️', timer: 50, color: '#C2550F', eq: { sub: 0.15, low: 0.2, lowmid: 0.15, mid: 0.1, himid: 0.05, pres: 0.05, air: 0, full: 0 } },
  { phrase: 'Pink Waves',           emoji: '🩷', timer: 30, color: '#FF6482', eq: { sub: 0, low: 0.1, lowmid: 0.25, mid: 0.3, himid: 0.15, pres: 0, air: 0, full: 0 } },
  { phrase: 'Resonant Field',       emoji: '📡', timer: 35, color: '#30B0C7', eq: { sub: 0.2, low: 0.15, lowmid: 0.3, mid: 0.15, himid: 0, pres: 0, air: 0, full: 0 } },
  { phrase: 'Low Hum',              emoji: '🐝', timer: 25, color: '#F5A623', eq: { sub: 0.3, low: 0.4, lowmid: 0.15, mid: 0, himid: 0, pres: 0, air: 0, full: 0 } },
  { phrase: 'Crystal Air',          emoji: '❄️', timer: 20, color: '#5AC8FA', eq: { sub: 0, low: 0, lowmid: 0, mid: 0.05, himid: 0.15, pres: 0.25, air: 0.35, full: 0 } },
  { phrase: 'Grounded',             emoji: '🌍', timer: 45, color: '#34C759', eq: { sub: 0.35, low: 0.3, lowmid: 0.2, mid: 0.1, himid: 0, pres: 0, air: 0, full: 0 } },
  { phrase: 'Bright Noise',         emoji: '💡', timer: 15, color: '#FF9500', eq: { sub: 0, low: 0, lowmid: 0.05, mid: 0.15, himid: 0.25, pres: 0.3, air: 0.2, full: 0 } },
  { phrase: 'Deep Listening',       emoji: '🎧', timer: 30, color: '#AF52DE', eq: { sub: 0.2, low: 0.25, lowmid: 0.2, mid: 0.15, himid: 0.1, pres: 0.05, air: 0.05, full: 0 } },
  { phrase: 'Mono Signal',          emoji: '〰️', timer: 25, color: '#8E8E93', eq: { sub: 0, low: 0, lowmid: 0, mid: 0.35, himid: 0, pres: 0, air: 0, full: 0 } },
  { phrase: 'Full Spectrum',        emoji: '🌈', timer: 30, color: '#E07A2F', eq: { sub: 0.15, low: 0.15, lowmid: 0.15, mid: 0.15, himid: 0.15, pres: 0.15, air: 0.15, full: 0 } },
]

function getDayIndex() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now - start) / 86400000)
  return dayOfYear % MOODS.length
}

export default function DailyMood({ onApply }) {
  const [expanded, setExpanded] = useState(false)
  const { dark } = useTheme()
  const mood = MOODS[getDayIndex()]

  const handleClick = () => {
    if (!expanded) {
      setExpanded(true)
    } else {
      onApply(mood)
      setExpanded(false)
    }
  }

  const dismiss = (e) => {
    e.stopPropagation()
    setExpanded(false)
  }

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer transition-all duration-300 active:scale-[0.98]"
      style={{
        background: expanded
          ? `linear-gradient(135deg, ${mood.color}10, ${mood.color}05)`
          : (dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
        border: expanded
          ? `1px solid ${mood.color}20`
          : `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
        borderRadius: '14px',
        padding: expanded ? '14px 16px' : '10px 16px'
      }}
    >
      {/* Collapsed: single line */}
      <div className="flex items-center gap-2.5">
        <span className="text-base">{mood.emoji}</span>
        <div className="flex-1 min-w-0">
          <span className="font-mono text-[11px] font-medium tracking-wider uppercase text-[#86868b]">
            Today's mood
          </span>
          <span className="font-mono text-[11px] mx-2 text-[#d1d1d6]">—</span>
          <span
            className="font-mono text-[12px] font-semibold tracking-wide"
            style={{ color: mood.color }}
          >
            {mood.phrase}
          </span>
        </div>
        {!expanded && (
          <span className="font-mono text-[9px] text-[#aeaeb2] tracking-wider">TAP</span>
        )}
      </div>

      {/* Expanded: show preset details */}
      {expanded && (
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <span className="font-mono text-[9px] text-[#aeaeb2] tracking-wider uppercase block">Timer</span>
              <span className={`font-mono text-[14px] font-semibold ${dark ? 'text-[#f0f0f0]' : 'text-[#1d1d1f]'}`}>{mood.timer}m</span>
            </div>
            <div>
              <span className="font-mono text-[9px] text-[#aeaeb2] tracking-wider uppercase block">Channels</span>
              <div className="flex gap-0.5 mt-0.5">
                {Object.values(mood.eq).map((v, i) => (
                  <div
                    key={i}
                    className="w-1.5 rounded-sm"
                    style={{
                      height: `${8 + v * 16}px`,
                      background: v > 0 ? mood.color : 'rgba(0,0,0,0.06)',
                      opacity: v > 0 ? 0.4 + v : 0.3
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={dismiss}
              className="px-3 py-1.5 rounded-lg text-[10px] font-mono font-medium text-[#86868b] bg-black/[0.03] hover:bg-black/[0.06] active:scale-95"
            >
              Close
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onApply(mood); setExpanded(false) }}
              className="px-3 py-1.5 rounded-lg text-[10px] font-mono font-medium text-white active:scale-95"
              style={{ background: mood.color }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
