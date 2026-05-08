import { useEffect, useRef, useState } from 'react'
import { getFrequencyData, getAverageLevel, getAllChannelsMaxed, setMascotState } from '../audioBus'

const P = '#E07A2F', D = '#C2550F', L = '#F5C28A'
const W = '#FFFFFF', B = '#1d1d1f', G = '#86868b'
const _ = null

// Cat sprite tokens: F=fur, Fd=furDark, Fw=belly/white, Fp=pink, E=eyeHighlight, Ep=pupil
const F = 'F', Fd = 'Fd', Fw = 'Fw', Fp = 'Fp', E = 'E', Ep = 'Ep'

// Realistic cat color presets
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
      [_,_,_,_,_,_,_,_,F,F],
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
      [_,_,_,_,_,_,F,F,_,_],
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
      [_,_,_,_,_,_,_,_,F,F],
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
      [_,_,_,_,_,F,F,_,_,_],
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
      [_,_,_,_,_,_,_,_,_,F],
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
      [F,_,_,_,_,_,_,_,_,_],
    ],
    // Sleeping — same kawaii head, closed eyes, relaxed body
    sleeping: [
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
      [_,_,_,_,_,_,_,_,F,F],
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
      [F,F,_,_,_,_,_,_,_,_],
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
  const catConfigRef = useRef(catConfig)

  useEffect(() => {
    catConfigRef.current = catConfig
    localStorage.setItem('cat-config', JSON.stringify(catConfig))
  }, [catConfig])

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
      const t = frameCount * 0.016
      if (level < 0.01) silenceFrames++; else silenceFrames = 0

      ctx.clearRect(0, 0, CW, CH)

      const sprites = makeCatSprites(CAT_PRESETS[catConfigRef.current.presetIdx])

      const sw = (sprites.cols || 8) * PX
      const sh = (sprites.rows || 10) * PX
      const state = getState(level, bass, treble, silenceFrames, beatPhase)
      setMascotState(state.key)
      const motion = getMotion(state.key, level, beatPhase, t)

      const ox = (CW - sw) / 2 + motion.bx + (sw - sw * state.scale) * 0.5
      const oy = (CH - sh) / 2 + motion.by + (sh - sh * state.scale) * 0.5

      drawSprite(sprites[state.key], ox, oy, state.scale)

      if (state.key === 'sleeping') {
        drawZzz(sw, ox, t)
      } else if (level > 0.15) {
        drawHearts(sw, ox, oy, t)
        drawNotes(sw, ox, oy, t, level, sprites.colors.primary)
      }

      if (level > 0.35) {
        const cols = [sprites.colors.primary, sprites.colors.dark, sprites.colors.light, CAT_PRESETS[catConfigRef.current.presetIdx].pink]
        for (let i = 0; i < Math.floor(level * 6); i++) {
          ctx.globalAlpha = Math.random() * 0.25 + 0.05
          ctx.fillStyle = cols[Math.floor(Math.random() * cols.length)]
          ctx.fillRect(
            Math.round(ox + sw * 0.5 + (Math.random() - 0.5) * sw * 2),
            Math.round(oy + sh * 0.3 + (Math.random() - 0.5) * sh * 1.5),
            Math.round(Math.random() * 3 + 1),
            Math.round(Math.random() * 3 + 1)
          )
        }
        ctx.globalAlpha = 1
      }

      animRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return (
    <div className="relative flex flex-col items-center gap-1">
      <canvas
        ref={canvasRef}
        onClick={() => setShowCustom(v => !v)}
        className="cursor-pointer"
        style={{ imageRendering: 'pixelated', width: '80px', height: '90px' }}
      />

      {showCustom && (
        <CatCustomizer
          config={catConfig}
          onChange={setCatConfig}
          onClose={() => setShowCustom(false)}
        />
      )}

      <button
        onClick={() => setShowCustom(v => !v)}
        className="font-mono text-[8px] text-[#aeaeb2] hover:text-[#86868b] tracking-[0.15em] uppercase active:scale-95 transition-colors px-2 py-0.5 rounded-full"
        style={{ opacity: 0.5 }}
      >
        dress
      </button>
    </div>
  )
}
