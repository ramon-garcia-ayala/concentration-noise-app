import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { getAudioBus, setChannelVolumes, setMassageMode, updateMassageGains, setMasterVolume, getMasterVolume } from '../audioBus'
import { useTheme } from '../ThemeContext'

const CHANNELS = [
  // Graves — ruido marrón, filtros suaves
  { id: 'sub',    label: 'SUB',      hz: '20–80 Hz',    accent: '#E07A2F', type: 'brown', filterType: 'lowpass',  freq: 80,   q: 0.6 },
  { id: 'low',    label: 'LOW',      hz: '80–250 Hz',   accent: '#D4631D', type: 'brown', filterType: 'bandpass', freq: 165,  q: 0.5 },
  { id: 'lowmid', label: 'LOW MID',  hz: '250–800 Hz',  accent: '#C2550F', type: 'brown', filterType: 'bandpass', freq: 450,  q: 0.4 },
  // Medios — ruido rosado
  { id: 'mid',    label: 'MID',      hz: '800–2k Hz',   accent: '#F5A623', type: 'pink',  filterType: 'bandpass', freq: 1200, q: 0.4 },
  { id: 'himid',  label: 'HI MID',   hz: '2–6 kHz',     accent: '#FF9500', type: 'pink',  filterType: 'bandpass', freq: 3000, q: 0.4 },
  // Agudos — rosado con Q muy bajo
  { id: 'pres',   label: 'PRESENCE', hz: '6–10 kHz',    accent: '#AF52DE', type: 'pink',  filterType: 'bandpass', freq: 7500, q: 0.35 },
  { id: 'air',    label: 'AIR',      hz: '10–16 kHz',   accent: '#5856D6', type: 'pink',  filterType: 'highpass', freq: 9000, q: 0.3 },
  // Full band
  { id: 'full',   label: 'FULL',     hz: '20–20k Hz',   accent: '#8E8E93', type: 'pink',  filterType: null,       freq: 0,    q: 0 }
]

// Curva de igual loudness simplificada
const GAIN_SCALE = {
  sub: 1.0, low: 0.95, lowmid: 0.8,
  mid: 0.6, himid: 0.38,
  pres: 0.2, air: 0.14, full: 0.2
}

// ── Preset name generation ──
const NAME_RULES = [
  { cond: v => v.sub >= 0.8 && v.low >= 0.6 && sum(v) < 2,                    name: 'Thunder' },
  { cond: v => v.sub >= 0.6 && v.low >= 0.4 && hi(v) < 0.2,                   name: 'Deep Cave' },
  { cond: v => v.lowmid >= 0.6 && v.low >= 0.4 && v.mid < 0.3,                name: 'Forest Rain' },
  { cond: v => v.mid >= 0.6 && v.lowmid >= 0.4 && hi(v) < 0.3,               name: 'Warm Room' },
  { cond: v => v.mid >= 0.6 && v.himid >= 0.4 && bass(v) < 0.4,              name: 'Focus Flow' },
  { cond: v => v.full >= 0.6 && sum(v) < 1.2,                                 name: 'Pure Ocean' },
  { cond: v => v.full >= 0.4 && bass(v) >= 0.4 && hi(v) < 0.2,               name: 'River Deep' },
  { cond: v => v.pres >= 0.6 && v.air >= 0.4 && bass(v) < 0.3,               name: 'Crystal Air' },
  { cond: v => v.air >= 0.6 && v.pres >= 0.4 && bass(v) < 0.2,               name: 'Cosmic Drift' },
  { cond: v => bass(v) >= 0.8 && hi(v) >= 0.6,                                name: 'Waterfall' },
  { cond: v => sum(v) >= 3.5,                                                  name: 'Storm' },
  { cond: v => v.lowmid >= 0.4 && v.mid >= 0.4 && v.himid >= 0.2,            name: 'Café Ambient' },
  { cond: v => v.sub >= 0.4 && v.mid >= 0.4 && v.full >= 0.4,                name: 'Meditation' },
  { cond: v => bass(v) >= 0.6 && v.full >= 0.4,                               name: 'Earth Hum' },
  { cond: v => v.himid >= 0.4 && v.pres >= 0.4 && bass(v) < 0.4,            name: 'Breeze' },
  { cond: v => hi(v) >= 0.6 && v.full >= 0.2,                                 name: 'Open Sky' },
  { cond: v => bass(v) >= 0.4 && v.lowmid >= 0.4 && v.mid >= 0.4,           name: 'Library' },
  { cond: v => sum(v) > 0 && sum(v) < 0.6,                                    name: 'Whisper' },
]
function bass(v) { return (v.sub||0)+(v.low||0)+(v.lowmid||0) }
function hi(v)   { return (v.himid||0)+(v.pres||0)+(v.air||0) }
function sum(v)  { return Object.values(v).reduce((a,b) => a+b, 0) }

