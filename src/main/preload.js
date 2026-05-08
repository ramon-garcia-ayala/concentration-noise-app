const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  openWidget: () => ipcRenderer.send('open-widget'),
  closeWidget: () => ipcRenderer.send('close-widget'),
  toggleTimer: () => ipcRenderer.send('toggle-timer'),
  onToggleTimer: (cb) => {
    const handler = (_, ...args) => cb(...args)
    ipcRenderer.on('toggle-timer', handler)
    return () => ipcRenderer.removeListener('toggle-timer', handler)
  },
  sendTimerUpdate: (data) => ipcRenderer.send('timer-update', data),
  onTimerUpdate: (cb) => {
    const handler = (_, data) => cb(data)
    ipcRenderer.on('timer-update', handler)
    return () => ipcRenderer.removeListener('timer-update', handler)
  },
  closeApp: () => ipcRenderer.send('close-app'),
  minimizeApp: () => ipcRenderer.send('minimize-app'),
  onMediaUpdate: (cb) => {
    const handler = (_, data) => cb(data)
    ipcRenderer.on('media-update', handler)
    return () => ipcRenderer.removeListener('media-update', handler)
  },
  mediaControl: (key) => ipcRenderer.send('media-control', key),
  setSystemVolume: (level) => ipcRenderer.send('set-system-volume', level),
  setMasterVolume: (level) => ipcRenderer.send('set-master-volume', level),
  onSetMasterVolume: (cb) => {
    const handler = (_, level) => cb(level)
    ipcRenderer.on('set-master-volume', handler)
    return () => ipcRenderer.removeListener('set-master-volume', handler)
  }
})
