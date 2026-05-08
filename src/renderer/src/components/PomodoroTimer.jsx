import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useTheme } from '../ThemeContext'
import { setAudioMuted, getMascotState, getMasterVolume, setMasterVolume } from '../audioBus'

const PRESET_COLORS = [
  '#E07A2F', '#34C759', '#5AC8FA', '#AF52DE', '#FF9500',
  '#FF3B30', '#5856D6', '#FF6482', '#30B0C7', '#8E8E93'
]

const INFINITE_MODE = { id: 'flow', label: '\u221e Flow', minutes: 0, color: '#5856D6', infinite: true }

const DEFAULT_MODES = [
  INFINITE_MODE,
  { id: 'focus', label: 'Focus', minutes: 25, color: '#E07A2F' },
  { id: 'short', label: 'Break', minutes: 5, color: '#34C759' },
  { id: 'long', label: 'Rest', minutes: 15, color: '#5AC8FA' }
]

// ── Workflow presets ──
const WORKFLOW_PRESETS = [
  {
    id: 'wf-pomodoro',
    name: 'Classic Pomodoro',
    desc: '25/5 \u00d7 4 + Rest',
    focus: 25, brk: 5, cycles: 4, rest: 15,
    focusColor: '#E07A2F', breakColor: '#34C759', restColor: '#5AC8FA'
  },
  {
    id: 'wf-deep',
    name: 'Deep Work',
    desc: '50/10 \u00d7 3 + Rest',
    focus: 50, brk: 10, cycles: 3, rest: 20,
    focusColor: '#AF52DE', breakColor: '#34C759', restColor: '#5AC8FA'
  },
  {
    id: 'wf-sprint',
    name: 'Sprint',
    desc: '15/3 \u00d7 6 + Rest',
    focus: 15, brk: 3, cycles: 6, rest: 10,
    focusColor: '#FF3B30', breakColor: '#FF9500', restColor: '#5AC8FA'
  },
  {
    id: 'wf-scholar',
    name: 'Scholar',
    desc: '45/10 \u00d7 3 + Rest',
    focus: 45, brk: 10, cycles: 3, rest: 15,
    focusColor: '#5856D6', breakColor: '#34C759', restColor: '#30B0C7'
  },
  {
    id: 'wf-dash',
    name: 'Quick Dash',
    desc: '10/2 \u00d7 5 + Rest',
    focus: 10, brk: 2, cycles: 5, rest: 5,
    focusColor: '#FF9500', breakColor: '#FF6482', restColor: '#5AC8FA'
  }
]

function expandWorkflow(wf) {
  const steps = []
  for (let c = 0; c < wf.cycles; c++) {
    steps.push({ type: 'focus', label: 'Focus', minutes: wf.focus, color: wf.focusColor, cycle: c + 1 })
    if (c < wf.cycles - 1) {
      steps.push({ type: 'break', label: 'Break', minutes: wf.brk, color: wf.breakColor, cycle: c + 1 })
    }
  }
  steps.push({ type: 'rest', label: 'Rest', minutes: wf.rest, color: wf.restColor, cycle: wf.cycles })
  return steps
}

function loadPresets() {
  try {
    const saved = localStorage.getItem('timer-presets')
    if (saved) return JSON.parse(saved)
  } catch {}
  return DEFAULT_MODES
}

function savePresets(presets) {
  localStorage.setItem('timer-presets', JSON.stringify(presets))
}

function loadCustomWorkflows() {
  try { return JSON.parse(localStorage.getItem('custom-workflows') || '[]') } catch { return [] }
}
function saveCustomWorkflows(wfs) {
  localStorage.setItem('custom-workflows', JSON.stringify(wfs))
}