function generateName(volumes) {
  if (sum(volumes) === 0) return 'Silence'
  const rule = NAME_RULES.find(r => r.cond(volumes))
  return rule ? rule.name : 'Custom Mix'
}

// ── Factory presets ──
const FACTORY_PRESETS = [
  {
    id: 'factory-deep-focus',
    name: 'Deep Focus',
    icon: (c) => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="3"/><circle cx="8" cy="8" r="6" strokeDasharray="2 2"/></svg>,
    accent: '#E07A2F',
    volumes: { sub: 0.6, low: 0.8, lowmid: 0.4, mid: 0.2, himid: 0, pres: 0, air: 0, full: 0 }
  },
  {
    id: 'factory-calm-rain',
    name: 'Calm Rain',
    icon: (c) => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round"><path d="M4 6c0-2.2 1.8-4 4-4s4 1.8 4 4c1.1 0 2 .9 2 2s-.9 2-2 2H2c-1.1 0-2-.9-2-2s.9-2 2-2"/><path d="M5 13l1-2M8 14l1-2M11 13l1-2" strokeWidth="1.2"/></svg>,
    accent: '#34C759',
    volumes: { sub: 0.2, low: 0.4, lowmid: 0.6, mid: 0.6, himid: 0.4, pres: 0.2, air: 0, full: 0 }
  },
  {
    id: 'factory-night-drift',
    name: 'Night Drift',
    icon: (c) => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round"><path d="M12 3C9.5 3 7.5 5 7.5 7.5S9.5 12 12 12c-3.3 0-6-2.7-6-6s2.7-6 6-6z"/><circle cx="12" cy="5" r="0.5" fill={c}/><circle cx="14" cy="8" r="0.5" fill={c}/></svg>,
    accent: '#5856D6',
    volumes: { sub: 0.8, low: 0.6, lowmid: 0.2, mid: 0, himid: 0, pres: 0.2, air: 0.4, full: 0 }
  },
  {
    id: 'factory-warm-blanket',
    name: 'Warm Blanket',
    icon: (c) => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round"><path d="M2 10c2-1 3 1 5 0s3-1 5 0"/><path d="M2 7c2-1 3 1 5 0s3-1 5 0"/><path d="M2 13c2-1 3 1 5 0s3-1 5 0"/></svg>,
    accent: '#FF9500',
    volumes: { sub: 0.4, low: 0.6, lowmid: 0.8, mid: 0.6, himid: 0.2, pres: 0, air: 0, full: 0.2 }
  },
  {
    id: 'factory-open-wind',
    name: 'Open Wind',
    icon: (c) => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round"><path d="M2 5h8c1.7 0 3-1.3 3-3"/><path d="M2 8h10c1.7 0 3 1.3 3 3"/><path d="M2 11h6c1.1 0 2 .9 2 2"/></svg>,
    accent: '#AF52DE',
    volumes: { sub: 0, low: 0, lowmid: 0.2, mid: 0.4, himid: 0.6, pres: 0.8, air: 0.6, full: 0.2 }
  }
]

function loadUserPresets() {
  try { return JSON.parse(localStorage.getItem('eq-presets') || '[]') } catch { return [] }
}
function saveUserPresets(presets) {
  localStorage.setItem('eq-presets', JSON.stringify(presets))
}

function createNoiseBuffer(audioCtx, type, durationSec = 4) {
  const sr = audioCtx.sampleRate, len = sr * durationSec
  const buf = audioCtx.createBuffer(1, len, sr), d = buf.getChannelData(0)
  if (type === 'white') {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  } else if (type === 'pink') {
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759
      b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856
      b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980
      d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11; b6=w*0.115926
    }
  } else {
    let last=0
    for (let i = 0; i < len; i++) {
      last=(last+0.02*(Math.random()*2-1))/1.02; d[i]=last*3.5
    }
  }
  return buf
}

