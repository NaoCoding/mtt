import { useState, type FormEvent } from 'react'
import { RotateCcw, RotateCw } from 'lucide-react'

const counts = [1, 2, 3, 4, 6]
export default function App() {
  const [url, setUrl] = useState('http://localhost:3000')
  const [count, setCount] = useState(4)
  const [launched, setLaunched] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<number | null>(null)

  async function launch(event: FormEvent) {
    event.preventDefault(); setError('')
    try { await window.mtt.launch(url, count); setLaunched(true) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to launch sessions') }
  }
  async function changeCount(value: number) {
    setCount(value)
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

  return <main className={`app ${launched ? 'launched' : ''}`}>
    <form className="toolbar" onSubmit={launch}>
      <input className="url-input" aria-label="URL" value={url} onChange={e => void updateUrl(e.target.value)} spellCheck={false} />
      <select aria-label="Session count" value={count} onChange={e => void changeCount(Number(e.target.value))}>
        {counts.map(n => <option key={n} value={n}>{n} {n === 1 ? 'session' : 'sessions'}</option>)}
      </select>
      <button className="launch" type="submit">{launched ? 'Open' : 'Launch'}</button>
    </form>
    {error && <div className="error" role="alert">{error}</div>}
    <section className={`grid count-${count}`} aria-label="Browser sessions">
      {Array.from({ length: launched ? count : 0 }, (_, id) => <div className="panel" key={id}>
        <header className="panel-header"><span>P{id + 1}</span><div className="panel-actions">
          <button title={`Reload P${id + 1}`} aria-label={`Reload P${id + 1}`} disabled={busy === id} onClick={() => void action(id, 'reload')}><RotateCw size={14} /></button>
          <button title={`Reset P${id + 1}`} aria-label={`Reset P${id + 1}`} disabled={busy === id} onClick={() => void action(id, 'reset')}><RotateCcw size={14} /></button>
        </div></header>
      </div>)}
    </section>
  </main>
}
