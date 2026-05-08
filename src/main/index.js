const { app, BrowserWindow, ipcMain } = require('electron')
const { execSync, exec } = require('child_process')
const path = require('path')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow
let widgetWindow
let mediaInterval = null

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 680,
    minWidth: 750,
    minHeight: 520,
    backgroundColor: '#ffffff',
    titleBarStyle: 'hiddenInset',
    frame: false,
    icon: path.join(__dirname, '../../resources/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'))
  }

  // Start polling media sessions
  startMediaPolling()

  mainWindow.on('closed', () => {
    if (mediaInterval) clearInterval(mediaInterval)
  })
}

// PowerShell script to read Windows media session info via WinRT
const PS_MEDIA_SCRIPT = `
try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime] | Out-Null
  [Windows.Media.Control.GlobalSystemMediaTransportControlsSession,Windows.Media.Control,ContentType=WindowsRuntime] | Out-Null
  $asyncOp = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
  $typeName = 'WindowsRuntimeSystemExtensions'
  $null = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 }
  $task = [System.WindowsRuntimeSystemExtensions]::AsTask($asyncOp)
  $task.Wait()
  $mgr = $task.Result
  $session = $mgr.GetCurrentSession()
  if ($null -eq $session) { Write-Output '{}'; exit }
  $mediaTask = [System.WindowsRuntimeSystemExtensions]::AsTask($session.TryGetMediaPropertiesAsync())
  $mediaTask.Wait()
  $media = $mediaTask.Result
  $playback = $session.GetPlaybackInfo()
  $appId = $session.SourceAppUserModelId
  $appName = $appId
  if ($appId -match 'Spotify') { $appName = 'Spotify' }
  elseif ($appId -match 'chrome' -or $appId -match 'Chrome') { $appName = 'Chrome' }
  elseif ($appId -match 'msedge' -or $appId -match 'Edge') { $appName = 'Edge' }
  elseif ($appId -match 'firefox' -or $appId -match 'Firefox') { $appName = 'Firefox' }
  elseif ($appId -match 'brave' -or $appId -match 'Brave') { $appName = 'Brave' }
  elseif ($appId -match 'opera' -or $appId -match 'Opera') { $appName = 'Opera' }
  $result = @{
    title = $media.Title
    artist = $media.Artist
    album = $media.AlbumTitle
    status = $playback.PlaybackStatus.ToString()
    app = $appName
    appId = $appId
  } | ConvertTo-Json -Compress
  Write-Output $result
} catch {
  Write-Output '{}'
}
`.replace(/\n/g, ' ')

function getMediaInfo() {
  return new Promise((resolve) => {
    exec(
      `powershell -NoProfile -NonInteractive -Command "${PS_MEDIA_SCRIPT}"`,
      { timeout: 3000, windowsHide: true },
      (err, stdout) => {
        if (err || !stdout.trim()) return resolve(null)
        try {
          const data = JSON.parse(stdout.trim())
          if (data.title) resolve(data)
          else resolve(null)
        } catch {
          resolve(null)
        }
      }
    )
  })
}

function sendMediaKey(key) {
  // VK codes: PlayPause=0xB3, Next=0xB0, Prev=0xB1, Stop=0xB2
  const vkMap = { playpause: '0xB3', next: '0xB0', prev: '0xB1', stop: '0xB2' }
  const vk = vkMap[key]
  if (!vk) return
  const ps = `Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);' -Name Win32 -Namespace API; [API.Win32]::keybd_event(${vk},0,0,[UIntPtr]::Zero); [API.Win32]::keybd_event(${vk},0,2,[UIntPtr]::Zero)`
  exec(`powershell -NoProfile -NonInteractive -Command "${ps}"`, { windowsHide: true })
}

function startMediaPolling() {
  async function poll() {
    const info = await getMediaInfo()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('media-update', info)
    }
  }
  poll()
  mediaInterval = setInterval(poll, 2500)
}

function createWidgetWindow() {
  widgetWindow = new BrowserWindow({
    width: 290,
    height: 85,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (isDev) {
    widgetWindow.loadURL('http://localhost:5173/#/widget')
  } else {
    widgetWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'), {
      hash: 'widget'
    })
  }
}

ipcMain.on('open-widget', () => {
  if (!widgetWindow || widgetWindow.isDestroyed()) createWidgetWindow()
  else widgetWindow.focus()
})

ipcMain.on('close-widget', () => {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.close()
    widgetWindow = null
  }
})

ipcMain.on('timer-update', (_, data) => {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.webContents.send('timer-update', data)
  }
})

ipcMain.on('toggle-timer', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('toggle-timer')
  }
})

ipcMain.on('media-control', (_, key) => {
  sendMediaKey(key)
  // Re-poll quickly after control
  setTimeout(async () => {
    const info = await getMediaInfo()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('media-update', info)
    }
  }, 500)
})

ipcMain.on('close-app', () => app.quit())
ipcMain.on('minimize-app', () => mainWindow?.minimize())

app.whenReady().then(createMainWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
