import { useState, type FormEvent } from 'react'
import { Camera, Maximize2, Minimize2, Moon, RotateCcw, RotateCw, Sun, WifiOff } from 'lucide-react'

const counts = [1, 2, 3, 4, 6]
export default function App() {
  const [url, setUrl] = useState('http://localhost:3000')
  const [count, setCount] = useState(4)
  const [launched, setLaunched] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<number | null>(null)
  const [offline, setOffline] = useState<number[]>([])
  const [network, setNetwork] = useState(Array.from({ length: 6 }, () => ({ latency: 0, download: 0, upload: 0 })))
  const [fullscreenId, setFullscreenId] = useState<number | null>(null)
  const [lightTheme, setLightTheme] = useState(false)

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
    if (launched) { try { await window.mtt.setCount(value) } catch (cause) { setError(String(cause)) } }
  }
  async function updateUrl(value: string) {
    setUrl(value)
    if (launched) { try { await window.mtt.setUrl(value) } catch (cause) { setError(String(cause)) } }
  }
  async function action(id: number, kind: 'reload' | 'reset' | 'capture') {
    setBusy(id); setError('')
    try { await window.mtt[kind](id) } catch (cause) { setError(cause instanceof Error ? cause.message : `Unable to ${kind} P${id + 1}`) }
    finally { setBusy(null) }
  }
  async function toggleOffline(id: number) {
    const enabled = !offline.includes(id)
    setError('')
    try {
      await window.mtt.setOffline(id, enabled)
      setOffline(current => enabled ? [...current, id] : current.filter(item => item !== id))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to change network mode') }
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

  return <main className={`app ${launched ? 'launched' : ''} ${lightTheme ? 'theme-light' : ''}`}>
    <form className="toolbar" onSubmit={launch}>
      <input className="url-input" aria-label="URL" value={url} onChange={e => void updateUrl(e.target.value)} spellCheck={false} />
      <select aria-label="Session count" value={count} onChange={e => void changeCount(Number(e.target.value))}>
        {counts.map(n => <option key={n} value={n}>{n} {n === 1 ? 'session' : 'sessions'}</option>)}
      </select>
      <button className="theme-toggle" type="button" title={lightTheme ? 'Switch to dark theme' : 'Switch to light theme'} aria-label={lightTheme ? 'Switch to dark theme' : 'Switch to light theme'} aria-pressed={lightTheme} onClick={() => setLightTheme(value => !value)}>{lightTheme ? <Moon size={14} /> : <Sun size={14} />}</button>
      <button className="launch" type="submit">{launched ? 'Open' : 'Launch'}</button>
    </form>
    {error && <div className="error" role="alert">{error}</div>}
    <section className={`grid count-${count}`} aria-label="Browser sessions">
      {Array.from({ length: launched ? count : 0 }, (_, id) => id).filter(id => fullscreenId === null || fullscreenId === id).map(id => <div className="panel" key={id}>
        <header className="panel-header"><div className="panel-topline"><span>P{id + 1}</span><div className="panel-actions">
          <button title={offline.includes(id) ? `Reconnect P${id + 1}` : `Take P${id + 1} offline`} aria-label={offline.includes(id) ? `Reconnect P${id + 1}` : `Take P${id + 1} offline`} aria-pressed={offline.includes(id)} onClick={() => void toggleOffline(id)}><WifiOff size={14} /></button>
          <button title={`Reload P${id + 1}`} aria-label={`Reload P${id + 1}`} disabled={busy === id} onClick={() => void action(id, 'reload')}><RotateCw size={14} /></button>
          <button title={`Reset P${id + 1}`} aria-label={`Reset P${id + 1}`} disabled={busy === id} onClick={() => void action(id, 'reset')}><RotateCcw size={14} /></button>
          <button title={`Capture P${id + 1}`} aria-label={`Capture P${id + 1}`} disabled={busy === id} onClick={() => void action(id, 'capture')}><Camera size={14} /></button>
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
