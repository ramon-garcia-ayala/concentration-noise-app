import { useEffect, useRef } from 'react'
import { getChannelVolumes, getAudioMuted } from '../audioBus'

// Wave definitions — each channel is a flowing wave, confined to the BOTTOM half
const WAVE_CHANNELS = [
  { id: 'sub',    color: [224,122,47],  speed: 0.12, waveLen: 0.4, yBase: 0.85 },
  { id: 'low',    color: [212,99,29],   speed: 0.15, waveLen: 0.5, yBase: 0.80 },
  { id: 'lowmid', color: [194,85,15],   speed: 0.19, waveLen: 0.6, yBase: 0.75 },
  { id: 'mid',    color: [245,166,35],  speed: 0.22, waveLen: 0.7, yBase: 0.65 },
  { id: 'himid',  color: [255,149,0],   speed: 0.26, waveLen: 0.8, yBase: 0.60 },
  { id: 'pres',   color: [175,82,222],  speed: 0.30, waveLen: 0.9, yBase: 0.58 },
  { id: 'air',    color: [88,86,214],   speed: 0.35, waveLen: 1.0, yBase: 0.55 },
  { id: 'full',   color: [142,142,147], speed: 0.18, waveLen: 1.2, yBase: 0.65 },
]

const CHANNEL_PARTICLES = [
  { id: 'sub',    color: '#E07A2F', shape: 'square',  baseSize: 4, maxSize: 10 },
  { id: 'low',    color: '#D4631D', shape: 'rect',    baseSize: 3, maxSize: 8  },
  { id: 'lowmid', color: '#C2550F', shape: 'cluster', baseSize: 3, maxSize: 7  },
  { id: 'mid',    color: '#F5A623', shape: 'cross',   baseSize: 3, maxSize: 7  },
  { id: 'himid',  color: '#FF9500', shape: 'diamond', baseSize: 2, maxSize: 6  },
  { id: 'pres',   color: '#AF52DE', shape: 'dot',     baseSize: 2, maxSize: 5  },
  { id: 'air',    color: '#5856D6', shape: 'pixel',   baseSize: 1, maxSize: 3  },
  { id: 'full',   color: '#8E8E93', shape: 'square',  baseSize: 2, maxSize: 5  },
]

class Particle {
  constructor(w, h, style) {
    this.style = style
    this.reset(w, h, true)
  }

  reset(w, h, initial = false) {
    this.x = Math.random() * w
    // Particles spawn in the bottom half
    this.y = initial ? h * 0.5 + Math.random() * h * 0.5 : h * 0.7 + Math.random() * h * 0.3
    this.sizeFactor = Math.random() * 0.6 + 0.4
    this.size = this.style.baseSize
    this.opacity = 0
    this.targetOpacity = 0
    this.baseVx = (Math.random() - 0.5) * 0.3
    this.baseVy = -(Math.random() * 0.15 + 0.03)
    this.vx = this.baseVx
    this.vy = this.baseVy
    this.life = 1
    this.decay = Math.random() * 0.0015 + 0.0005
    this.angle = Math.random() * Math.PI * 2
    this.rotSpeed = (Math.random() - 0.5) * 0.008
    this.phase = Math.random() * Math.PI * 2
    this.freq = Math.random() * 0.008 + 0.002
  }

  update(w, h, level) {
    if (level <= 0) {
      this.targetOpacity = 0
      this.opacity += (0 - this.opacity) * 0.05
      return
    }

    const speedMult = 0.3 + level * 1.2

    this.targetOpacity = Math.min(level * 0.35, 0.3)
    this.opacity += (this.targetOpacity - this.opacity) * 0.06

    this.vx = this.baseVx * speedMult + Math.sin(this.phase) * level * 0.3
    this.vy = this.baseVy * speedMult

    this.x += this.vx
    this.y += this.vy
    this.phase += this.freq
    this.angle += this.rotSpeed * speedMult

    const sizeRange = this.style.maxSize - this.style.baseSize
    this.size = (this.style.baseSize + sizeRange * level) * this.sizeFactor

    this.life -= this.decay
    // Reset if out of bottom half or offscreen
    if (this.life <= 0 || this.y < h * 0.35 || this.x < -20 || this.x > w + 20) {
      this.reset(w, h)
    }
  }