const PomodoroTimer = forwardRef(function PomodoroTimer(_, ref) {
  const [modes, setModes] = useState(loadPresets)
  const [modeIndex, setModeIndex] = useState(0)
  const [seconds, setSeconds] = useState(() => loadPresets()[0].minutes * 60)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newMinutes, setNewMinutes] = useState(10)
  const [newColor, setNewColor] = useState(PRESET_COLORS[3])
  const intervalRef = useRef(null)
  const [moodFading, setMoodFading] = useState(false) // mood preset exit animation
  const moodFadeTimer = useRef(null)
  const mode = modes[modeIndex]
  const isInfinite = mode.infinite

  // ── Workflow state ──
  const [showWorkflows, setShowWorkflows] = useState(false)
  const [workflow, setWorkflow] = useState(null)       // active workflow definition
  const [wfSteps, setWfSteps] = useState([])           // expanded steps array
  const [wfStepIdx, setWfStepIdx] = useState(0)        // current step index
  const [wfRunning, setWfRunning] = useState(false)     // workflow is actively running
  const [wfSeconds, setWfSeconds] = useState(0)         // seconds left in current step
  const [wfDone, setWfDone] = useState(false)           // workflow completed
  const [wfHover, setWfHover] = useState(-1)            // hovered step index
  const wfIntervalRef = useRef(null)
  const wfToggleRef = useRef(null)
  const [showCustomWf, setShowCustomWf] = useState(false)
  const [customWfs, setCustomWfs] = useState(loadCustomWorkflows)
  const [cwName, setCwName] = useState('')
  const [cwFocus, setCwFocus] = useState(25)
  const [cwBreak, setCwBreak] = useState(5)
  const [cwCycles, setCwCycles] = useState(4)
  const [cwRest, setCwRest] = useState(15)

  // Wrap sendTimerUpdate to always include masterVolume
  const sendUpdate = (data) => {
    window.electron?.sendTimerUpdate({ ...data, masterVolume: getMasterVolume() })
  }

  // ── Normal timer logic (unchanged when no workflow active) ──
  useEffect(() => {
    if (workflow) return
    if (isInfinite) {
      setSeconds(0)
    } else {
      setSeconds(mode.minutes * 60)
    }
    setRunning(false)
    clearInterval(intervalRef.current)
  }, [modeIndex, mode.minutes, isInfinite])

  useEffect(() => {
    if (workflow) return
    if (running) {
      setAudioMuted(false)
      const totalSec = isInfinite ? 0 : mode.minutes * 60
      sendUpdate({
        minutes: Math.floor(seconds / 60),
        seconds: seconds % 60,
        running: true,
        mode: mode.label,
        color: mode.color,
        mascot: getMascotState(),
        totalSeconds: totalSec,
        infinite: !!isInfinite
      })

      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (isInfinite) {
            const next = s + 1
            sendUpdate({
              minutes: Math.floor(next / 60),
              seconds: next % 60,
              running: true,
              mode: mode.label,
              color: mode.color,
              mascot: getMascotState(),
              totalSeconds: 0,
              infinite: true
            })
            return next
          }
          if (s <= 1) {
            clearInterval(intervalRef.current)
            setRunning(false)
            setAudioMuted(true)
            if (modeIndex <= 1) setSessions((prev) => prev + 1)
            sendUpdate({
              minutes: 0, seconds: 0, running: false,
              mode: mode.label, color: mode.color,
              mascot: 'sleeping', totalSeconds: totalSec, infinite: false
            })
            return 0
          }
          const next = s - 1
          sendUpdate({
            minutes: Math.floor(next / 60),
            seconds: next % 60,
            running: true,
            mode: mode.label,
            color: mode.color,
            mascot: getMascotState(),
            totalSeconds: totalSec,
            infinite: false
          })
          return next
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
      setAudioMuted(true)
      sendUpdate({
        minutes: Math.floor(seconds / 60),
        seconds: seconds % 60,
        running: false,
        mode: mode.label,
        color: mode.color,
        mascot: getMascotState(),
        totalSeconds: isInfinite ? 0 : mode.minutes * 60,
        infinite: !!isInfinite
      })
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

  const toggleRef = useRef(null)
  const toggle = () => {
    if (workflow) {
      wfToggleRef.current?.()
      return
    }
    setRunning((r) => {
      if (r) setAudioMuted(true)
      else setAudioMuted(false)
      return !r
    })
  }
  toggleRef.current = toggle

  const reset = () => {
    if (workflow) {
      exitWorkflow()
      return
    }
    setRunning(false)
    setAudioMuted(true)
    setSeconds(isInfinite ? 0 : mode.minutes * 60)
    sendUpdate({ running: false, mascot: 'sleeping' })
  }
  const openWidget = () => window.electron?.openWidget()

  useEffect(() => {
    const cleanup = window.electron?.onToggleTimer(() => toggleRef.current?.())
    return () => cleanup?.()
  }, [])

  // Listen for master volume changes from widget
  useEffect(() => {
    const cleanup = window.electron?.onSetMasterVolume((level) => {
      setMasterVolume(level)
      // Notify SoundMixer via custom event
      window.dispatchEvent(new CustomEvent('master-volume-change', { detail: level }))
    })
    return () => cleanup?.()
  }, [])

  // Animate mood preset out, then remove
  const removeMoodPreset = (selectIndex) => {
    clearTimeout(moodFadeTimer.current)
    setMoodFading(true)
    moodFadeTimer.current = setTimeout(() => {
      setMoodFading(false)
      setModes(prev => {
        const moodIdx = prev.findIndex(x => x.isMood)
        if (moodIdx === -1) return prev
        const updated = prev.filter(x => !x.isMood)
        setModeIndex(selectIndex < moodIdx ? selectIndex : Math.max(0, selectIndex - 1))
        return updated
      })
    }, 700)
  }

  useImperativeHandle(ref, () => ({
    applyPreset(label, minutes, color) {
      if (workflow) exitWorkflow()
      clearTimeout(moodFadeTimer.current)
      setMoodFading(false)
      const preset = { id: 'mood-preset', label, minutes, color, isMood: true }
      const withoutMood = modes.filter(m => !m.isMood)
      const updated = [...withoutMood, preset]
      setModes(updated)
      setModeIndex(updated.length - 1)
    }
  }))

  const addPreset = () => {
    if (!newLabel.trim() || newMinutes < 1) return
    const preset = {
      id: `custom-${Date.now()}`,
      label: newLabel.trim(),
      minutes: newMinutes,
      color: newColor
    }
    const updated = [...modes, preset]
    setModes(updated)
    savePresets(updated)
    setShowAdd(false)
    setNewLabel('')
    setNewMinutes(10)
    setModeIndex(updated.length - 1)
  }

  const deletePreset = (i) => {
    if (modes.length <= 1) return
    const updated = modes.filter((_, idx) => idx !== i)
    setModes(updated)
    savePresets(updated)
    if (modeIndex >= updated.length) setModeIndex(updated.length - 1)
    else if (modeIndex === i) {
      setModeIndex(0)
      setSeconds(updated[0].minutes * 60)
    }
  }

  // Helper: sends timer update with workflow step info when active
  function sendWfUpdate(data, steps, stepIdx) {
    const stepsInfo = steps?.map(s => ({ type: s.type, color: s.color, minutes: s.minutes })) || null
    sendUpdate({
      ...data,
      wfSteps: stepsInfo,
      wfStepIdx: stepIdx ?? 0
    })
  }

  // ── Workflow engine ──
  function startWorkflow(wf) {
    const steps = expandWorkflow(wf)
    setWorkflow(wf)
    setWfSteps(steps)
    setWfStepIdx(0)
    setWfSeconds(steps[0].minutes * 60)
    setWfRunning(false)
    setWfDone(false)
    setShowWorkflows(false)
    setRunning(false)
    clearInterval(intervalRef.current)
    setAudioMuted(true)

    sendWfUpdate({
      minutes: steps[0].minutes,
      seconds: 0,
      running: false,
      mode: `${wf.name}: ${steps[0].label}`,
      color: steps[0].color,
      mascot: 'sleeping',
      totalSeconds: steps[0].minutes * 60,
      infinite: false
    }, steps, 0)
  }

  function exitWorkflow() {
    clearInterval(wfIntervalRef.current)
    setWorkflow(null)
    setWfSteps([])
    setWfStepIdx(0)
    setWfRunning(false)
    setWfDone(false)
    setAudioMuted(true)
    sendUpdate({ running: false, mascot: 'sleeping', wfSteps: null, wfStepIdx: 0 })
  }

  // Workflow toggle
  const wfToggle = () => setWfRunning(r => {
    if (r) setAudioMuted(true)
    else setAudioMuted(false)
    return !r
  })
  wfToggleRef.current = wfToggle

  // Advance to next step
  function wfAdvance(currentIdx, steps) {
    const nextIdx = currentIdx + 1
    if (nextIdx >= steps.length) {
      // Workflow complete
      clearInterval(wfIntervalRef.current)
      setWfRunning(false)
      setWfDone(true)
      setAudioMuted(true)
      setSessions(prev => prev + 1)
      sendWfUpdate({
        minutes: 0, seconds: 0, running: false,
        mode: 'Done', color: '#34C759',
        mascot: 'sleeping', totalSeconds: 0, infinite: false
      }, steps, steps.length - 1)
      return
    }
    const next = steps[nextIdx]
    setWfStepIdx(nextIdx)
    setWfSeconds(next.minutes * 60)
    // Audio: unmute for focus, mute for break/rest
    if (next.type === 'focus') {
      setAudioMuted(false)
    } else {
      setAudioMuted(true)
    }
    sendWfUpdate({
      minutes: next.minutes,
      seconds: 0,
      running: true,
      mode: next.label,
      color: next.color,
      mascot: next.type === 'focus' ? getMascotState() : 'sleeping',
      totalSeconds: next.minutes * 60,
      infinite: false
    }, steps, nextIdx)
  }

  // Jump to a specific step
  function wfJumpTo(idx) {
    if (idx < 0 || idx >= wfSteps.length) return
    clearInterval(wfIntervalRef.current)
    const target = wfSteps[idx]
    setWfStepIdx(idx)
    setWfSeconds(target.minutes * 60)
    setWfDone(false)
    const wasRunning = wfRunning
    if (wasRunning) {
      // Will restart via the wfStepIdx effect
      setWfRunning(false)
      setTimeout(() => setWfRunning(true), 50)
    }
    if (target.type === 'focus') setAudioMuted(false)
    else setAudioMuted(true)
    sendWfUpdate({
      minutes: target.minutes,
      seconds: 0,
      running: wasRunning,
      mode: target.label,
      color: target.color,
      mascot: target.type === 'focus' ? getMascotState() : 'sleeping',
      totalSeconds: target.minutes * 60,
      infinite: false
    }, wfSteps, idx)
  }

  // Workflow timer effect
  useEffect(() => {
    if (!workflow) return
    if (wfRunning) {
      const step = wfSteps[wfStepIdx]
      if (step.type === 'focus') setAudioMuted(false)
      else setAudioMuted(true)

      const totalSec = step.minutes * 60
      sendWfUpdate({
        minutes: Math.floor(wfSeconds / 60),
        seconds: wfSeconds % 60,
        running: true,
        mode: step.label,
        color: step.color,
        mascot: step.type === 'focus' ? getMascotState() : 'sleeping',
        totalSeconds: totalSec,
        infinite: false
      }, wfSteps, wfStepIdx)

      wfIntervalRef.current = setInterval(() => {
        setWfSeconds(s => {
          if (s <= 1) {
            clearInterval(wfIntervalRef.current)
            wfAdvance(wfStepIdx, wfSteps)
            return 0
          }
          const next = s - 1
          sendWfUpdate({
            minutes: Math.floor(next / 60),
            seconds: next % 60,
            running: true,
            mode: step.label,
            color: step.color,
            mascot: step.type === 'focus' ? getMascotState() : 'sleeping',
            totalSeconds: totalSec,
            infinite: false
          }, wfSteps, wfStepIdx)
          return next
        })
      }, 1000)
    } else {
      clearInterval(wfIntervalRef.current)
      if (!wfDone) {
        const step = wfSteps[wfStepIdx]
        if (step) {
          setAudioMuted(true)
          sendWfUpdate({
            minutes: Math.floor(wfSeconds / 60),
            seconds: wfSeconds % 60,
            running: false,
            mode: step.label,
            color: step.color,
            mascot: 'sleeping',
            totalSeconds: step.minutes * 60,
            infinite: false
          }, wfSteps, wfStepIdx)
        }
      }
    }
    return () => clearInterval(wfIntervalRef.current)
  }, [wfRunning])

  // Keep wfAdvance in sync with latest state
  useEffect(() => {
    if (!workflow) return
    // Re-bind interval when step changes while running
    if (wfRunning && wfSeconds > 0) {
      clearInterval(wfIntervalRef.current)
      const step = wfSteps[wfStepIdx]
      if (!step) return
      const totalSec = step.minutes * 60

      wfIntervalRef.current = setInterval(() => {
        setWfSeconds(s => {
          if (s <= 1) {
            clearInterval(wfIntervalRef.current)
            wfAdvance(wfStepIdx, wfSteps)
            return 0
          }
          const next = s - 1
          sendWfUpdate({
            minutes: Math.floor(next / 60),
            seconds: next % 60,
            running: true,
            mode: step.label,
            color: step.color,
            mascot: step.type === 'focus' ? getMascotState() : 'sleeping',
            totalSeconds: totalSec,
            infinite: false
          }, wfSteps, wfStepIdx)
          return next
        })
      }, 1000)
    }
    return () => clearInterval(wfIntervalRef.current)
  }, [wfStepIdx])

  // ── Custom workflow creation ──
  const addCustomWorkflow = () => {
    if (!cwName.trim()) return
    const wf = {
      id: `cwf-${Date.now()}`,
      name: cwName.trim(),
      desc: `${cwFocus}/${cwBreak} \u00d7 ${cwCycles} + Rest`,
      focus: cwFocus, brk: cwBreak, cycles: cwCycles, rest: cwRest,
      focusColor: '#E07A2F', breakColor: '#34C759', restColor: '#5AC8FA'
    }
    const updated = [...customWfs, wf]
    setCustomWfs(updated)
    saveCustomWorkflows(updated)
    setShowCustomWf(false)
    setCwName('')
    setCwFocus(25)
    setCwBreak(5)
    setCwCycles(4)
    setCwRest(15)
  }

  const deleteCustomWorkflow = (id) => {
    const updated = customWfs.filter(w => w.id !== id)
    setCustomWfs(updated)
    saveCustomWorkflows(updated)
  }

  const { dark } = useTheme()

  // ── Workflow active view ──
  if (workflow) {
    const step = wfSteps[wfStepIdx]
    const wfMins = Math.floor(wfSeconds / 60).toString().padStart(2, '0')
    const wfSecs = (wfSeconds % 60).toString().padStart(2, '0')
    const totalSec = step ? step.minutes * 60 : 1
    const wfProgress = step ? (1 - wfSeconds / totalSec) : 0
    const circumference = 2 * Math.PI * 105
    const wfDashOffset = circumference * (1 - wfProgress)

    // Calculate total workflow time and elapsed
    const totalWfTime = wfSteps.reduce((a, s) => a + s.minutes * 60, 0)
    const elapsedBefore = wfSteps.slice(0, wfStepIdx).reduce((a, s) => a + s.minutes * 60, 0)
    const elapsedCurrent = totalSec - wfSeconds
    const totalElapsed = elapsedBefore + elapsedCurrent

    return (
      <div className="flex flex-col items-center gap-2 md:gap-3 w-full px-4">
        {/* Workflow name */}
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[10px] font-medium tracking-[0.15em] uppercase ${dark ? 'text-[#f0f0f0]' : 'text-[#1d1d1f]'}`}>
            {workflow.name}
          </span>
          <span className="font-mono text-[9px] text-[#86868b]">
            {wfStepIdx + 1}/{wfSteps.length}
          </span>
        </div>

        {/* Circular timer */}
        <div
          className="relative flex items-center justify-center cursor-pointer"
          onClick={() => !wfDone && wfToggle()}
        >
          <svg viewBox="0 0 240 240" className="-rotate-90 w-[140px] h-[140px] md:w-[240px] md:h-[240px]">
            <circle
              cx="120" cy="120" r="105"
              fill="none"
              stroke={dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
              strokeWidth="2"
            />
            <circle
              cx="120" cy="120" r="105"
              fill="none"
              stroke={step?.color || '#86868b'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={wfDashOffset}
              style={{
                transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease',
                filter: `drop-shadow(0 0 8px ${step?.color || '#86868b'}25)`
              }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            {wfDone ? (
              <>
                <span className={`font-mono text-[28px] md:text-[44px] font-light ${dark ? 'text-[#f0f0f0]' : 'text-[#1d1d1f]'}`}>
                  Done
                </span>
                <span className="font-mono text-[9px] text-[#34C759] tracking-[0.15em] uppercase font-medium">
                  Workflow complete
                </span>
              </>
            ) : (
              <>
                <span className={`font-mono text-[28px] md:text-[48px] font-light tabular-nums tracking-tight ${dark ? 'text-[#f0f0f0]' : 'text-[#1d1d1f]'}`}>
                  {wfMins}:{wfSecs}
                </span>
                <span
                  className="font-mono text-[8px] md:text-[10px] font-medium tracking-[0.2em] uppercase"
                  style={{ color: step?.color }}
                >
                  {step?.label}{step?.type === 'focus' ? ` #${step.cycle}` : ''}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={exitWorkflow}
            className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 ${dark ? 'bg-white/[0.05] hover:bg-white/[0.08]' : 'bg-black/[0.03] hover:bg-black/[0.06]'}`}
            title="Exit workflow"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#86868b" strokeWidth="1.5" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>

          {!wfDone && (
            <button
              onClick={wfToggle}
              className="w-11 h-11 rounded-full flex items-center justify-center active:scale-95"
              style={{
                background: step?.color || '#86868b',
                boxShadow: `0 2px 12px ${step?.color || '#86868b'}30`
              }}
            >
              {wfRunning ? (
                <svg width="14" height="14" viewBox="0 0 22 22" fill="white">
                  <rect x="5" y="3" width="4" height="16" rx="1.5" />
                  <rect x="13" y="3" width="4" height="16" rx="1.5" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 22 22" fill="white">
                  <path d="M6 3.5L18 11L6 18.5V3.5Z" />
                </svg>
              )}
            </button>
          )}

          {wfDone && (
            <button
              onClick={exitWorkflow}
              className="w-11 h-11 rounded-full flex items-center justify-center active:scale-95 bg-[#34C759]"
              style={{ boxShadow: '0 2px 12px rgba(52,199,89,0.3)' }}
            >
              <svg width="14" height="14" viewBox="0 0 22 22" fill="white">
                <path d="M5 11l4 4 8-8" strokeWidth="2" stroke="white" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          <button
            onClick={openWidget}
            className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 ${dark ? 'bg-white/[0.05] hover:bg-white/[0.08]' : 'bg-black/[0.03] hover:bg-black/[0.06]'}`}
            title="Widget"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#86868b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="1" width="6" height="6" rx="1.5" />
              <rect x="9" y="1" width="6" height="6" rx="1.5" />
              <rect x="1" y="9" width="6" height="6" rx="1.5" />
            </svg>
          </button>
        </div>

        {/* Step timeline */}
        <div className="w-full max-w-[300px]">
          {/* Overall progress bar */}
          <div className="relative w-full h-1.5 rounded-full overflow-hidden mb-2"
            style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-linear"
              style={{
                width: `${totalWfTime > 0 ? (totalElapsed / totalWfTime) * 100 : 0}%`,
                background: step?.color || '#86868b'
              }}
            />
          </div>

          {/* Step blocks */}
          <div className="flex gap-0.5 w-full" onMouseLeave={() => setWfHover(-1)}>
            {wfSteps.map((s, i) => {
              const isActive = i === wfStepIdx
              const isDone = (i < wfStepIdx || wfDone) && !isActive
              const isHovered = i === wfHover
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-0.5 cursor-pointer"
                  style={{
                    opacity: isHovered ? 1 : isDone ? 0.4 : isActive ? 1 : 0.6,
                    transform: isHovered && !isActive ? 'scale(1.15)' : 'scale(1)',
                    transition: 'opacity 0.2s, transform 0.2s'
                  }}
                  onMouseEnter={() => setWfHover(i)}
                  onClick={() => wfJumpTo(i)}
                  title={`${s.label}${s.type === 'focus' ? ' #' + s.cycle : ''} — ${s.minutes}m`}
                >
                  <div
                    className="w-full rounded-sm transition-all"
                    style={{
                      height: isActive ? '6px' : isHovered ? '8px' : '4px',
                      background: s.color,
                      boxShadow: isActive ? `0 0 8px ${s.color}40` : isHovered ? `0 0 12px ${s.color}60` : 'none'
                    }}
                  />
                  <span className="font-mono leading-none truncate w-full text-center transition-all"
                    style={{
                      fontSize: isHovered ? '7px' : '6px',
                      color: isHovered ? s.color : '#86868b'
                    }}>
                    {s.type === 'focus' ? `F${s.cycle}` : s.type === 'break' ? 'B' : 'R'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sessions dots */}
        {sessions > 0 && (
          <div className="flex items-center gap-1.5">
            {Array.from({ length: Math.min(sessions, 8) }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#E07A2F]" />
            ))}
            <span className="font-mono text-[10px] text-[#86868b] ml-1">{sessions}</span>
          </div>
        )}
      </div>
    )
  }

  // ── Normal timer view ──
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
  const secs = (seconds % 60).toString().padStart(2, '0')
  const progress = isInfinite ? (running ? 1 : 0) : (1 - seconds / (mode.minutes * 60))
  const circumference = 2 * Math.PI * 105
  const dashOffset = isInfinite ? (running ? 0 : circumference) : circumference * (1 - progress)

  // ── Workflow selector full panel ──
  if (showWorkflows) {
    return (
      <div className="flex flex-col items-center w-full h-full px-4 py-2 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between w-full max-w-[320px] mb-3">
          <div className="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#5856D6" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 4h3M7 4h3M12 4h2" />
              <path d="M2 8h5M9 8h2M13 8h1" />
              <path d="M2 12h2M6 12h4M12 12h2" />
            </svg>
            <span className={`font-mono text-[12px] font-medium tracking-wider uppercase ${dark ? 'text-[#f0f0f0]' : 'text-[#1d1d1f]'}`}>
              Workflows
            </span>
          </div>
          <button
            onClick={() => { setShowWorkflows(false); setShowCustomWf(false) }}
            className={`w-7 h-7 rounded-full flex items-center justify-center active:scale-95 ${dark ? 'bg-white/[0.05] hover:bg-white/[0.08]' : 'bg-black/[0.03] hover:bg-black/[0.06]'}`}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#86868b" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 2l6 6M8 2l-6 6" />
            </svg>
          </button>
        </div>

        {/* Built-in workflows */}
        <div className="flex flex-col gap-1.5 w-full max-w-[320px]">
          {WORKFLOW_PRESETS.map(wf => {
            const totalMin = wf.focus * wf.cycles + wf.brk * (wf.cycles - 1) + wf.rest
            return (
              <button
                key={wf.id}
                onClick={() => startWorkflow(wf)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl active:scale-[0.98] transition-all ${dark ? 'bg-white/[0.03] hover:bg-white/[0.06]' : 'bg-black/[0.02] hover:bg-black/[0.04]'}`}
                style={{ border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}` }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex gap-0.5 items-end">
                    <div className="w-2 h-4 rounded-sm" style={{ background: wf.focusColor }} />
                    <div className="w-1.5 h-2.5 rounded-sm" style={{ background: wf.breakColor }} />
                    <div className="w-1.5 h-3 rounded-sm" style={{ background: wf.restColor }} />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className={`font-mono text-[11px] font-medium ${dark ? 'text-[#f0f0f0]' : 'text-[#1d1d1f]'}`}>
                      {wf.name}
                    </span>
                    <span className="font-mono text-[9px] text-[#86868b]">{wf.desc}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-mono text-[10px] text-[#aeaeb2]">{totalMin}m</span>
                  <span className="font-mono text-[8px] text-[#aeaeb2]">
                    {Math.floor(totalMin / 60) > 0 ? `${Math.floor(totalMin / 60)}h ${totalMin % 60}m` : ''}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Custom workflows */}
        {customWfs.length > 0 && (
          <div className="w-full max-w-[320px] mt-3">
            <div className={`border-t mb-2 ${dark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`} />
            <span className="font-mono text-[9px] text-[#86868b] tracking-wider uppercase mb-1.5 block">Custom</span>
            <div className="flex flex-col gap-1.5">
              {customWfs.map(wf => {
                const totalMin = wf.focus * wf.cycles + wf.brk * (wf.cycles - 1) + wf.rest
                return (
                  <div key={wf.id} className="flex items-center gap-1 group">
                    <button
                      onClick={() => startWorkflow(wf)}
                      className={`flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl active:scale-[0.98] transition-all ${dark ? 'bg-white/[0.03] hover:bg-white/[0.06]' : 'bg-black/[0.02] hover:bg-black/[0.04]'}`}
                      style={{ border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}` }}
                    >
                      <div className="flex flex-col items-start">
                        <span className={`font-mono text-[11px] font-medium ${dark ? 'text-[#f0f0f0]' : 'text-[#1d1d1f]'}`}>
                          {wf.name}
                        </span>
                        <span className="font-mono text-[9px] text-[#86868b]">{wf.desc}</span>
                      </div>
                      <span className="font-mono text-[10px] text-[#aeaeb2]">{totalMin}m</span>
                    </button>
                    <button
                      onClick={() => deleteCustomWorkflow(wf.id)}
                      className="opacity-0 group-hover:opacity-100 font-mono text-[10px] text-[#FF3B30] px-1.5 transition-opacity"
                      title="Delete"
                    >&times;</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Create custom workflow */}
        <div className="w-full max-w-[320px] mt-3">
          {!showCustomWf ? (
            <button
              onClick={() => setShowCustomWf(true)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl active:scale-[0.98] transition-transform"
              style={{
                background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                border: `1px dashed ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`
              }}
            >
              <span className="text-[#5856D6] text-sm">+</span>
              <span className="font-mono text-[10px] text-[#86868b] tracking-wider">Custom Workflow</span>
            </button>
          ) : (
            <div
              className="rounded-xl p-3 flex flex-col gap-2.5"
              style={{
                background: dark ? 'rgba(88,86,214,0.06)' : 'rgba(88,86,214,0.03)',
                border: `1px solid ${dark ? 'rgba(88,86,214,0.2)' : 'rgba(88,86,214,0.12)'}`
              }}
            >
              <span className="font-mono text-[10px] text-[#5856D6] tracking-wider uppercase font-medium">New Workflow</span>
              <input
                type="text"
                placeholder="Name"
                value={cwName}
                onChange={e => setCwName(e.target.value)}
                maxLength={20}
                className={`w-full px-2.5 py-1.5 rounded-lg text-[11px] font-mono outline-none ${
                  dark
                    ? 'bg-white/[0.05] border border-white/[0.08] text-[#f0f0f0] placeholder-[#555]'
                    : 'bg-white border border-black/[0.06] text-[#1d1d1f] placeholder-[#aeaeb2]'
                } focus:border-[#5856D6]/40`}
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[9px] text-[#E07A2F] w-8">Focus</span>
                  <input type="number" min="1" max="120" value={cwFocus}
                    onChange={e => setCwFocus(Math.max(1, Math.min(120, parseInt(e.target.value) || 1)))}
                    className={`w-12 px-1.5 py-1 rounded text-[10px] font-mono text-center outline-none ${
                      dark ? 'bg-white/[0.05] border border-white/[0.08] text-[#f0f0f0]' : 'bg-white border border-black/[0.06] text-[#1d1d1f]'
                    }`} />
                  <span className="font-mono text-[8px] text-[#86868b]">m</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[9px] text-[#34C759] w-8">Break</span>
                  <input type="number" min="1" max="60" value={cwBreak}
                    onChange={e => setCwBreak(Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))}
                    className={`w-12 px-1.5 py-1 rounded text-[10px] font-mono text-center outline-none ${
                      dark ? 'bg-white/[0.05] border border-white/[0.08] text-[#f0f0f0]' : 'bg-white border border-black/[0.06] text-[#1d1d1f]'
                    }`} />
                  <span className="font-mono text-[8px] text-[#86868b]">m</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[9px] text-[#5856D6] w-8">Cycles</span>
                  <input type="number" min="1" max="12" value={cwCycles}
                    onChange={e => setCwCycles(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                    className={`w-12 px-1.5 py-1 rounded text-[10px] font-mono text-center outline-none ${
                      dark ? 'bg-white/[0.05] border border-white/[0.08] text-[#f0f0f0]' : 'bg-white border border-black/[0.06] text-[#1d1d1f]'
                    }`} />
                  <span className="font-mono text-[8px] text-[#86868b]">&times;</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[9px] text-[#5AC8FA] w-8">Rest</span>
                  <input type="number" min="1" max="60" value={cwRest}
                    onChange={e => setCwRest(Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))}
                    className={`w-12 px-1.5 py-1 rounded text-[10px] font-mono text-center outline-none ${
                      dark ? 'bg-white/[0.05] border border-white/[0.08] text-[#f0f0f0]' : 'bg-white border border-black/[0.06] text-[#1d1d1f]'
                    }`} />
                  <span className="font-mono text-[8px] text-[#86868b]">m</span>
                </div>
              </div>
              {/* Preview */}
              <div className="font-mono text-[9px] text-[#86868b] text-center py-1"
                style={{ background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                {cwFocus}/{cwBreak} &times; {cwCycles} + {cwRest}m rest = <span className={dark ? 'text-[#f0f0f0]' : 'text-[#1d1d1f]'}>{cwFocus * cwCycles + cwBreak * (cwCycles - 1) + cwRest}m total</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addCustomWorkflow}
                  disabled={!cwName.trim()}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-mono font-medium text-white active:scale-95 disabled:opacity-30"
                  style={{ background: '#5856D6' }}
                >
                  Save
                </button>
                <button
                  onClick={() => setShowCustomWf(false)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-medium text-[#86868b] active:scale-95 ${dark ? 'bg-white/[0.05]' : 'bg-black/[0.03]'}`}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2 md:gap-4 w-full px-4">
      {/* Workflow button — top of panel */}
      <button
        onClick={() => { setShowWorkflows(true); setShowAdd(false) }}
        className="flex items-center gap-1.5 px-3 py-1 rounded-full active:scale-95 transition-all self-center"
        style={{
          background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`
        }}
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="#86868b" strokeWidth="1.5" strokeLinecap="round">
          <path d="M2 4h3M7 4h3M12 4h2" />
          <path d="M2 8h5M9 8h2M13 8h1" />
          <path d="M2 12h2M6 12h4M12 12h2" />
        </svg>
        <span className="font-mono text-[9px] font-medium tracking-wider uppercase text-[#86868b]">
          Workflows
        </span>
      </button>

      {/* Circular timer — smaller on mobile */}
      <div
        className="relative flex items-center justify-center cursor-pointer"
        onClick={toggle}
      >
        <svg viewBox="0 0 240 240" className="-rotate-90 w-[140px] h-[140px] md:w-[240px] md:h-[240px]">
          <circle
            cx="120" cy="120" r="105"
            fill="none"
            stroke={dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
            strokeWidth="2"
          />
          <circle
            cx="120" cy="120" r="105"
            fill="none"
            stroke={mode.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease',
              filter: `drop-shadow(0 0 8px ${mode.color}25)`
            }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={`font-mono text-[28px] md:text-[48px] font-light tabular-nums tracking-tight ${dark ? 'text-[#f0f0f0]' : 'text-[#1d1d1f]'}`}>
            {isInfinite && seconds === 0 ? '\u221e' : `${mins}:${secs}`}
          </span>
          <span
            className="font-mono text-[8px] md:text-[10px] font-medium tracking-[0.2em] uppercase"
            style={{ color: mode.color }}
          >
            {mode.label}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={reset}
          className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 ${dark ? 'bg-white/[0.05] hover:bg-white/[0.08]' : 'bg-black/[0.03] hover:bg-black/[0.06]'}`}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#86868b" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 2v4.5h4.5" />
            <path d="M2 6.5A6 6 0 1 1 3.5 11" />
          </svg>
        </button>

        <button
          onClick={toggle}
          className="w-11 h-11 rounded-full flex items-center justify-center active:scale-95"
          style={{
            background: mode.color,
            boxShadow: `0 2px 12px ${mode.color}30`
          }}
        >
          {running ? (
            <svg width="14" height="14" viewBox="0 0 22 22" fill="white">
              <rect x="5" y="3" width="4" height="16" rx="1.5" />
              <rect x="13" y="3" width="4" height="16" rx="1.5" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 22 22" fill="white">
              <path d="M6 3.5L18 11L6 18.5V3.5Z" />
            </svg>
          )}
        </button>

        <button
          onClick={openWidget}
          className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 ${dark ? 'bg-white/[0.05] hover:bg-white/[0.08]' : 'bg-black/[0.03] hover:bg-black/[0.06]'}`}
          title="Widget"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#86868b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="1" width="6" height="6" rx="1.5" />
            <rect x="9" y="1" width="6" height="6" rx="1.5" />
            <rect x="1" y="9" width="6" height="6" rx="1.5" />
          </svg>
        </button>
      </div>

      {/* Preset list — scrollable chips */}
      <div className="flex flex-wrap justify-center gap-1 max-w-[320px]">
        {modes.map((m, i) => {
          const isFadingOut = m.isMood && moodFading
          return (
            <button
              key={m.id}
              onClick={() => {
                if (!m.isMood) {
                  const moodIdx = modes.findIndex(x => x.isMood)
                  if (moodIdx !== -1 && !moodFading) {
                    removeMoodPreset(i)
                    return
                  }
                }
                setModeIndex(i)
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                if (modes.length > 1) deletePreset(i)
              }}
              className={`group relative px-2.5 py-1 rounded-full text-[10px] font-mono font-medium tracking-wider uppercase active:scale-95 ${
                modeIndex === i ? 'text-white' : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
              style={{
                ...(modeIndex === i ? { background: m.color } : {}),
                transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease, transform 0.6s ease, max-width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: isFadingOut ? 0 : 1,
                transform: isFadingOut ? 'scale(0.85)' : 'scale(1)',
                maxWidth: isFadingOut ? '0px' : '200px',
                overflow: 'hidden',
                padding: isFadingOut ? '4px 0' : undefined,
              }}
              title={`${m.infinite ? '\u221e' : m.minutes + ' min'} \u2014 right-click to delete`}
            >
              {m.label}
              {!m.infinite && (
                <span className={`ml-1 ${modeIndex === i ? 'text-white/60' : 'text-[#aeaeb2]'}`}>
                  {m.minutes}m
                </span>
              )}
            </button>
          )
        })}

        {/* Add preset button */}
        <button
          onClick={() => setShowAdd(!showAdd)}
          className={`w-6 h-6 rounded-full flex items-center justify-center active:scale-95 text-[#86868b] text-sm ${dark ? 'bg-white/[0.05] hover:bg-white/[0.08]' : 'bg-black/[0.03] hover:bg-black/[0.06]'}`}
          title="Add custom preset"
        >
          +
        </button>
      </div>

      {/* Add preset form */}
      {showAdd && (
        <div
          className="w-full max-w-[280px] rounded-xl p-3 flex flex-col gap-2.5"
          style={{
            background: dark ? 'rgba(40,40,40,0.95)' : 'rgba(0,0,0,0.02)',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`
          }}
        >
          <span className="font-mono text-[10px] text-[#86868b] tracking-wider uppercase">
            New Preset
          </span>

          {/* Name */}
          <input
            type="text"
            placeholder="Name"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            maxLength={12}
            className={`w-full px-3 py-1.5 rounded-lg text-[12px] font-mono outline-none focus:border-[#E07A2F]/40 ${
              dark
                ? 'bg-white/[0.05] border border-white/[0.08] text-[#f0f0f0] placeholder-[#555]'
                : 'bg-white border border-black/[0.06] text-[#1d1d1f] placeholder-[#aeaeb2]'
            }`}
          />

          {/* Minutes */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="240"
              value={newMinutes}
              onChange={(e) => setNewMinutes(Math.max(1, Math.min(240, parseInt(e.target.value) || 1)))}
              className={`w-16 px-2 py-1.5 rounded-lg text-[12px] font-mono outline-none focus:border-[#E07A2F]/40 text-center ${
                dark
                  ? 'bg-white/[0.05] border border-white/[0.08] text-[#f0f0f0]'
                  : 'bg-white border border-black/[0.06] text-[#1d1d1f]'
              }`}
            />
            <span className="font-mono text-[10px] text-[#86868b]">minutes</span>
          </div>

          {/* Color picker */}
          <div className="flex gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className="w-5 h-5 rounded-full active:scale-90 transition-transform"
                style={{
                  background: c,
                  boxShadow: newColor === c ? `0 0 0 2px ${dark ? '#2c2c2e' : 'white'}, 0 0 0 3.5px ${c}` : 'none'
                }}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-0.5">
            <button
              onClick={addPreset}
              disabled={!newLabel.trim()}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-mono font-medium text-white active:scale-95 disabled:opacity-30"
              style={{ background: newColor }}
            >
              Save
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-medium text-[#86868b] active:scale-95 ${dark ? 'bg-white/[0.05]' : 'bg-black/[0.03] hover:bg-black/[0.06]'}`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sessions dots */}
      {sessions > 0 && (
        <div className="flex items-center gap-1.5">
          {Array.from({ length: Math.min(sessions, 8) }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#E07A2F]" />
          ))}
          <span className="font-mono text-[10px] text-[#86868b] ml-1">{sessions}</span>
        </div>
      )}
    </div>
  )
})

export default PomodoroTimer
