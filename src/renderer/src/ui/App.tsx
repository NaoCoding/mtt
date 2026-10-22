import { useState, type FormEvent } from 'react'
import { Maximize2, Minimize2, Moon, RotateCcw, RotateCw, Sun, WifiOff } from 'lucide-react'

const counts = [1, 2, 3, 4, 6]
export default function App() {
  const [url, setUrl] = useState('http://localhost:3000')
  const [count, setCount] = useState(4)
  const [launched, setLaunched] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<number | null>(null)
  const [offline, setOffline] = useState<number[]>([])
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
  async function action(id: number, kind: 'reload' | 'reset') {
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
        <header className="panel-header"><span>P{id + 1}</span><div className="panel-actions">
          <button title={offline.includes(id) ? `Reconnect P${id + 1}` : `Take P${id + 1} offline`} aria-label={offline.includes(id) ? `Reconnect P${id + 1}` : `Take P${id + 1} offline`} aria-pressed={offline.includes(id)} onClick={() => void toggleOffline(id)}><WifiOff size={14} /></button>
          <button title={`Reload P${id + 1}`} aria-label={`Reload P${id + 1}`} disabled={busy === id} onClick={() => void action(id, 'reload')}><RotateCw size={14} /></button>
          <button title={`Reset P${id + 1}`} aria-label={`Reset P${id + 1}`} disabled={busy === id} onClick={() => void action(id, 'reset')}><RotateCcw size={14} /></button>
          <button title={fullscreenId === id ? `Restore P${id + 1}` : `Fullscreen P${id + 1}`} aria-label={fullscreenId === id ? `Restore P${id + 1}` : `Fullscreen P${id + 1}`} aria-pressed={fullscreenId === id} onClick={() => void toggleFullscreen(id)}>{fullscreenId === id ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
        </div></header>
      </div>)}
    </section>
  </main>
}
