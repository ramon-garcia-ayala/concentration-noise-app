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
const PS_MEDIA_SCRIPT = [
  'try {',
  '  Add-Type -AssemblyName System.Runtime.WindowsRuntime;',
  '  [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime] | Out-Null;',
  '  [Windows.Storage.Streams.DataReader,Windows.Storage.Streams,ContentType=WindowsRuntime] | Out-Null;',
  '  $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq "AsTask" -and $_.GetParameters().Count -eq 1 -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 1 })[0];',
  '  Function Await($WinRtTask, $ResultType) { $asTask = $asTaskGeneric.MakeGenericMethod($ResultType); $netTask = $asTask.Invoke($null, @($WinRtTask)); $netTask.Wait(-1) | Out-Null; return $netTask.Result };',
  '  $mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]);',
  '  $session = $mgr.GetCurrentSession();',
  '  if ($null -eq $session) { Write-Output "{}"; exit };',
  '  $media = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties]);',
  '  $playback = $session.GetPlaybackInfo();',
  '  $appId = $session.SourceAppUserModelId;',
  '  $appName = $appId;',
  '  if ($appId -match "Spotify") { $appName = "Spotify" }',
  '  elseif ($appId -match "chrome" -or $appId -match "Chrome") { $appName = "Chrome" }',
  '  elseif ($appId -match "msedge" -or $appId -match "Edge") { $appName = "Edge" }',
  '  elseif ($appId -match "firefox" -or $appId -match "Firefox") { $appName = "Firefox" }',
  '  elseif ($appId -match "brave" -or $appId -match "Brave") { $appName = "Brave" }',
  '  elseif ($appId -match "opera" -or $appId -match "Opera") { $appName = "Opera" };',
  '  $thumbB64 = "";',
  '  try {',
  '    $thumb = $media.Thumbnail;',
  '    if ($null -ne $thumb) {',
  '      $streamRef = Await ($thumb.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType]);',
  '      $asStreamMethod = [System.IO.WindowsRuntimeStreamExtensions].GetMethods() | Where-Object { $_.Name -eq "AsStreamForRead" -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq "IInputStream" };',
  '      $iid = [Guid]"905a0fe2-bc53-11df-8c49-001e4fc686da";',
  '      $punk = [System.Runtime.InteropServices.Marshal]::GetIUnknownForObject($streamRef);',
  '      $ppv = [IntPtr]::Zero;',
  '      [void][System.Runtime.InteropServices.Marshal]::QueryInterface($punk, [ref]$iid, [ref]$ppv);',
  '      $inputStream = [System.Runtime.InteropServices.Marshal]::GetObjectForIUnknown($ppv);',
  '      $netStream = $asStreamMethod.Invoke($null, @($inputStream));',
  '      $ms = [System.IO.MemoryStream]::new();',
  '      $netStream.CopyTo($ms);',
  '      $thumbB64 = [Convert]::ToBase64String($ms.ToArray())',
  '    }',
  '  } catch {};',
  '  $result = @{ title = $media.Title; artist = $media.Artist; album = $media.AlbumTitle; status = $playback.PlaybackStatus.ToString(); app = $appName; appId = $appId; thumb = $thumbB64 } | ConvertTo-Json -Compress;',
  '  Write-Output $result',
  '} catch { Write-Output "{}" }'
].join(' ')

let cachedThumb = { key: '', data: '' }

function getMediaInfo() {
  return new Promise((resolve) => {
    const encoded = Buffer.from(PS_MEDIA_SCRIPT, 'utf16le').toString('base64')
    exec(
      `powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
      { timeout: 8000, windowsHide: true, maxBuffer: 1024 * 1024 },
      (err, stdout) => {
        if (err || !stdout.trim()) return resolve(null)
        try {
          const data = JSON.parse(stdout.trim())
          if (!data.title) return resolve(null)
          // Cache thumbnail by track
          const trackKey = `${data.title}|${data.artist}`
          if (data.thumb && data.thumb.length > 0) {
            cachedThumb = { key: trackKey, data: data.thumb }
          }
          // Always attach cached thumb for current track
          if (cachedThumb.key === trackKey) {
            data.thumb = cachedThumb.data
          } else {
            delete data.thumb
          }
          resolve(data)
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
  const ps = 'Add-Type -MemberDefinition \'[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);\' -Name Win32 -Namespace API; [API.Win32]::keybd_event(' + vk + ',0,0,[UIntPtr]::Zero); [API.Win32]::keybd_event(' + vk + ',0,2,[UIntPtr]::Zero)'
  const encoded = Buffer.from(ps, 'utf16le').toString('base64')
  exec(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`, { windowsHide: true })
}

// ── System volume control via setvol.exe ──
const setvolPath = path.join(__dirname, '../../resources/setvol.exe')

function setSystemVolume(level) {
  const vol = Math.max(0, Math.min(1, level)).toFixed(2)
  exec(`"${setvolPath}" set ${vol}`, { windowsHide: true }, (err) => {
    if (err) console.error('[setvol] error:', err.message)
  })
}

function fetchSystemVolume() {
  return new Promise((resolve) => {
    exec(
      `"${setvolPath}" get`,
      { timeout: 2000, windowsHide: true },
      (err, stdout) => {
        if (err || !stdout.trim()) return resolve(1)
        const val = parseFloat(stdout.trim())
        resolve(isNaN(val) ? 1 : val)
      }
    )
  })
}

function startMediaPolling() {
  async function poll() {
    const [info, vol] = await Promise.all([getMediaInfo(), fetchSystemVolume()])
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('media-update', info ? { ...info, systemVolume: vol } : null)
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
    const [info, vol] = await Promise.all([getMediaInfo(), fetchSystemVolume()])
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('media-update', info ? { ...info, systemVolume: vol } : null)
    }
  }, 500)
})

ipcMain.on('set-system-volume', (_, level) => {
  setSystemVolume(level)
})

ipcMain.on('set-master-volume', (_, level) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('set-master-volume', level)
  }
})

ipcMain.on('close-app', () => app.quit())
ipcMain.on('minimize-app', () => mainWindow?.minimize())

app.whenReady().then(createMainWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
