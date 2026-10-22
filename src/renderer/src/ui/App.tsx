import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Camera, Code2, Maximize2, Minimize2, Moon, RotateCcw, RotateCw, Save, Sun, Timer, Trash2, WifiOff } from 'lucide-react'

const counts = [1, 2, 3, 4, 6]
const PRESETS_KEY = 'mtt-session-presets'
interface SessionPreset { name: string; url: string; count: number }

function readPresets(): SessionPreset[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(PRESETS_KEY) ?? '[]')
    if (!Array.isArray(stored)) return []
    return stored.filter((item): item is SessionPreset => typeof item === 'object' && item !== null &&
      typeof item.name === 'string' && typeof item.url === 'string' && typeof item.count === 'number' && counts.includes(item.count))
  } catch { return [] }
}

export default function App() {
  const [url, setUrl] = useState('http://localhost:3000')
  const [count, setCount] = useState(4)
  const [launched, setLaunched] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<number | null>(null)
  const [offline, setOffline] = useState<number[]>([])
  const reconnectTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>())
  const [devTools, setDevTools] = useState<number[]>([])
  const [network, setNetwork] = useState(Array.from({ length: 6 }, () => ({ latency: 0, download: 0, upload: 0 })))
  const [presets, setPresets] = useState<SessionPreset[]>(readPresets)
  const [selectedPreset, setSelectedPreset] = useState('')
  const [fullscreenId, setFullscreenId] = useState<number | null>(null)
  const [lightTheme, setLightTheme] = useState(false)

  useEffect(() => { localStorage.setItem(PRESETS_KEY, JSON.stringify(presets)) }, [presets])

  async function launch(event: FormEvent) {
    event.preventDefault(); setError('')
    try { await window.mtt.launch(url, count); setLaunched(true) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to launch sessions') }
  }
  async function changeCount(value: number) {
    setCount(value)
    if (fullscreenId !== null && fullscreenId >= value) {
      setFullscreenId(null)
      try { await window.mtt.setFullscreen(fullscreenId, false) } catch (cause) { setError(String(cause)) }
    }
    if (devTools.some(id => id >= value)) setDevTools(current => current.filter(id => id < value))
    if (launched) { try { await window.mtt.setCount(value) } catch (cause) { setError(String(cause)) } }
  }
  async function updateUrl(value: string) {
    setUrl(value)
    if (launched) { try { await window.mtt.setUrl(value) } catch (cause) { setError(String(cause)) } }
  }
  function savePreset() {
    const name = window.prompt('Name this session preset')?.trim()
    if (!name) return
    setPresets(current => [...current.filter(preset => preset.name !== name), { name, url, count }].sort((a, b) => a.name.localeCompare(b.name)))
    setSelectedPreset(name)
  }
  function selectPreset(name: string) {
    setSelectedPreset(name)
    const preset = presets.find(item => item.name === name)
    if (!preset) return
    void updateUrl(preset.url)
    void changeCount(preset.count)
  }
  function deletePreset() {
    if (!selectedPreset) return
    setPresets(current => current.filter(preset => preset.name !== selectedPreset))
    setSelectedPreset('')
  }
  async function action(id: number, kind: 'reload' | 'reset' | 'capture') {
    setBusy(id); setError('')
    try { await window.mtt[kind](id) } catch (cause) { setError(cause instanceof Error ? cause.message : `Unable to ${kind} P${id + 1}`) }
    finally { setBusy(null) }
  }
  async function toggleOffline(id: number) {
    const enabled = !offline.includes(id)
    const timer = reconnectTimers.current.get(id)
    if (timer) clearTimeout(timer)
    reconnectTimers.current.delete(id)
    setError('')
    try {
      await window.mtt.setOffline(id, enabled)
      setOffline(current => enabled ? [...current, id] : current.filter(item => item !== id))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to change network mode') }
  }
  async function testReconnect(id: number) {
    const timer = reconnectTimers.current.get(id)
    if (timer) clearTimeout(timer)
    reconnectTimers.current.delete(id)
    setError('')
    try {
      await window.mtt.disconnectFor(id, 5000)
      setOffline(current => current.includes(id) ? current : [...current, id])
      reconnectTimers.current.set(id, setTimeout(() => {
        reconnectTimers.current.delete(id)
        setOffline(current => current.filter(item => item !== id))
      }, 5000))
    } catch (cause) { setError(cause instanceof Error ? cause.message : `Unable to test reconnection for P${id + 1}`) }
  }
  async function updateNetwork(id: number, field: 'latency' | 'download' | 'upload', rawValue: string) {
    const value = Math.max(0, Number(rawValue) || 0)
    const next = { ...network[id], [field]: value }
    setNetwork(current => current.map((profile, index) => index === id ? next : profile))
    setError('')
    try { await window.mtt.setNetworkConditions(id, next.latency, next.download, next.upload) }
    catch (cause) { setError(cause instanceof Error ? cause.message : `Unable to update network conditions for P${id + 1}`) }
  }
  async function toggleFullscreen(id: number) {
    const enabled = fullscreenId !== id
    setError('')
    try {
      await window.mtt.setFullscreen(id, enabled)
      setFullscreenId(enabled ? id : null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to change panel size') }
  }
  async function toggleDevTools(id: number) {
    const enabled = !devTools.includes(id)
    setError('')
    try {
      await window.mtt.setDevTools(id, enabled)
      setDevTools(current => enabled ? [...current, id] : current.filter(item => item !== id))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to change DevTools state') }
  }

  return <main className={`app ${launched ? 'launched' : ''} ${lightTheme ? 'theme-light' : ''}`}>
    <form className="toolbar" onSubmit={launch}>
      <input className="url-input" aria-label="URL" value={url} onChange={e => void updateUrl(e.target.value)} spellCheck={false} />
      <select aria-label="Session count" value={count} onChange={e => void changeCount(Number(e.target.value))}>
        {counts.map(n => <option key={n} value={n}>{n} {n === 1 ? 'session' : 'sessions'}</option>)}
      </select>
      <select className="preset-select" aria-label="Saved session presets" value={selectedPreset} onChange={event => selectPreset(event.target.value)}>
        <option value="">Presets</option>
        {presets.map(preset => <option key={preset.name} value={preset.name}>{preset.name}</option>)}
      </select>
      <button className="preset-button" type="button" title="Save current URL and session count as a preset" aria-label="Save session preset" onClick={savePreset}><Save size={14} /></button>
      <button className="preset-button" type="button" title="Delete selected preset" aria-label="Delete selected preset" disabled={!selectedPreset} onClick={deletePreset}><Trash2 size={14} /></button>
      <button className="theme-toggle" type="button" title={lightTheme ? 'Switch to dark theme' : 'Switch to light theme'} aria-label={lightTheme ? 'Switch to dark theme' : 'Switch to light theme'} aria-pressed={lightTheme} onClick={() => setLightTheme(value => !value)}>{lightTheme ? <Moon size={14} /> : <Sun size={14} />}</button>
      <button className="launch" type="submit">{launched ? 'Open' : 'Launch'}</button>
    </form>
    {error && <div className="error" role="alert">{error}</div>}
    <section className={`grid count-${count}`} aria-label="Browser sessions">
      {Array.from({ length: launched ? count : 0 }, (_, id) => id).filter(id => fullscreenId === null || fullscreenId === id).map(id => <div className="panel" key={id}>
        <header className="panel-header"><div className="panel-topline"><span>P{id + 1}</span><div className="panel-actions">
          <button title={offline.includes(id) ? `Reconnect P${id + 1}` : `Take P${id + 1} offline`} aria-label={offline.includes(id) ? `Reconnect P${id + 1}` : `Take P${id + 1} offline`} aria-pressed={offline.includes(id)} onClick={() => void toggleOffline(id)}><WifiOff size={14} /></button>
          <button title={`Simulate a 5-second disconnect and reconnect for P${id + 1}`} aria-label={`Test reconnection for P${id + 1}`} disabled={offline.includes(id)} onClick={() => void testReconnect(id)}><Timer size={14} /></button>
          <button title={`Reload P${id + 1}`} aria-label={`Reload P${id + 1}`} disabled={busy === id} onClick={() => void action(id, 'reload')}><RotateCw size={14} /></button>
          <button title={`Reset P${id + 1}`} aria-label={`Reset P${id + 1}`} disabled={busy === id} onClick={() => void action(id, 'reset')}><RotateCcw size={14} /></button>
          <button title={`Capture P${id + 1}`} aria-label={`Capture P${id + 1}`} disabled={busy === id} onClick={() => void action(id, 'capture')}><Camera size={14} /></button>
          <button title={devTools.includes(id) ? `Close DevTools for P${id + 1}` : `Open DevTools for P${id + 1}`} aria-label={devTools.includes(id) ? `Close DevTools for P${id + 1}` : `Open DevTools for P${id + 1}`} aria-pressed={devTools.includes(id)} onClick={() => void toggleDevTools(id)}><Code2 size={14} /></button>
          <button title={fullscreenId === id ? `Restore P${id + 1}` : `Fullscreen P${id + 1}`} aria-label={fullscreenId === id ? `Restore P${id + 1}` : `Fullscreen P${id + 1}`} aria-pressed={fullscreenId === id} onClick={() => void toggleFullscreen(id)}>{fullscreenId === id ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
        </div></div><div className="network-controls" aria-label={`Network conditions for P${id + 1}`}>
          <label title="Added round-trip latency in milliseconds">Latency <input aria-label={`Latency for P${id + 1} in milliseconds`} type="number" min="0" max="60000" disabled={offline.includes(id)} value={network[id].latency} onChange={event => void updateNetwork(id, 'latency', event.target.value)} /></label>
          <label title="Download limit in kilobits per second; 0 means unlimited">Down <input aria-label={`Download limit for P${id + 1} in kilobits per second`} type="number" min="0" max="1000000" disabled={offline.includes(id)} value={network[id].download} onChange={event => void updateNetwork(id, 'download', event.target.value)} /></label>
          <label title="Upload limit in kilobits per second; 0 means unlimited">Up <input aria-label={`Upload limit for P${id + 1} in kilobits per second`} type="number" min="0" max="1000000" disabled={offline.includes(id)} value={network[id].upload} onChange={event => void updateNetwork(id, 'upload', event.target.value)} /></label>
        </div></header>
      </div>)}
    </section>
  </main>
}
