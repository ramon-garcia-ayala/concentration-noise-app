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
- Media detection via PowerShell + WinRT (Windows-specific). Script uses reflection-based `AsTask` generic resolution and `-EncodedCommand` (base64 UTF-16LE) to avoid JS template literal and quote conflicts
- System volume control via native `resources/setvol.exe` (raw COM vtable access, bypasses .NET marshalling issues)
- IPC relay pattern: widget ↔ main process ↔ renderer (e.g., `toggle-timer`, `set-master-volume` channels)

### Renderer (`src/renderer/src/`)
- **App.jsx** — Root layout with ThemeProvider, collapsible timer panel, responsive flex layout
- **ThemeContext.jsx** — Dark/light mode context, persisted to localStorage
- **audioBus.js** — Central audio routing. All Web Audio nodes connect through a shared `GainNode → AnalyserNode → destination` chain. Exports: channel volume tracking, massage mode (interval-based LFO), mute toggle, mascot state (`getMascotState`/`setMascotState` — shared global so any component can read the current cat animation state)
- **Components:**
  - `SoundMixer` — 8-channel noise synthesizer (brown noise for bass, pink for everything else). Vertical fader EQ. Preset save/load system with auto-generated names. Master volume slider. Massage toggle. Dynamic mode (sine-wave animation of sliders). Perceptual loudness via `GAIN_SCALE` attenuation curve. My Presets button in header next to Massage
  - `PomodoroTimer` — Circular SVG timer with custom presets + Infinite Flow mode (counts up). Workflow engine with multi-step focus/break/rest cycles. Audio mute/unmute is coupled to timer start/stop (always mutes on pause). Uses `toggleRef` pattern to avoid stale closures in IPC listeners. Sends `timer-update` IPC with full state (time, color, mascot, totalSeconds, infinite, masterVolume) for widget sync. Mood presets from DailyMood are tagged `isMood: true` — only one exists at a time, replaced on new mood selection, animated out (fade + shrink over 700ms) when selecting a regular preset
  - `PixelMascot` — Kawaii pixel cat (10x12 grid). Token-based sprite system (F/Fd/Fw/Fp/E/Ep). 8 cat color presets (persisted to localStorage as `cat-config`). Reacts to audio levels and updates `setMascotState()` each frame
  - `Widget` — Floating overlay (`src/renderer/src/components/Widget.jsx`). Duplicates all cat sprites and motion functions from PixelMascot (must be kept in sync manually). Has animated SVG progress border (inside panel div, not outer container). Play/pause via `toggleTimer` IPC. Circular volume knob controls app master volume (scroll or drag), synced bidirectionally via `set-master-volume` IPC
  - `ParticleBackground` — Canvas-based: radial gradient color waves (bottom half only) + per-channel particles. Uses `globalFade` multiplier (interpolates 0↔1 at rate 0.03) for smooth fade in/out when timer pauses/plays. Dark mode clear color: `#2c2c2e`
  - `DailyMood` — 30 mood presets cycling monthly, each with timer + EQ configuration
  - `MediaPlayer` — Shows currently playing media from system (YouTube, Spotify). Collapsed tab with canvas wave animation (3 layered sine waves, smooth amplitude fade). Dropdown panel with album art, playback controls, system volume slider. Controls via main process IPC (`media-control` for keys, `set-system-volume` for volume via `setvol.exe`). Auto-closes on mouse leave (300ms delay with bridge div)
  - `TitleBar` — macOS-style traffic lights + dark/light mode toggle

### Audio Pipeline
Noise synthesis → optional BiquadFilter → per-channel GainNode → shared bus GainNode → AnalyserNode → AudioContext.destination

High frequencies are attenuated via GAIN_SCALE: `sub:1.0 → air:0.14` to avoid harshness.

### IPC Channels (`src/main/preload.js`)
- `timer-update` — PomodoroTimer → main → Widget (timer state, progress, mascot, masterVolume)
- `toggle-timer` — Widget → main → PomodoroTimer (remote play/pause)
- `set-master-volume` — Widget → main → PomodoroTimer/SoundMixer (volume sync)
- `media-update` / `media-control` — System media info polling and playback keys
- `set-system-volume` — MediaPlayer → main → setvol.exe (Windows system volume)
- `open-widget` / `close-widget` — Widget window lifecycle
- All `on*` listeners return cleanup functions for React StrictMode compatibility

### Styling
- Tailwind CSS 3 with responsive breakpoints (`md:` for desktop)
- JetBrains Mono for UI text
- All components support dark/light mode via `useTheme()` hook
- Dark mode background: `#2c2c2e` (soft dark, not pure black)

### Key Patterns
- **toggleRef**: Mutable ref holding latest toggle function, assigned every render. IPC listeners call `toggleRef.current()` to avoid capturing stale closures from initial mount
- **IPC cleanup**: All `on*` preload methods return a removal function. Effects must use `return () => cleanup?.()` to prevent double-registration under React StrictMode (which causes toggle-twice = no-op bugs)
- **globalFade**: Module-level variable in ParticleBackground that smoothly interpolates toward target (0 or 1) each animation frame, applied as multiplier to all channel volumes before rendering
- **Sprite duplication**: Widget.jsx contains its own copy of all cat sprites and motion logic from PixelMascot.jsx — changes to one must be mirrored in the other
- **Mood preset lifecycle**: Tagged with `isMood: true`, only one at a time. Animated out via `moodFading` state (CSS transitions 600ms + setTimeout 700ms removal)

### Assets
- `resources/icon.ico` — Orange sleeping cat pixel art, multi-resolution (16–256px). Used as app window icon and desktop shortcut icon
- `resources/setvol.exe` — Native C# executable for Windows system volume control via raw WASAPI COM vtable access. Source: `resources/setvol.cs`
- `generate-icon.js` — Script to regenerate the ICO from sprite data

### Important constraints
- **Never move the timer from its position** — user explicitly forbids repositioning the timer panel
- The michi (cat mascot) should be centered between the bottom border and the last timer element
