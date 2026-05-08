import { useTheme } from '../ThemeContext'

export default function TitleBar() {
  const minimize = () => window.electron?.minimizeApp()
  const close = () => window.electron?.closeApp()
  const { dark, toggle } = useTheme()

  return (
    <div
      className="relative z-10 flex items-center justify-between px-4 h-11 shrink-0"
      style={{ WebkitAppRegion: 'drag' }}
    >
      <div
        className="flex items-center gap-2"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <button
          onClick={close}
          className="group w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-110 flex items-center justify-center"
        >
          <svg className="w-1.5 h-1.5 opacity-0 group-hover:opacity-100 text-[#4a0002]" viewBox="0 0 6 6" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M0.5 0.5L5.5 5.5M5.5 0.5L0.5 5.5" />
          </svg>
        </button>
        <button
          onClick={minimize}
          className="group w-3 h-3 rounded-full bg-[#febd2e] hover:brightness-110 flex items-center justify-center"
        >
          <svg className="w-1.5 h-1.5 opacity-0 group-hover:opacity-100 text-[#995700]" viewBox="0 0 6 6" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M0.5 3H5.5" />
          </svg>
        </button>
        <div className="w-3 h-3 rounded-full bg-[#28c840]" />
      </div>

      {/* Dark/Light mode toggle — always visible */}
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full active:scale-95 transition-all"
        style={{
          WebkitAppRegion: 'no-drag',
          background: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)',
          border: `1px solid ${dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}
      >
        <span className="text-[11px]">{dark ? '☀️' : '🌙'}</span>
        <span className={`font-mono text-[10px] font-medium tracking-wider uppercase ${
          dark ? 'text-[#f0f0f0]' : 'text-[#1d1d1f]'
        }`}>
          {dark ? 'Light' : 'Dark'}
        </span>
      </button>
    </div>
  )
}
