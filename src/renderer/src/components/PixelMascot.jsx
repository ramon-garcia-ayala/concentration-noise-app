import { useEffect, useRef, useState } from 'react'
import { getFrequencyData, getAverageLevel, getAllChannelsMaxed, setMascotState } from '../audioBus'

const P = '#E07A2F', D = '#C2550F', L = '#F5C28A'
const W = '#FFFFFF', B = '#1d1d1f', G = '#86868b'
const _ = null

// Cat sprite tokens: F=fur, Fd=furDark, Fw=belly/white, Fp=pink, E=eyeHighlight, Ep=pupil
const F = 'F', Fd = 'Fd', Fw = 'Fw', Fp = 'Fp', E = 'E', Ep = 'Ep'

// Realistic cat color presets
const CAT_PRESETS = [
  { name: 'Mochi',     fur: '#6B6B6B', furDark: '#4A4A4A', belly: '#D4D4D4', pink: '#FFB6C1', eyeW: '#FFFFFF', pupil: '#1d1d1f' },
  { name: 'Pumpkin',   fur: '#D4843E', furDark: '#A8652A', belly: '#F5DCC0', pink: '#FFB6C1', eyeW: '#FFFFFF', pupil: '#2D5016' },
  { name: 'Cleo',      fur: '#2A2A2A', furDark: '#151515', belly: '#4A4A4A', pink: '#CC8B96', eyeW: '#E8D44D', pupil: '#1d1d1f' },
  { name: 'Snowball',  fur: '#E8E8E8', furDark: '#C8C8C8', belly: '#FFFFFF', pink: '#FFB6C1', eyeW: '#87CEEB', pupil: '#1d1d1f' },
  { name: 'Biscuit',   fur: '#F0E6D3', furDark: '#8B7355', belly: '#FAF5ED', pink: '#FFB6C1', eyeW: '#6CB4EE', pupil: '#1d1d1f' },
  { name: 'Pepper',    fur: '#1A1A1A', furDark: '#000000', belly: '#FFFFFF', pink: '#FFB6C1', eyeW: '#90EE90', pupil: '#1d1d1f' },
  { name: 'Niki',      fur: '#C4813C', furDark: '#3D3D3D', belly: '#F5E6D0', pink: '#FFB6C1', eyeW: '#FFFFFF', pupil: '#5D4E37' },
  { name: 'Misty',     fur: '#7B8FA0', furDark: '#5A6E7F', belly: '#B8C8D4', pink: '#D4A0AA', eyeW: '#90EE90', pupil: '#1d1d1f' },
]

function loadCatConfig() {
  try {
    const saved = localStorage.getItem('cat-config')
    if (saved) {
      const parsed = JSON.parse(saved)
      return { presetIdx: parsed.presetIdx || 0 }
    }
  } catch {}
  return { presetIdx: 0 }
}

