import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { BrowserViewManager, normalizeUrl } from './browser-view-manager'
import { SessionManager } from './session-manager'

let mainWindow: BrowserWindow | null = null
let browserViews: BrowserViewManager | null = null
const counts = [1, 2, 3, 4, 6]
function assertRenderer(event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent): void {
  if (event.sender !== mainWindow?.webContents) throw new Error('Untrusted IPC sender')
}
function sessionId(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 5) throw new Error('Invalid session id')
  return value as number
}
function registerIpc(): void {
  ipcMain.handle('mtt:launch', (event, url: unknown, count: unknown) => {
    assertRenderer(event)
    if (typeof url !== 'string' || typeof count !== 'number' || !counts.includes(count)) throw new Error('Invalid launch settings')
    browserViews?.launch(normalizeUrl(url), count)
  })
  ipcMain.handle('mtt:set-count', (event, count: unknown) => {
    assertRenderer(event)
    if (typeof count !== 'number' || !counts.includes(count)) throw new Error('Invalid session count')
    browserViews?.setCount(count)
  })
  ipcMain.handle('mtt:set-url', (event, url: unknown) => {
    assertRenderer(event)
    if (typeof url !== 'string') throw new Error('Invalid URL')
    browserViews?.setUrl(normalizeUrl(url))
  })
  ipcMain.handle('mtt:reload', (event, id: unknown) => { assertRenderer(event); browserViews?.reload(sessionId(id)) })
  ipcMain.handle('mtt:reset', async (event, id: unknown) => { assertRenderer(event); await browserViews?.reset(sessionId(id)) })
  ipcMain.handle('mtt:set-offline', (event, id: unknown, offline: unknown) => {
    assertRenderer(event)
    if (typeof offline !== 'boolean') throw new Error('Invalid network setting')
    browserViews?.setOffline(sessionId(id), offline)
  })
  ipcMain.handle('mtt:set-fullscreen', (event, id: unknown, enabled: unknown) => {
    assertRenderer(event)
    if (typeof enabled !== 'boolean') throw new Error('Invalid fullscreen setting')
    browserViews?.setFullscreen(sessionId(id), enabled)
  })
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({ width: 1280, height: 820, minWidth: 640, minHeight: 420,
    backgroundColor: '#111315', title: 'MTT', webPreferences: {
      preload: join(__dirname, '../preload/preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true
    } })
  const sessions = new SessionManager()
  browserViews = new BrowserViewManager(mainWindow, sessions)
  mainWindow.on('resize', () => browserViews?.layout())
  mainWindow.on('closed', () => { browserViews?.destroyAll(); browserViews = null; mainWindow = null })
  if (process.env.ELECTRON_RENDERER_URL) await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  else await mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(() => { registerIpc(); return createWindow() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) void createWindow() })
app.on('before-quit', () => browserViews?.destroyAll())
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
