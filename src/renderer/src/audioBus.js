// Shared audio bus — all sounds connect here so the visualizer can read frequency data
let audioCtx = null
let analyser = null
let gainNode = null

export function getAudioBus() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.8
    gainNode = audioCtx.createGain()
    gainNode.gain.value = 1
    gainNode.connect(analyser)
    analyser.connect(audioCtx.destination)
  }
  return { audioCtx, analyser, gainNode }
}

export function getFrequencyData() {
  if (!analyser) return new Uint8Array(128).fill(0)
  const data = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteFrequencyData(data)
  return data
}

export function getAverageLevel() {
  const data = getFrequencyData()
  if (data.length === 0) return 0
  let sum = 0
  for (let i = 0; i < data.length; i++) sum += data[i]
  return sum / data.length / 255
}

// Channel volume tracking — SoundMixer reports volumes here
let channelVolumes = {}

export function setChannelVolumes(vols) {
  channelVolumes = { ...vols }
}

export function getAllChannelsMaxed() {
  const vals = Object.values(channelVolumes)
  if (vals.length === 0) return false
  return vals.every(v => v >= 1.0)
}

export function getActiveChannelCount() {
  return Object.values(channelVolumes).filter(v => v > 0).length
}

export function getChannelVolumes() {
  return channelVolumes
}

// ── Master volume ──
let masterVolume = 1

export function setMasterVolume(vol) {
  masterVolume = vol
  const { audioCtx: ctx, gainNode } = getAudioBus()
  gainNode.gain.setTargetAtTime(isMuted ? 0 : vol, ctx.currentTime, 0.08)
}

export function getMasterVolume() { return masterVolume }

// ── Master play/stop — fades gain to 0 or back ──
let isMuted = false

export function setAudioMuted(muted) {
  const { audioCtx: ctx, gainNode } = getAudioBus()
  isMuted = muted
  gainNode.gain.setTargetAtTime(muted ? 0 : masterVolume, ctx.currentTime, 0.3)
}

export function getAudioMuted() { return isMuted }

// ── Mascot state — shared so timer can send to widget ──
let mascotState = 'sleeping'
export function setMascotState(state) { mascotState = state }
export function getMascotState() { return mascotState }

// ── Massage mode — zig-zag LFO per channel gain ──
// Each channel's gain is modulated at a slightly different phase/speed
// creating a wave that rolls across the frequency spectrum
let massageInterval = null
let massageChannelGains = null  // map of id -> { node, baseVol }
let massagePhase = 0

export function setMassageMode(enabled, channelGains) {
  if (enabled && !massageInterval) {
    massagePhase = 0
    massageChannelGains = channelGains  // { id: { gainNode, scale, volume } }
    massageInterval = setInterval(() => {
      massagePhase += 0.04
      if (!massageChannelGains) return
      const ids = ['sub','low','lowmid','mid','himid','pres','air','full']
      ids.forEach((id, i) => {
        const ch = massageChannelGains[id]
        if (!ch || ch.volume <= 0) return
        // Each channel oscillates with a phase offset — creates rolling wave
        const offset = (i / ids.length) * Math.PI * 2
        const wave = Math.sin(massagePhase + offset) * 0.35 + Math.sin(massagePhase * 1.7 + offset) * 0.15
        const newGain = Math.max(0.05, ch.volume + wave * ch.volume)
        ch.gainNode.gain.setTargetAtTime(newGain * ch.scale, ch.gainNode.context.currentTime, 0.08)
      })
    }, 40)
  } else if (!enabled && massageInterval) {
    clearInterval(massageInterval)
    massageInterval = null
    // Restore original gains
    if (massageChannelGains) {
      Object.values(massageChannelGains).forEach(ch => {
        if (!ch || ch.volume <= 0) return
        ch.gainNode.gain.setTargetAtTime(ch.volume * ch.scale, ch.gainNode.context.currentTime, 0.15)
      })
    }
    massageChannelGains = null
  }
}

export function updateMassageGains(channelGains) {
  if (massageInterval) massageChannelGains = channelGains
}