  draw(ctx) {
    if (this.opacity < 0.005) return

    ctx.save()
    ctx.globalAlpha = this.opacity * Math.max(0.1, this.life)
    ctx.fillStyle = this.style.color
    ctx.translate(this.x, this.y)
    ctx.rotate(this.angle)

    const s = Math.max(1, Math.round(this.size))
    const half = s / 2

    switch (this.style.shape) {
      case 'square':
        ctx.fillRect(-half, -half, s, s)
        break
      case 'rect':
        ctx.fillRect(-half, -half * 0.6, s, s * 0.6)
        break
      case 'cluster': {
        const u = Math.max(1, s / 3)
        ctx.fillRect(-half, -half, u, u)
        ctx.fillRect(half - u, -half, u, u)
        ctx.fillRect(-half, half - u, u, u)
        ctx.fillRect(0, 0, u, u)
        break
      }
      case 'cross': {
        const u = Math.max(1, s / 4)
        ctx.fillRect(-u, -half, u * 2, s)
        ctx.fillRect(-half, -u, s, u * 2)
        break
      }
      case 'diamond':
        ctx.beginPath()
        ctx.moveTo(0, -half)
        ctx.lineTo(half, 0)
        ctx.lineTo(0, half)
        ctx.lineTo(-half, 0)
        ctx.closePath()
        ctx.fill()
        break
      case 'dot':
        ctx.beginPath()
        ctx.arc(0, 0, Math.max(1, half * 0.6), 0, Math.PI * 2)
        ctx.fill()
        break
      case 'pixel':
        ctx.fillRect(-1, -1, 2, 2)
        break
    }

    ctx.restore()
  }
}

export default function ParticleBackground() {
  const canvasRef = useRef(null)
  const poolRef = useRef([])
  const animRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let w, h

    function resize() {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    poolRef.current = CHANNEL_PARTICLES.map(style =>
      Array.from({ length: 12 }, () => new Particle(w, h, style))
    )

    let waveTime = 0
    let globalFade = 1 // 1 = fully visible, 0 = fully hidden

    // Detect dark mode by checking root element background
    function isDark() {
      const bg = getComputedStyle(document.querySelector('#root > div')).backgroundColor
      return bg && !bg.includes('255')
    }

    function drawWaves(vols) {
      waveTime += 0.006

      for (let wi = 0; wi < WAVE_CHANNELS.length; wi++) {
        const wave = WAVE_CHANNELS[wi]
        const level = vols[wave.id] || 0
        if (level < 0.01) continue

        const [r, g, b] = wave.color
        const alpha = level * 0.08

        // Centers stay in the bottom half — no hard clip, natural gradient falloff
        const cx = w * (0.5 + Math.sin(waveTime * wave.speed + wi * 1.1) * 0.5)
        const cy = h * (wave.yBase + Math.sin(waveTime * wave.speed * 0.7 + wi * 0.8) * 0.08)
        const pulse = 1 + Math.sin(waveTime * wave.speed * 1.5 + wi * 2) * 0.15
        // Smaller radius so gradients don't reach the top half
        const radius = Math.min(w, h) * (0.25 + level * 0.2) * pulse

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
        grad.addColorStop(0, `rgba(${r},${g},${b},${alpha * 2})`)
        grad.addColorStop(0.3, `rgba(${r},${g},${b},${alpha * 1.2})`)
        grad.addColorStop(0.6, `rgba(${r},${g},${b},${alpha * 0.4})`)
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`)

        ctx.globalAlpha = 1
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)
      }
    }

    function animate() {
      const muted = getAudioMuted()
      const rawVols = getChannelVolumes()
      const hasSound = Object.values(rawVols).some(v => v > 0)
      const dark = isDark()

      // Smooth fade: ease toward 1 when playing, toward 0 when muted
      const targetFade = (muted || !hasSound) ? 0 : 1
      globalFade += (targetFade - globalFade) * 0.03

      // Scale volumes by global fade for smooth visual transition
      const vols = {}
      for (const k of Object.keys(rawVols)) {
        vols[k] = (rawVols[k] || 0) * globalFade
      }

      // Soft clear
      ctx.globalAlpha = 1
      ctx.fillStyle = dark ? 'rgba(44, 44, 46, 0.18)' : 'rgba(255, 255, 255, 0.18)'
      ctx.fillRect(0, 0, w, h)

      // Draw flowing color waves (bottom half only)
      if (globalFade > 0.005) {
        drawWaves(vols)
      }

      // Particles (also bottom-biased via their reset logic)
      CHANNEL_PARTICLES.forEach((style, ci) => {
        const level = vols[style.id] || 0
        const particles = poolRef.current[ci]
        for (const p of particles) {
          p.update(w, h, level)
          p.draw(ctx)
        }
      })

      ctx.globalAlpha = 1
      animRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
