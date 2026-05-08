import { useRef, useState, useEffect } from 'react'
import SoundMixer from './components/SoundMixer'
import PomodoroTimer from './components/PomodoroTimer'
import TitleBar from './components/TitleBar'
import ParticleBackground from './components/ParticleBackground'
import PixelMascot from './components/PixelMascot'
import DailyMood from './components/DailyMood'
import MediaPlayer from './components/MediaPlayer'
import { ThemeProvider, useTheme } from './ThemeContext'

function AppInner() {
  const timerRef = useRef(null)
  const mixerRef = useRef(null)
  const { dark } = useTheme()
  const [timerOpen, setTimerOpen] = useState(true)
  const [hasMedia, setHasMedia] = useState(false)

  useEffect(() => {
    const cleanup = window.electron?.onMediaUpdate((data) => {
      setHasMedia(!!(data && data.title))
    })
    return () => cleanup?.()
  }, [])

  const handleMoodApply = (mood) => {
    timerRef.current?.applyPreset(mood.phrase, mood.timer, mood.color)
    mixerRef.current?.applyEQ(mood.eq)
  }

  const panelBg = dark ? 'rgba(44,44,46,0.95)' : 'rgba(255,255,255,0.95)'
  const panelBorder = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'

  return (
    <div className={`flex flex-col h-screen transition-colors duration-300 ${
      dark ? 'bg-[#2c2c2e] text-[#f0f0f0]' : 'bg-white text-[#1d1d1f]'
    }`}>
      <ParticleBackground />
      <TitleBar />
      {/* Daily Mood + Media Player row */}
      <div className="relative z-30 px-4 sm:px-5 pt-1 pb-2 flex items-stretch gap-2">
        <div className={`transition-all duration-500 min-w-0 ${hasMedia ? 'flex-1' : 'w-full'}`}>
          <DailyMood onApply={handleMoodApply} />
        </div>
        <div className={`shrink-0 transition-all duration-500 ${hasMedia ? 'w-auto opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}>
          <MediaPlayer />
        </div>
      </div>
      {/* Main content */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative z-10 px-3 pb-3 gap-2">
        {/* Timer Panel — always visible on mobile (centered), collapsible on desktop */}
        <div
          className={`relative z-20 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] overflow-hidden shrink-0 rounded-2xl ${
            timerOpen
              ? 'md:w-[360px]'
              : 'md:w-0 md:max-h-0 md:opacity-0'
          }`}
          style={{
            background: panelBg,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${panelBorder}`,
            boxShadow: dark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          <div className="flex flex-col items-center py-2 md:py-0 px-3 md:px-0 h-full md:w-[360px] relative">
            <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 overflow-y-auto">
              <PomodoroTimer ref={timerRef} />
            </div>
            <div className="hidden md:block shrink-0 pb-2">
              <PixelMascot />
            </div>
          </div>
        </div>

        {/* Timer toggle tab — desktop only */}
        <button
          onClick={() => setTimerOpen(o => !o)}
          className={`hidden md:flex items-center justify-center w-5 shrink-0 z-20 rounded-lg transition-colors ${
            dark ? 'hover:bg-white/[0.04]' : 'hover:bg-black/[0.02]'
          }`}
          title={timerOpen ? 'Hide timer' : 'Show timer'}
        >
          <svg width="8" height="12" viewBox="0 0 8 12" fill="none" stroke="#86868b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: timerOpen ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s' }}>
            <path d="M6 1L1 6L6 11" />
          </svg>
        </button>

        {/* Equalizer — directly on the background, no panel */}
        <div className="relative flex-1 overflow-y-auto z-10 min-h-0">
          <SoundMixer ref={mixerRef} />
          {/* Mascot — bottom-right on mobile, hidden on desktop (shown in timer panel) */}
          <div className="md:hidden absolute bottom-2 right-2 z-30 opacity-80 scale-75 origin-bottom-right">
            <PixelMascot />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  )
}
