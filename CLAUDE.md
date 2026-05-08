# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run

```bash
npm run dev          # Start Electron + Vite dev server
npm run build        # Production build
```

Or use `Launch App.bat` in the project root.

## Architecture

**Electron + React 18 + Vite** desktop app for concentration noise/white noise generation with an Apple-inspired UI.

### Main Process (`src/main/index.js`)
- Electron window management (frameless, custom title bar, icon: `resources/icon.ico`)
- Timer widget (BrowserWindow overlay, always-on-top, transparent)
- Media detection via PowerShell + WinRT (Windows-specific)
- IPC relay pattern: widget ↔ main process ↔ renderer (e.g., `toggle-timer` channel)

### Renderer (`src/renderer/src/`)
- **App.jsx** — Root layout with ThemeProvider, collapsible timer panel, responsive flex layout
- **ThemeContext.jsx** — Dark/light mode context, persisted to localStorage
- **audioBus.js** — Central audio routing. All Web Audio nodes connect through a shared `GainNode → AnalyserNode → destination` chain. Exports: channel volume tracking, massage mode (interval-based LFO), mute toggle, mascot state (`getMascotState`/`setMascotState` — shared global so any component can read the current cat animation state)
- **Components:**
  - `SoundMixer` — 8-channel noise synthesizer (brown noise for bass, pink for everything else). Vertical fader EQ. Preset save/load system with auto-generated names. Massage toggle. Dynamic mode (sine-wave animation of sliders). Perceptual loudness via `GAIN_SCALE` attenuation curve
  - `PomodoroTimer` — Circular SVG timer with custom presets + Infinite Flow mode (counts up). Audio mute/unmute is coupled to timer start/stop. Uses `toggleRef` pattern to avoid stale closures in IPC listeners. Sends `timer-update` IPC with full state (time, color, mascot, totalSeconds, infinite) for widget sync
  - `PixelMascot` — Kawaii pixel cat (10x12 grid). Token-based sprite system (F/Fd/Fw/Fp/E/Ep). 8 cat color presets (persisted to localStorage as `cat-config`). Reacts to audio levels and updates `setMascotState()` each frame
  - `Widget` — Floating overlay (`src/renderer/src/components/Widget.jsx`). Duplicates all cat sprites and motion functions from PixelMascot (must be kept in sync manually). Has animated SVG progress border. Play/pause via `toggleTimer` IPC
  - `ParticleBackground` — Canvas-based: radial gradient color waves (bottom half only) + per-channel particles. Uses `globalFade` multiplier (interpolates 0↔1 at rate 0.03) for smooth fade in/out when timer pauses/plays. Dark mode clear color: `#2c2c2e`
  - `DailyMood` — 30 mood presets cycling monthly, each with timer + EQ configuration
  - `MediaPlayer` — Shows currently playing media from system (YouTube, Spotify). Controls via main process IPC
  - `TitleBar` — macOS-style traffic lights + dark/light mode toggle

### Audio Pipeline
Noise synthesis → optional BiquadFilter → per-channel GainNode → shared bus GainNode → AnalyserNode → AudioContext.destination

High frequencies are attenuated via GAIN_SCALE: `sub:1.0 → air:0.14` to avoid harshness.

### IPC Channels (`src/main/preload.js`)
- `timer-update` — PomodoroTimer → main → Widget (timer state, progress, mascot)
- `toggle-timer` — Widget → main → PomodoroTimer (remote play/pause)
- `media-update` / `media-control` — System media info polling and playback keys
- `open-widget` / `close-widget` — Widget window lifecycle

### Styling
- Tailwind CSS 3 with responsive breakpoints (`md:` for desktop)
- JetBrains Mono for UI text
- All components support dark/light mode via `useTheme()` hook
- Dark mode background: `#2c2c2e` (soft dark, not pure black)

### Key Patterns
- **toggleRef**: Mutable ref holding latest toggle function, assigned every render. IPC listeners call `toggleRef.current()` to avoid capturing stale closures from initial mount
- **globalFade**: Module-level variable in ParticleBackground that smoothly interpolates toward target (0 or 1) each animation frame, applied as multiplier to all channel volumes before rendering
- **Sprite duplication**: Widget.jsx contains its own copy of all cat sprites and motion logic from PixelMascot.jsx — changes to one must be mirrored in the other

### Assets
- `resources/icon.ico` — Orange sleeping cat pixel art, multi-resolution (16–256px). Used as app window icon and desktop shortcut icon
- `generate-icon.js` — Script to regenerate the ICO from sprite data
