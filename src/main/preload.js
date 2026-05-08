const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  openWidget: () => ipcRenderer.send('open-widget'),
  closeWidget: () => ipcRenderer.send('close-widget'),
  toggleTimer: () => ipcRenderer.send('toggle-timer'),
  onToggleTimer: (cb) => ipcRenderer.on('toggle-timer', () => cb()),
  sendTimerUpdate: (data) => ipcRenderer.send('timer-update', data),
  onTimerUpdate: (cb) => ipcRenderer.on('timer-update', (_, data) => cb(data)),
  closeApp: () => ipcRenderer.send('close-app'),
  minimizeApp: () => ipcRenderer.send('minimize-app'),
  onMediaUpdate: (cb) => ipcRenderer.on('media-update', (_, data) => cb(data)),
  mediaControl: (key) => ipcRenderer.send('media-control', key)
})
