import { WebContentsView, type BrowserWindow } from 'electron'
import { SessionManager } from './session-manager'
import { calculateGrid } from './grid-layout'

const TOOLBAR_HEIGHT = 48
export class BrowserViewManager {
  private readonly views = new Map<number, WebContentsView>()
  private readonly networkConditions = new Map<number, { latency: number; downloadKbps: number; uploadKbps: number }>()
  private readonly offlineTimers = new Map<number, ReturnType<typeof setTimeout>>()
  private count = 0
  private url = 'http://localhost:3000'
  private fullscreenId: number | null = null
  constructor(private readonly window: BrowserWindow, private readonly sessions: SessionManager) {}

  private makeView(id: number): WebContentsView {
    const view = new WebContentsView({ webPreferences: {
      session: this.sessions.create(id).session, nodeIntegration: false, contextIsolation: true,
      sandbox: true, webSecurity: true
    } })
    view.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    view.webContents.on('will-navigate', (event, target) => {
      try { const parsed = new URL(target); if (!['http:', 'https:'].includes(parsed.protocol)) event.preventDefault() }
      catch { event.preventDefault() }
    })
    this.window.contentView.addChildView(view)
    this.views.set(id, view)
    void view.webContents.loadURL(this.url)
    return view
  }

  launch(url: string, count: number): void {
    this.url = normalizeUrl(url)
    this.setCount(count)
    for (const view of this.views.values()) void view.webContents.loadURL(this.url)
    this.layout()
  }
  setUrl(url: string): void { this.url = normalizeUrl(url) }
  setCount(count: number): void {
    this.count = count
    if (this.fullscreenId !== null && this.fullscreenId >= count) this.fullscreenId = null
    for (let id = 0; id < count; id++) if (!this.views.has(id)) this.makeView(id)
    for (const [id, view] of this.views) if (id >= count) view.webContents.closeDevTools()
    this.layout()
  }
  layout(): void {
    const { width, height } = this.window.getContentBounds()
    if (this.fullscreenId !== null) {
      for (const [id, view] of this.views) view.setBounds(id === this.fullscreenId
        ? { x: 0, y: TOOLBAR_HEIGHT + 26, width, height: Math.max(0, height - TOOLBAR_HEIGHT - 26) }
        : { x: 0, y: 0, width: 0, height: 0 })
      return
    }
    const cells = calculateGrid(this.count, width, Math.max(0, height - TOOLBAR_HEIGHT))
    for (const [id, view] of this.views) if (id >= this.count) view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
    for (const cell of cells) this.views.get(cell.id)?.setBounds({
      x: cell.x, y: cell.y + TOOLBAR_HEIGHT + cell.headerHeight,
      width: Math.max(0, cell.width), height: Math.max(0, cell.height - cell.headerHeight)
    })
  }
  reload(id: number): void { this.views.get(id)?.webContents.reload() }
  async capture(id: number): Promise<Buffer> {
    const view = this.views.get(id)
    if (!view || id >= this.count) throw new Error(`Session P${id + 1} is not active`)
    const image = await view.webContents.capturePage()
    return image.toPNG()
  }
  setFullscreen(id: number, enabled: boolean): void {
    if (enabled) this.fullscreenId = id
    else if (this.fullscreenId === id) this.fullscreenId = null
    this.layout()
  }
  setDevTools(id: number, enabled: boolean): void {
    const view = this.views.get(id)
    if (!view || id >= this.count) return
    if (enabled) view.webContents.openDevTools({ mode: 'detach' })
    else view.webContents.closeDevTools()
  }
  setOffline(id: number, enabled: boolean): void {
    const view = this.views.get(id)
    if (!view) return
    const timer = this.offlineTimers.get(id)
    if (timer) clearTimeout(timer)
    this.offlineTimers.delete(id)
    const conditions = this.networkConditions.get(id) ?? { latency: 0, downloadKbps: 0, uploadKbps: 0 }
    this.sessions.get(id).session.enableNetworkEmulation({
      offline: enabled,
      latency: conditions.latency,
      downloadThroughput: conditions.downloadKbps === 0 ? -1 : Math.max(1, Math.floor(conditions.downloadKbps * 125)),
      uploadThroughput: conditions.uploadKbps === 0 ? -1 : Math.max(1, Math.floor(conditions.uploadKbps * 125))
    })
  }
  disconnectFor(id: number, durationMs: number): void {
    this.setOffline(id, true)
    const timer = setTimeout(() => {
      this.offlineTimers.delete(id)
      this.setOffline(id, false)
    }, durationMs)
    this.offlineTimers.set(id, timer)
  }
  setNetworkConditions(id: number, latency: number, downloadKbps: number, uploadKbps: number): void {
    const view = this.views.get(id)
    if (!view) return
    this.networkConditions.set(id, { latency, downloadKbps, uploadKbps })
    this.sessions.get(id).session.enableNetworkEmulation({
      offline: false,
      latency,
      downloadThroughput: downloadKbps === 0 ? -1 : Math.max(1, Math.floor(downloadKbps * 125)),
      uploadThroughput: uploadKbps === 0 ? -1 : Math.max(1, Math.floor(uploadKbps * 125))
    })
  }
  async reset(id: number): Promise<void> {
    const view = this.views.get(id)
    if (!view) return
    const url = this.url
    await view.webContents.loadURL('about:blank')
    await this.sessions.reset(id)
    await view.webContents.loadURL(url)
  }
  private destroy(id: number): void {
    const view = this.views.get(id)
    if (!view) return
    this.window.contentView.removeChildView(view)
    view.webContents.close()
    this.views.delete(id)
    this.networkConditions.delete(id)
    const timer = this.offlineTimers.get(id)
    if (timer) clearTimeout(timer)
    this.offlineTimers.delete(id)
    if (this.fullscreenId === id) this.fullscreenId = null
    this.sessions.delete(id)
  }
  destroyAll(): void { for (const id of [...this.views.keys()]) this.destroy(id); this.sessions.clear() }
}

export function normalizeUrl(input: string): string {
  const value = input.trim()
  if (!value) throw new Error('Enter a URL')
  const url = new URL(/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(value) ? value : `http://${value}`)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP and HTTPS URLs are supported')
  return url.href
}