// =====================================================
//  KAWAII CAT SPRITES (10x12)
//  Inspired by cute pixel art: big head, shiny 2x2 eyes
//  with highlight pixel, tiny nose, compact body
// =====================================================
function makeCatSprites(colors) {
  const { fur, furDark, belly, pink, eyeW, pupil } = colors
  const R = {[F]: fur, [Fd]: furDark, [Fw]: belly, [Fp]: pink, [E]: eyeW, [Ep]: pupil, [_]: null }

  const sprites = {
    // Sitting calmly, big shiny eyes
    idle: [
      [_,F,_,_,_,_,_,_,F,_],
      [F,Fp,F,F,F,F,F,F,Fp,F],
      [F,Fw,Fw,Fw,Fw,Fw,Fw,Fw,Fw,F],
      [F,Fw,Ep,E,Fw,Fw,Ep,E,Fw,F],
      [F,Fw,Ep,Ep,Fw,Fw,Ep,Ep,Fw,F],
      [F,Fw,Fw,Fw,Fp,Fp,Fw,Fw,Fw,F],
      [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
      [_,F,F,Fw,Fw,Fw,Fw,F,F,_],
      [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
      [_,F,F,_,_,_,_,F,F,_],
      [_,_,_,_,_,_,_,_,_,_],
      [_,_,_,_,_,_,_,_,_,_],
    ],
    // Half-closed eyes, relaxed
    listening: [
      [_,F,_,_,_,_,_,_,F,_],
      [F,Fp,F,F,F,F,F,F,Fp,F],
      [F,Fw,Fw,Fw,Fw,Fw,Fw,Fw,Fw,F],
      [F,Fw,Fw,Fw,Fw,Fw,Fw,Fw,Fw,F],
      [F,Fw,Fd,Fd,Fw,Fw,Fd,Fd,Fw,F],
      [F,Fw,Fw,Fw,Fp,Fp,Fw,Fw,Fw,F],
      [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
      [_,F,F,Fw,Fw,Fw,Fw,F,F,_],
      [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
      [_,F,F,_,_,_,_,F,F,_],
      [_,_,_,_,_,_,_,_,_,_],
      [_,_,_,_,_,_,_,_,_,_],
    ],
    // Focused, looking forward
    studying1: [
      [_,F,_,_,_,_,_,_,F,_],
      [F,Fp,F,F,F,F,F,F,Fp,F],
      [F,Fw,Fw,Fw,Fw,Fw,Fw,Fw,Fw,F],
      [F,Fw,Ep,E,Fw,Fw,Ep,E,Fw,F],
      [F,Fw,Ep,Ep,Fw,Fw,Ep,Ep,Fw,F],
      [F,Fw,Fw,Fw,Fp,Fp,Fw,Fw,Fw,F],
      [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
      [_,F,F,Fw,Fw,Fw,Fw,F,F,_],
      [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
      [_,F,F,_,_,_,_,F,F,_],
      [_,_,_,_,_,_,_,_,_,_],
      [_,_,_,_,_,_,_,_,_,_],
    ],
    // Ears relaxed, slight head tilt
    studying2: [
      [_,_,F,_,_,_,_,F,_,_],
      [_,F,Fp,F,F,F,F,Fp,F,_],
      [F,Fw,Fw,Fw,Fw,Fw,Fw,Fw,Fw,F],
      [F,Fw,Ep,E,Fw,Fw,Ep,E,Fw,F],
      [F,Fw,Ep,Ep,Fw,Fw,Ep,Ep,Fw,F],
      [F,Fw,Fw,Fw,Fp,Fp,Fw,Fw,Fw,F],
      [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
      [_,F,F,Fw,Fw,Fw,Fw,F,F,_],
      [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
      [_,F,F,_,_,_,_,F,F,_],
      [_,_,_,_,_,_,_,_,_,_],
      [_,_,_,_,_,_,_,_,_,_],
    ],
    // Dancing! Left paw up, blushy cheeks
    dance1: [
      [_,F,_,_,_,_,_,_,F,_],
      [F,Fp,F,F,F,F,F,F,Fp,F],
      [F,Fw,Fw,Fw,Fw,Fw,Fw,Fw,Fw,F],
      [F,Fw,Ep,E,Fw,Fw,Ep,E,Fw,F],
      [F,Fw,Ep,Ep,Fw,Fw,Ep,Ep,Fw,F],
      [F,Fp,Fw,Fw,Fw,Fw,Fw,Fw,Fp,F],
      [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
      [F,F,F,Fw,Fw,Fw,Fw,F,F,_],
      [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
      [_,F,F,_,_,_,_,F,F,_],
      [_,_,_,_,_,_,_,_,_,_],
      [_,_,_,_,_,_,_,_,_,_],
    ],
    // Dancing! Right paw up, blushy cheeks
    dance2: [
      [_,F,_,_,_,_,_,_,F,_],
      [F,Fp,F,F,F,F,F,F,Fp,F],
      [F,Fw,Fw,Fw,Fw,Fw,Fw,Fw,Fw,F],
      [F,Fw,E,Ep,Fw,Fw,E,Ep,Fw,F],
      [F,Fw,Ep,Ep,Fw,Fw,Ep,Ep,Fw,F],
      [F,Fp,Fw,Fw,Fw,Fw,Fw,Fw,Fp,F],
      [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
      [_,F,F,Fw,Fw,Fw,Fw,F,F,F],
      [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
      [_,F,F,_,_,_,_,F,F,_],
      [_,_,_,_,_,_,_,_,_,_],
      [_,_,_,_,_,_,_,_,_,_],
    ],
    // Sleeping — curled up, no paws visible
    sleeping: [
      [_,F,_,_,_,_,_,_,F,_],
      [F,Fp,F,F,F,F,F,F,Fp,F],
      [F,Fw,Fw,Fw,Fw,Fw,Fw,Fw,Fw,F],
      [F,Fw,Fw,Fw,Fw,Fw,Fw,Fw,Fw,F],
      [F,Fw,Fd,Fd,Fw,Fw,Fd,Fd,Fw,F],
      [F,Fw,Fw,Fw,Fp,Fp,Fw,Fw,Fw,F],
      [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
      [_,F,F,Fw,Fw,Fw,Fw,F,F,_],
      [_,F,F,F,F,F,F,F,F,_],
      [_,_,F,F,F,F,F,F,_,_],
      [_,_,_,_,_,_,_,_,_,_],
      [_,_,_,_,_,_,_,_,_,_],
    ],
    // MAX VIBING — arms out, super happy, blush
    vibing1: [
      [_,F,_,_,_,_,_,_,F,_],
      [F,Fp,F,F,F,F,F,F,Fp,F],
      [F,Fw,Fw,Fw,Fw,Fw,Fw,Fw,Fw,F],
      [F,Fw,Ep,E,Fw,Fw,Ep,E,Fw,F],
      [F,Fw,Ep,Ep,Fw,Fw,Ep,Ep,Fw,F],
      [F,Fp,Fw,Fw,Fp,Fp,Fw,Fw,Fp,F],
      [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
      [F,_,F,Fw,Fw,Fw,Fw,F,_,F],
      [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
      [_,F,F,_,_,_,_,F,F,_],
      [_,_,_,_,_,_,_,_,_,_],
      [_,_,_,_,_,_,_,_,_,_],
    ],
    // MAX VIBING — mirror, looking other way
    vibing2: [
      [_,F,_,_,_,_,_,_,F,_],
      [F,Fp,F,F,F,F,F,F,Fp,F],
      [F,Fw,Fw,Fw,Fw,Fw,Fw,Fw,Fw,F],
      [F,Fw,E,Ep,Fw,Fw,E,Ep,Fw,F],
      [F,Fw,Ep,Ep,Fw,Fw,Ep,Ep,Fw,F],
      [F,Fp,Fw,Fw,Fp,Fp,Fw,Fw,Fp,F],
      [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
      [F,_,F,Fw,Fw,Fw,Fw,F,_,F],
      [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
      [_,F,F,_,_,_,_,F,F,_],
      [_,_,_,_,_,_,_,_,_,_],
      [_,_,_,_,_,_,_,_,_,_],
    ],
    // Wink — one eye open, one closed (curled up like sleeping)
    wink: [
      [_,F,_,_,_,_,_,_,F,_],
      [F,Fp,F,F,F,F,F,F,Fp,F],
      [F,Fw,Fw,Fw,Fw,Fw,Fw,Fw,Fw,F],
      [F,Fw,Fw,Fw,Fw,Fw,Ep,E,Fw,F],
      [F,Fw,Fd,Fd,Fw,Fw,Ep,Ep,Fw,F],
      [F,Fw,Fw,Fw,Fp,Fp,Fw,Fw,Fw,F],
      [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
      [_,F,F,Fw,Fw,Fw,Fw,F,F,_],
      [_,F,F,F,F,F,F,F,F,_],
      [_,_,F,F,F,F,F,F,_,_],
      [_,_,_,_,_,_,_,_,_,_],
      [_,_,_,_,_,_,_,_,_,_],
    ],
    // Love — eyes closed, head dips (click reaction when awake)
    love: [
      [_,F,_,_,_,_,_,_,F,_],
      [F,Fp,F,F,F,F,F,F,Fp,F],
      [F,Fw,Fw,Fw,Fw,Fw,Fw,Fw,Fw,F],
      [F,Fw,Fw,Fw,Fw,Fw,Fw,Fw,Fw,F],
      [F,Fw,Fd,Fd,Fw,Fw,Fd,Fd,Fw,F],
      [F,Fw,Fw,Fw,Fp,Fp,Fw,Fw,Fw,F],
      [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
      [_,F,F,Fw,Fw,Fw,Fw,F,F,_],
      [_,F,Fw,Fw,Fw,Fw,Fw,Fw,F,_],
      [_,F,F,_,_,_,_,F,F,_],
      [_,_,_,_,_,_,_,_,_,_],
      [_,_,_,_,_,_,_,_,_,_],
    ],
    cols: 10, rows: 12
  }

  // Resolve tokens to colors
  const resolved = {}
  for (const [key, val] of Object.entries(sprites)) {
    if (Array.isArray(val)) {
      resolved[key] = val.map(row =>
        row.map(tok => R[tok] ?? null)
      )
    } else {
      resolved[key] = val
    }
  }
  resolved.colors = { primary: fur, dark: furDark, light: belly }
  return resolved
}

// =====================================================
//  CLAUDE MASCOT SPRITES (8x10)
// =====================================================
const CLAUDE = {
  idle: [
    [_,_,P,P,P,P,_,_],[_,P,P,P,P,P,P,_],[_,P,W,B,P,W,B,_],[_,P,P,P,P,P,P,_],
    [_,P,P,L,L,P,P,_],[_,_,P,P,P,P,_,_],[_,_,D,P,P,D,_,_],[_,P,D,P,P,D,P,_],
    [_,P,_,_,_,_,P,_],[_,_,_,_,_,_,_,_],
  ],
  listening: [
    [_,_,P,P,P,P,_,_],[_,P,P,P,P,P,P,_],[_,P,B,B,P,B,B,_],[_,P,P,P,P,P,P,_],
    [_,P,P,L,L,P,P,_],[_,_,P,P,P,P,_,_],[_,_,D,P,P,D,_,_],[_,P,D,P,P,D,P,_],
    [_,P,_,_,_,_,P,_],[_,_,_,_,_,_,_,_],
  ],
  studying1: [
    [_,_,P,P,P,P,_,_],[_,P,P,P,P,P,P,_],[_,P,W,B,P,W,B,_],[_,P,P,P,P,P,P,_],
    [_,P,P,P,P,P,P,_],[_,_,P,P,P,P,_,_],[_,_,D,P,P,D,_,_],[_,_,D,P,P,D,_,_],
    [_,_,P,_,_,P,_,_],[_,_,_,_,_,_,_,_],
  ],
  studying2: [
    [_,_,P,P,P,P,_,_],[_,P,P,P,P,P,P,_],[_,P,W,B,P,W,B,_],[_,P,P,P,P,P,P,_],
    [_,P,P,P,P,P,P,_],[_,_,P,P,P,P,_,_],[_,_,D,P,P,D,_,_],[_,_,D,P,P,D,_,_],
    [_,_,P,_,_,P,_,_],[_,_,_,_,_,_,_,_],
  ],
  dance1: [
    [_,_,P,P,P,P,_,_],[_,P,P,P,P,P,P,_],[_,P,B,W,P,B,W,_],[_,P,P,P,P,P,P,_],
    [_,P,P,L,L,P,P,_],[_,_,P,P,P,P,_,_],[_,P,D,P,P,D,_,_],[P,_,D,P,P,D,_,_],
    [_,_,P,_,_,P,_,_],[_,P,_,_,_,_,P,_],
  ],
  dance2: [
    [_,_,P,P,P,P,_,_],[_,P,P,P,P,P,P,_],[_,P,W,B,P,W,B,_],[_,P,P,P,P,P,P,_],
    [_,P,P,L,L,P,P,_],[_,_,P,P,P,P,_,_],[_,_,D,P,P,D,P,_],[_,_,D,P,P,D,_,P],
    [_,P,_,_,_,P,_,_],[_,_,P,_,_,_,P,_],
  ],
  sleeping: [
    [_,_,P,P,P,P,_,_],[_,P,P,P,P,P,P,_],[_,P,B,B,P,B,B,_],[_,P,P,P,P,P,P,_],
    [_,P,P,P,P,P,P,_],[_,_,P,P,P,P,_,_],[_,_,D,P,P,D,_,_],[_,_,D,P,P,D,_,_],
    [_,_,P,_,_,P,_,_],[_,_,_,_,_,_,_,_],
  ],
  vibing1: [
    [_,P,P,P,P,P,P,_],[P,P,P,P,P,P,P,P],[P,P,W,B,P,W,B,P],[P,P,P,P,P,P,P,P],
    [_,P,L,L,L,L,P,_],[_,_,P,P,P,P,_,_],[P,_,D,P,P,D,_,P],[_,P,D,P,P,D,P,_],
    [_,_,P,_,_,P,_,_],[_,P,_,_,_,_,P,_],
  ],
  vibing2: [
    [_,P,P,P,P,P,P,_],[P,P,P,P,P,P,P,P],[P,P,B,W,P,B,W,P],[P,P,P,P,P,P,P,P],
    [_,P,L,L,L,L,P,_],[_,_,P,P,P,P,_,_],[P,_,D,P,P,D,_,P],[_,P,D,P,P,D,P,_],
    [_,P,_,_,_,_,P,_],[_,_,_,_,_,P,_,_],
  ],
  cols: 8, rows: 10,
  colors: { primary: P, dark: D, light: L }
}

// =====================================================
//  ANIMATION STATE
// =====================================================

function getState(level, bass, treble, silenceFrames, beatPhase) {
  if (level < 0.06) return { key: 'sleeping', scale: 1 }
  if (level < 0.15) return { key: 'listening', scale: 1 }

  const allMaxed = getAllChannelsMaxed()

  if (!allMaxed) {
    if (bass > treble) {
      return { key: Math.floor(beatPhase * 1.2) % 2 === 0 ? 'studying1' : 'studying2', scale: 1 }
    }
    return { key: 'studying1', scale: 1 }
  }

  // All channels at level 5
  if (level < 0.45) {
    return { key: Math.floor(beatPhase * 1.5) % 2 === 0 ? 'dance1' : 'dance2', scale: 1 }
  }
  return {
    key: Math.floor(beatPhase * 2) % 2 === 0 ? 'vibing1' : 'vibing2',
    scale: 1 + Math.min(level, 0.6) * 0.06
  }
}

function getMotion(k, level, bp, t) {
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
    wink: { bx: 0, by: Math.sin(t * 1.5) * 0.5 },
    love: { bx: 0, by: Math.sin(t * 4) * 0.8 + 2 },
  }
  return m[k] || { bx: 0, by: 0 }
}

// =====================================================
//  CUSTOMIZATION PANEL (colors only)
// =====================================================
function CatCustomizer({ config, onChange, onClose }) {
  const { presetIdx } = config
  return (
    <div
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 rounded-xl w-[200px] z-50"
      style={{
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] font-medium text-[#86868b] tracking-wider uppercase">
          Customize
        </span>
        <button onClick={onClose} className="text-[#aeaeb2] hover:text-[#86868b] text-xs">✕</button>
      </div>

      <p className="font-mono text-[8px] text-[#aeaeb2] tracking-wider uppercase mb-1">Fur</p>
      <div className="flex flex-wrap gap-1.5">
        {CAT_PRESETS.map((p, i) => (
          <button
            key={i}
            onClick={() => onChange({ presetIdx: i })}
            className="w-5 h-5 rounded-full active:scale-90 transition-transform"
            style={{
              background: p.fur,
              boxShadow: presetIdx === i
                ? `0 0 0 1.5px white, 0 0 0 3px ${p.fur}`
                : '0 0 0 0.5px rgba(0,0,0,0.1)'
            }}
            title={p.name}
          />
        ))}
      </div>
    </div>
  )
}

// =====================================================
//  MAIN COMPONENT
// =====================================================
export default function PixelMascot() {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const [catConfig, setCatConfig] = useState(loadCatConfig)
  const [showCustom, setShowCustom] = useState(false)
  const closeTimer = useRef(null)
  const catConfigRef = useRef(catConfig)
  const clickReaction = useRef(null) // { type: 'wink'|'love', endFrame: number }
  const frameCountRef = useRef(0)

  const triggerClick = () => {
    const isSleeping = getAverageLevel() < 0.06
    clickReaction.current = {
      type: isSleeping ? 'wink' : 'love',
      endFrame: frameCountRef.current + 90
    }
  }

  useEffect(() => {
    catConfigRef.current = catConfig
    localStorage.setItem('cat-config', JSON.stringify(catConfig))
    window.dispatchEvent(new CustomEvent('cat-config-change', { detail: catConfig }))
  }, [catConfig])

  // Listen for click from widget
  useEffect(() => {
    const cleanup = window.electron?.onMascotClick(() => triggerClick())
    return () => cleanup?.()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false

    const PX = 5
    const CW = 10 * PX + 40, CH = 12 * PX + 30
    canvas.width = CW
    canvas.height = CH

    let frameCount = 0, silenceFrames = 0, beatPhase = 0

    function drawSprite(sprite, ox, oy, scale) {
      for (let r = 0; r < sprite.length; r++) {
        for (let c = 0; c < sprite[r].length; c++) {
          const color = sprite[r][c]
          if (!color) continue
          ctx.fillStyle = color
          ctx.fillRect(
            Math.round(ox + c * PX * scale),
            Math.round(oy + r * PX * scale),
            Math.ceil(PX * scale), Math.ceil(PX * scale)
          )
        }
      }
    }

    function drawZzz(sw, ox, t) {
      ctx.fillStyle = G
      ctx.globalAlpha = 0.3 + Math.sin(t * 2) * 0.15
      for (let i = 0; i < 3; i++) {
        const x = ox + sw + 5 + i * 6 + Math.sin(t * 1.5 + i * 1.2) * 3
        const y = 12 - i * 10 + Math.sin(t + i) * 2
        const s = 3 - i * 0.5
        ctx.fillRect(Math.round(x), Math.round(y), Math.round(s * 2), 1)
        ctx.fillRect(Math.round(x + s * 2 - 1), Math.round(y), 1, Math.round(s))
        ctx.fillRect(Math.round(x), Math.round(y + s), Math.round(s * 2), 1)
      }
      ctx.globalAlpha = 1
    }

    function drawNotes(sw, ox, oy, t, level, col) {
      ctx.globalAlpha = level * 0.4
      ctx.fillStyle = col
      for (let i = 0; i < Math.floor(level * 4) + 1; i++) {
        const nx = ox + sw + 2 + Math.sin(t * 2 + i * 1.5) * 8
        const ny = oy - 5 - i * 8 + Math.sin(t * 3 + i) * 3
        ctx.fillRect(Math.round(nx), Math.round(ny), 3, 3)
        ctx.fillRect(Math.round(nx + 3), Math.round(ny - 4), 1, 5)
      }
      ctx.globalAlpha = 1
    }

    function drawTail(ox, oy, t, key, PX, furColor, furDarkColor) {
      // Tail base: right side of body, row 9 (feet level)
      const isSleeping = key === 'sleeping' || key === 'wink'
      const baseX = isSleeping ? 6 : 8  // sleeping: wraps under body, awake: right side
      const baseY = 9

      // Sway amount depends on state
      let swaySpeed, swayAmount
      if (isSleeping) {
        swaySpeed = 0.8
        swayAmount = 0.4
      } else if (key === 'vibing1' || key === 'vibing2' || key === 'dance1' || key === 'dance2') {
        swaySpeed = 3
        swayAmount = 1.5
      } else {
        swaySpeed = 1.5
        swayAmount = 0.8
      }

      const sway = Math.sin(t * swaySpeed) * swayAmount

      if (isSleeping) {
        // Sleeping tail: curls around bottom, subtle movement
        const pixels = [
          { x: baseX + 1, y: baseY + 0.5 + sway * 0.3 },
          { x: baseX + 2, y: baseY + 0.8 + sway * 0.5 },
          { x: baseX + 3, y: baseY + 0.5 + sway * 0.7 },
        ]
        pixels.forEach((p, i) => {
          ctx.fillStyle = i === 2 ? furDarkColor : furColor
          ctx.fillRect(
            Math.round(ox + p.x * PX),
            Math.round(oy + p.y * PX),
            Math.ceil(PX), Math.ceil(PX)
          )
        })
      } else {
        // Awake tail: extends from right side, curves up and sways
        const pixels = [
          { x: baseX + 0.5, y: baseY + sway * 0.3 },
          { x: baseX + 1, y: baseY + 0.5 + sway * 0.6 },
          { x: baseX + 1.5, y: baseY + 1 + sway },
        ]
        pixels.forEach((p, i) => {
          ctx.fillStyle = i === 2 ? furDarkColor : furColor
          ctx.fillRect(
            Math.round(ox + p.x * PX),
            Math.round(oy + p.y * PX),
            Math.ceil(PX), Math.ceil(PX)
          )
        })
      }
    }

    function drawHearts(sw, ox, oy, t) {
      const preset = CAT_PRESETS[catConfigRef.current.presetIdx]
      ctx.globalAlpha = 0.4 + Math.sin(t * 3) * 0.15
      ctx.fillStyle = preset.pink
      for (let h = 0; h < 2; h++) {
        const hx = ox + sw + 2 + Math.sin(t * 1.5 + h * 2) * 5 + h * 8
        const hy = oy - 2 + Math.sin(t * 2 + h) * 3 - h * 6
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
      const level = getAverageLevel()
      const fd = getFrequencyData()
      const bass = fd.length > 4 ? (fd[0]+fd[1]+fd[2]+fd[3])/4/255 : 0
      const treble = fd.length > 40 ? (fd[20]+fd[30]+fd[40])/3/255 : 0

      beatPhase += 0.03 + level * 0.06
      frameCount++
      frameCountRef.current = frameCount
      const t = frameCount * 0.016
      if (level < 0.01) silenceFrames++; else silenceFrames = 0

      ctx.clearRect(0, 0, CW, CH)

      const sprites = makeCatSprites(CAT_PRESETS[catConfigRef.current.presetIdx])

      const sw = (sprites.cols || 8) * PX
      const sh = (sprites.rows || 10) * PX
      const state = getState(level, bass, treble, silenceFrames, beatPhase)

      // Check for click reaction override
      let renderKey = state.key
      let renderScale = state.scale
      const reaction = clickReaction.current
      if (reaction && frameCount < reaction.endFrame) {
        renderKey = reaction.type
        renderScale = 1
      } else if (reaction) {
        clickReaction.current = null
      }

      setMascotState(renderKey)

      // Send mascot state to widget at ~10fps
      if (frameCount % 6 === 0) {
        window.electron?.sendMascotUpdate({
          mascot: renderKey,
          catPreset: catConfigRef.current.presetIdx
        })
      }

      const motion = getMotion(renderKey, level, beatPhase, t)

      const ox = (CW - sw) / 2 + motion.bx + (sw - sw * renderScale) * 0.5
      const oy = (CH - sh) / 2 + motion.by + (sh - sh * renderScale) * 0.5

      const preset = CAT_PRESETS[catConfigRef.current.presetIdx]
      drawTail(ox, oy, t, renderKey, PX, preset.fur, preset.furDark)
      drawSprite(sprites[renderKey], ox, oy, renderScale)

      // Draw effects: only Zzz when sleeping, hearts on love click reaction
      if (renderKey === 'love') {
        drawHearts(sw, ox, oy, t)
      } else if (state.key === 'sleeping' && renderKey !== 'wink') {
        drawZzz(sw, ox, t)
      }

      animRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return (
    <div
      className="relative flex flex-col items-center gap-1"
      onMouseEnter={() => clearTimeout(closeTimer.current)}
      onMouseLeave={() => { closeTimer.current = setTimeout(() => setShowCustom(false), 300) }}
    >
      <canvas
        ref={canvasRef}
        onClick={triggerClick}
        className="cursor-pointer"
        style={{ imageRendering: 'pixelated', width: '80px', height: '90px' }}
      />

      <div className="relative h-5 flex items-center justify-center -mt-1 mb-1">
        <button
          onClick={() => setShowCustom(v => !v)}
          className="font-mono text-[8px] text-[#aeaeb2] hover:text-[#86868b] tracking-[0.15em] uppercase active:scale-95 transition-all duration-300 px-2 py-0.5 rounded-full absolute"
          style={{ opacity: showCustom ? 0 : 0.5, pointerEvents: showCustom ? 'none' : 'auto' }}
        >
          dress
        </button>

        <div
          className="flex flex-col items-center gap-0.5 absolute transition-all duration-300 ease-in-out"
          style={{
            opacity: showCustom ? 1 : 0,
            transform: showCustom ? 'scale(1)' : 'scale(0.8)',
            pointerEvents: showCustom ? 'auto' : 'none',
          }}
        >
          <span className="font-mono text-[8px] text-[#aeaeb2] tracking-[0.15em] uppercase" style={{ opacity: 0.5 }}>
            {CAT_PRESETS[catConfig.presetIdx]?.name}
          </span>
          <div className="flex gap-1">
            {CAT_PRESETS.map((p, i) => (
              <button
                key={i}
                onClick={() => setCatConfig({ presetIdx: i })}
                className="w-4 h-4 rounded-full active:scale-90 transition-transform"
                style={{
                  background: p.fur,
                  boxShadow: catConfig.presetIdx === i
                    ? `0 0 0 1.5px white, 0 0 0 3px ${p.fur}`
                    : '0 0 0 0.5px rgba(0,0,0,0.15)'
                }}
                title={p.name}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