function createChannelGenerator(ch) {
  const { audioCtx, gainNode: busGain } = getAudioBus()
  const gainNode = audioCtx.createGain()
  const nodes = []
  const src = audioCtx.createBufferSource()
  src.buffer = createNoiseBuffer(audioCtx, ch.type, 4)
  src.loop = true
  nodes.push(src)
  if (ch.filterType) {
    const filter = audioCtx.createBiquadFilter()
    filter.type = ch.filterType
    filter.frequency.value = ch.freq
    filter.Q.value = ch.q
    src.connect(filter).connect(gainNode).connect(busGain)
  } else {
    src.connect(gainNode).connect(busGain)
  }
  src.start()
  return {
    gainNode,
    scale: GAIN_SCALE[ch.id] || 1.0,
    stop: () => { nodes.forEach(n => { try { n.stop?.() } catch {} }); gainNode.disconnect() }
  }
}

// ── Preset save panel ──
function PresetPanel({ volumes, onLoad, onClose, dark }) {
  const [presets, setPresets] = useState(loadUserPresets)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const suggestedName = generateName(volumes)

  const saveNew = () => {
    const preset = { id: Date.now(), name: suggestedName, volumes: { ...volumes } }
    const next = [preset, ...presets]
    setPresets(next)
    saveUserPresets(next)
    setEditingId(preset.id)
    setEditName(preset.name)
  }

  const rename = (id) => {
    const next = presets.map(p => p.id === id ? { ...p, name: editName } : p)
    setPresets(next)
    saveUserPresets(next)
    setEditingId(null)
  }

  const remove = (id) => {
    const next = presets.filter(p => p.id !== id)
    setPresets(next)
    saveUserPresets(next)
  }

  return (
    <div
      className="absolute top-full right-0 mt-1 w-[220px] z-50 rounded-xl p-3"
      style={{
        background: dark ? 'rgba(40,40,40,0.97)' : 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
        boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0,0,0,0.08)'
      }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className={`font-mono text-[10px] font-medium tracking-wider uppercase ${dark ? 'text-[#f0f0f0]' : 'text-[#1d1d1f]'}`}>My Presets</span>
        <button onClick={onClose} className="text-[#aeaeb2] hover:text-[#86868b] text-xs leading-none">✕</button>
      </div>

      {/* Save current */}
      <button
        onClick={saveNew}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg mb-2 active:scale-[0.98] transition-transform"
        style={{ background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', border: `1px dashed ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}` }}
      >
        <span className="font-mono text-[9px] text-[#86868b] tracking-wider">Save current</span>
        <span className={`font-mono text-[9px] font-medium truncate max-w-[100px] ml-1 ${dark ? 'text-[#f0f0f0]' : 'text-[#1d1d1f]'}`}>"{suggestedName}"</span>
      </button>

      {/* Saved presets list */}
      {presets.length > 0 ? (
          <div className="flex flex-col gap-1 max-h-[180px] overflow-y-auto">
            {presets.map(p => (
              <div key={p.id} className="flex items-center gap-1 group">
                {editingId === p.id ? (
                  <form onSubmit={e => { e.preventDefault(); rename(p.id) }} className="flex-1 flex gap-1">
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onBlur={() => rename(p.id)}
                      className={`flex-1 font-mono text-[9px] px-1.5 py-0.5 rounded border border-[#5856D6]/40 outline-none ${dark ? 'bg-[#2a2a2a] text-[#f0f0f0]' : 'bg-white'}`}
                    />
                  </form>
                ) : (
                  <button
                    onClick={() => { onLoad(p.volumes); onClose() }}
                    className={`flex-1 text-left px-2 py-1 rounded-lg active:scale-[0.98] transition-all ${dark ? 'hover:bg-white/[0.05]' : 'hover:bg-black/[0.03]'}`}
                  >
                    <span className={`font-mono text-[10px] truncate block ${dark ? 'text-[#f0f0f0]' : 'text-[#1d1d1f]'}`}>{p.name}</span>
                  </button>
                )}
                <button
                  onClick={() => { setEditingId(p.id); setEditName(p.name) }}
                  className="opacity-0 group-hover:opacity-100 font-mono text-[8px] text-[#aeaeb2] hover:text-[#86868b] px-1 transition-opacity"
                  title="Rename"
                >✎</button>
                <button
                  onClick={() => remove(p.id)}
                  className="opacity-0 group-hover:opacity-100 font-mono text-[8px] text-[#FF3B30] px-1 transition-opacity"
                  title="Delete"
                >✕</button>
              </div>
            ))}
          </div>
      ) : (
        <p className="font-mono text-[9px] text-[#aeaeb2] text-center py-2">No presets saved yet</p>
      )}
    </div>
  )
}

const SoundMixer = forwardRef(function SoundMixer(_, ref) {
  const [volumes, setVolumes] = useState(() =>
    Object.fromEntries(CHANNELS.map(c => [c.id, 0]))
  )
  const [massage, setMassage] = useState(false)
  const [animate, setAnimate] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const genRef = useRef({})
  const animateRef = useRef(null)
  const animatePhaseRef = useRef(0)
  const baseVolumesRef = useRef(null)

  const getMassageGains = () => {
    const map = {}
    for (const ch of CHANNELS) {
      const gen = genRef.current[ch.id]
      if (gen) map[ch.id] = { gainNode: gen.gainNode, scale: gen.scale, volume: volumes[ch.id] || 0 }
    }
    return map
  }

  const toggleMassage = () => setMassage(prev => {
    if (!prev) setMassageMode(true, getMassageGains())
    else setMassageMode(false, null)
    return !prev
  })

  // ── Animate mode: smooth sine oscillation per channel ──
  const startAnimate = () => {
    // Capture current volumes as base
    baseVolumesRef.current = { ...volumes }
    animatePhaseRef.current = 0

    animateRef.current = setInterval(() => {
      animatePhaseRef.current += 0.012
      const phase = animatePhaseRef.current
      const base = baseVolumesRef.current
      if (!base) return

      const newVols = {}
      CHANNELS.forEach((ch, i) => {
        const bv = base[ch.id] || 0
        if (bv <= 0) { newVols[ch.id] = 0; return }
        // Each channel oscillates with a unique phase offset and slightly different speed
        const offset = (i / CHANNELS.length) * Math.PI * 2
        const wave = Math.sin(phase * (0.5 + i * 0.08) + offset) * 0.4
            + Math.sin(phase * (0.25 + i * 0.05) + offset * 1.7) * 0.2
        // Oscillate ±30% of base, clamped to [0, 1]
        const animated = Math.max(0, Math.min(1, bv + wave * bv * 0.3))
        newVols[ch.id] = animated
      })

      // Update audio gains smoothly
      for (const ch of CHANNELS) {
        const v = newVols[ch.id]
        if (v > 0 && !genRef.current[ch.id]) {
          genRef.current[ch.id] = createChannelGenerator(ch)
        }
        if (genRef.current[ch.id]) {
          genRef.current[ch.id].gainNode.gain.setTargetAtTime(
            v * genRef.current[ch.id].scale,
            genRef.current[ch.id].gainNode.context.currentTime,
            0.08
          )
        }
      }

      setVolumes(newVols)
      setChannelVolumes(newVols)
    }, 50)
  }

  const stopAnimate = () => {
    clearInterval(animateRef.current)
    animateRef.current = null

    // Snap each channel to nearest 0.2 step
    setVolumes(prev => {
      const snapped = {}
      for (const ch of CHANNELS) {
        const v = prev[ch.id] || 0
        snapped[ch.id] = Math.round(v * 5) / 5
      }
      // Update audio gains to snapped values
      for (const ch of CHANNELS) {
        const v = snapped[ch.id]
        if (v > 0 && !genRef.current[ch.id]) {
          genRef.current[ch.id] = createChannelGenerator(ch)
        }
        if (genRef.current[ch.id]) {
          genRef.current[ch.id].gainNode.gain.setTargetAtTime(
            v * genRef.current[ch.id].scale,
            genRef.current[ch.id].gainNode.context.currentTime,
            0.15
          )
        }
        if (v === 0 && genRef.current[ch.id]) {
          genRef.current[ch.id].stop()
          delete genRef.current[ch.id]
        }
      }
      setChannelVolumes(snapped)
      return snapped
    })
    baseVolumesRef.current = null
  }

  const toggleAnimate = () => setAnimate(prev => {
    if (!prev) startAnimate()
    else stopAnimate()
    return !prev
  })

  const fadeTimeConst = 0.25 // ~250ms smooth ramp

  const applyVolumes = (newVols) => {
    const now = (genRef.current[CHANNELS[0]?.id]?.gainNode?.context?.currentTime)
      || getAudioBus().audioCtx.currentTime

    for (const ch of CHANNELS) {
      const v = newVols[ch.id] || 0
      const gen = genRef.current[ch.id]

      if (v > 0) {
        if (!gen) {
          // Create new generator, start from silence and fade in
          const g = createChannelGenerator(ch)
          g.gainNode.gain.setValueAtTime(0, now)
          g.gainNode.gain.setTargetAtTime(v * g.scale, now, fadeTimeConst)
          genRef.current[ch.id] = g
        } else {
          // Existing generator — crossfade to new level
          gen.gainNode.gain.setTargetAtTime(v * gen.scale, now, fadeTimeConst)
        }
      } else if (gen) {
        // Fade out, then stop and clean up after fade completes
        gen.gainNode.gain.setTargetAtTime(0, now, fadeTimeConst)
        const ref = gen
        setTimeout(() => { try { ref.stop() } catch {} }, 1200)
        delete genRef.current[ch.id]
      }
    }
    setVolumes(newVols)
    setChannelVolumes(newVols)
  }

  const setVolume = (id, val) => {
    const v = parseFloat(val)
    // Update base volumes if Dynamic is active so animation oscillates around new position
    if (baseVolumesRef.current) {
      baseVolumesRef.current[id] = v
    }
    setVolumes(prev => {
      const next = { ...prev, [id]: v }
      setChannelVolumes(next)
      return next
    })
    if (v > 0 && !genRef.current[id]) {
      const ch = CHANNELS.find(c => c.id === id)
      genRef.current[id] = createChannelGenerator(ch)
    }
    if (genRef.current[id]) {
      genRef.current[id].gainNode.gain.value = v * genRef.current[id].scale
    }
    if (v === 0 && genRef.current[id]) {
      genRef.current[id].stop()
      delete genRef.current[id]
    }
    // Keep massage gains in sync
    updateMassageGains(getMassageGains())
  }

  useImperativeHandle(ref, () => ({
    applyEQ(eqMap) { applyVolumes(Object.fromEntries(CHANNELS.map(ch => [ch.id, eqMap[ch.id] || 0]))) }
  }))

  useEffect(() => {
    return () => {
      Object.values(genRef.current).forEach(g => g.stop())
      clearInterval(animateRef.current)
    }
  }, [])

  const [masterVol, setMasterVol] = useState(() => getMasterVolume())

  // Sync master volume when changed from widget
  useEffect(() => {
    const handler = (e) => setMasterVol(e.detail)
    window.addEventListener('master-volume-change', handler)
    return () => window.removeEventListener('master-volume-change', handler)
  }, [])

  const { dark } = useTheme()
  const activeCount = Object.values(volumes).filter(v => v > 0).length

  const resetAll = () => {
    if (animate) {
      stopAnimate()
      setAnimate(false)
    }
    if (massage) {
      setMassageMode(false, null)
      setMassage(false)
    }
    applyVolumes(Object.fromEntries(CHANNELS.map(c => [c.id, 0])))
  }

  return (
    <div className="px-5 py-3 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="shrink-0">
          <h2 className={`font-mono text-[13px] font-medium tracking-wider uppercase ${dark ? 'text-[#f0f0f0]' : 'text-[#1d1d1f]'}`}>
            Frequency Mixer
          </h2>
          <p className="font-mono text-[10px] text-[#86868b] mt-0.5">
            {`${activeCount} channel${activeCount !== 1 ? 's' : ''} active`}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Animate toggle */}
          <button
            onClick={toggleAnimate}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full active:scale-95 transition-all duration-200"
            style={{
              background: animate ? 'rgba(255,149,0,0.1)' : (dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
              border: `1px solid ${animate ? 'rgba(255,149,0,0.3)' : (dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')}`,
            }}
          >
            <span className="text-[9px]">◇</span>
            <span className="font-mono text-[9px] font-medium tracking-wider uppercase"
              style={{ color: animate ? '#FF9500' : '#86868b' }}>
              Dynamic
            </span>
            <div className="w-5 h-2.5 rounded-full transition-colors duration-300 relative"
              style={{ background: animate ? '#FF9500' : (dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)') }}>
              <div className="absolute top-0.5 w-1.5 h-1.5 rounded-full bg-white transition-all duration-300"
                style={{ left: animate ? '10px' : '2px', boxShadow: '0 0.5px 2px rgba(0,0,0,0.2)' }} />
            </div>
          </button>

          {/* Massage toggle */}
          <button
            onClick={toggleMassage}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full active:scale-95 transition-all duration-200"
            style={{
              background: massage ? 'rgba(88,86,214,0.1)' : (dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
              border: `1px solid ${massage ? 'rgba(88,86,214,0.3)' : (dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')}`,
            }}
          >
            <span className="text-[9px]">〜</span>
            <span className="font-mono text-[9px] font-medium tracking-wider uppercase"
              style={{ color: massage ? '#5856D6' : '#86868b' }}>
              Massage
            </span>
            <div className="w-5 h-2.5 rounded-full transition-colors duration-300 relative"
              style={{ background: massage ? '#5856D6' : (dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)') }}>
              <div className="absolute top-0.5 w-1.5 h-1.5 rounded-full bg-white transition-all duration-300"
                style={{ left: massage ? '10px' : '2px', boxShadow: '0 0.5px 2px rgba(0,0,0,0.2)' }} />
            </div>
          </button>

          {/* My Presets */}
          <div className="relative">
            <button
              onClick={() => setShowPresets(p => !p)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full active:scale-95 transition-all duration-200"
              style={{
                background: showPresets ? (dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') : (dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                border: `1px solid ${showPresets ? (dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)') : (dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')}`,
              }}
            >
              <svg width="9" height="9" viewBox="0 0 16 16" fill="#86868b">
                <rect x="2" y="2" width="12" height="3" rx="1"/>
                <rect x="2" y="7" width="12" height="3" rx="1"/>
                <rect x="2" y="12" width="8" height="3" rx="1"/>
              </svg>
              <span className="font-mono text-[9px] font-medium tracking-wider uppercase text-[#86868b]">My Presets</span>
            </button>
            {showPresets && (
              <PresetPanel
                volumes={volumes}
                onLoad={applyVolumes}
                onClose={() => setShowPresets(false)}
                dark={dark}
              />
            )}
          </div>

          {/* Reset */}
          <button
            onClick={resetAll}
            disabled={activeCount === 0}
            className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all"
            style={{
              background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
              opacity: activeCount > 0 ? 0.6 : 0.2,
              cursor: activeCount > 0 ? 'pointer' : 'default'
            }}
            title="Reset all"
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke={activeCount > 0 ? '#86868b' : (dark ? '#555' : '#ccc')} strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 2v4.5h4.5" />
              <path d="M2 6.5A6 6 0 1 1 3.5 11" />
            </svg>
          </button>
        </div>
      </div>

      {/* Master volume */}
      <div className="flex items-center gap-2 mb-1.5 px-1 shrink-0">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke={dark ? '#aeaeb2' : '#86868b'} strokeWidth="1.3" strokeLinecap="round">
          <path d="M2 6v4M5 4v8l5-3V1z" />
          {masterVol === 0 ? (
            <>
              <path d="M12 5l4 4" />
              <path d="M16 5l-4 4" />
            </>
          ) : masterVol < 0.5 ? (
            <path d="M12 6c1 1 1 3 0 4" />
          ) : (
            <>
              <path d="M12 6c1 1 1 3 0 4" />
              <path d="M14 4c1.8 1.8 1.8 6.2 0 8" />
            </>
          )}
        </svg>
        <div className="flex-1 relative h-5 flex items-center">
          <div className="absolute w-full h-[3px] rounded-full" style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }} />
          <div className="absolute h-[3px] rounded-full" style={{
            width: `${masterVol * 100}%`,
            background: dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)'
          }} />
          <input
            type="range" min="0" max="1" step="0.01" value={masterVol}
            onChange={e => {
              const v = parseFloat(e.target.value)
              setMasterVol(v)
              setMasterVolume(v)
            }}
            className="absolute w-full h-5 cursor-pointer opacity-0 z-10"
          />
          <div className="absolute w-3 h-3 rounded-full pointer-events-none transition-[left] duration-75"
            style={{
              left: `calc(${masterVol * 100}% - 6px)`,
              background: dark ? '#f0f0f0' : '#1d1d1f',
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
            }}
          />
        </div>
        <span className="font-mono text-[9px] text-[#86868b] w-7 text-right tabular-nums">{Math.round(masterVol * 100)}</span>
      </div>

      {/* Factory preset buttons */}
      <div className="flex items-center gap-1.5 mb-1 px-1 flex-wrap shrink-0">
        {FACTORY_PRESETS.map(fp => (
          <button
            key={fp.id}
            onClick={() => applyVolumes(fp.volumes)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg active:scale-95 transition-all group"
            style={{
              background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
            }}
            title={fp.name}
          >
            <span className="opacity-70 group-hover:opacity-100 transition-opacity">
              {fp.icon(fp.accent)}
            </span>
            <span className="font-mono text-[8px] font-medium tracking-wider uppercase transition-colors hidden md:inline"
              style={{ color: '#86868b' }}
            >
              {fp.name}
            </span>
          </button>
        ))}
      </div>

      {/* Equalizer channels — vertical faders */}
      <div className="flex-1 flex items-center gap-1 pb-2 min-h-0">
        {CHANNELS.map(ch => {
          const v = volumes[ch.id]
          const isActive = v > 0
          return (
            <div key={ch.id} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="font-mono text-[9px] text-[#86868b] tabular-nums">
                {isActive ? (animate ? (v * 5).toFixed(1) : Math.round(v * 5)) : '—'}
              </span>

              <div className="relative flex justify-center" style={{ height: 'min(280px, calc(100vh - 280px))', width: '40px' }}>
                <div className="absolute w-2 rounded-full left-1/2 -translate-x-1/2"
                  style={{ height: '100%', background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }} />
                {[1,2,3,4,5].map(n => (
                  <div key={n}
                    className="absolute left-1/2 -translate-x-1/2 w-4 pointer-events-none"
                    style={{
                      bottom: `${n * 20}%`, height: '1px',
                      background: n <= Math.round(v * 5) ? ch.accent + '40' : (dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')
                    }} />
                ))}
                <div className={`absolute bottom-0 w-2 rounded-full left-1/2 -translate-x-1/2 ${animate ? '' : 'transition-[height] duration-150'}`}
                  style={{
                    height: `${v * 100}%`,
                    background: isActive ? `linear-gradient(to top, ${ch.accent}, ${ch.accent}90)` : 'transparent',
                    boxShadow: isActive ? `0 0 10px ${ch.accent}25` : 'none'
                  }} />
                <div className={`absolute w-5 h-3 rounded-sm left-1/2 -translate-x-1/2 pointer-events-none ${animate ? '' : 'transition-[bottom] duration-150'}`}
                  style={{
                    bottom: `calc(${v * 100}% - 6px)`,
                    background: isActive ? ch.accent : (dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'),
                    boxShadow: isActive ? `0 1px 6px ${ch.accent}40` : '0 0.5px 2px rgba(0,0,0,0.1)'
                  }} />
                <input type="range" min="0" max="1" step="0.2" value={v}
                  onChange={e => setVolume(ch.id, e.target.value)}
                  className="absolute cursor-pointer"
                  style={{
                    width: 'min(280px, calc(100vh - 280px))', height: '40px',
                    transform: 'rotate(-90deg)', transformOrigin: 'center center',
                    top: 'calc(50% - 20px)', left: 'calc(50% - min(140px, calc((100vh - 280px) / 2)))',
                    opacity: 0, zIndex: 2, margin: 0
                  }} />
              </div>

              <div className="flex flex-col items-center gap-0.5 mt-1">
                <span className="font-mono text-[9px] font-semibold tracking-wider"
                  style={{ color: isActive ? ch.accent : '#86868b' }}>
                  {ch.label}
                </span>
                <span className="font-mono text-[7px] text-[#aeaeb2]">{ch.hz}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

export default SoundMixer
