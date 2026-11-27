// A small pill at the top of the screen that says when the app is working without
// internet, how many changes are waiting, and when they have gone to the server.
import { useState } from 'react'
import { useDb, offline } from '../lib/store'

const WHAT = { add: 'New', update: 'Change to', tenant: 'Clinic settings' }
const NAMES = { patients: 'patient', appointments: 'appointment', prescriptions: 'prescription', bills: 'bill', visits: 'visit', reports: 'report', medicines: 'medicine', sales: 'sale' }

export function SyncBadge({ tid }) {
  useDb()
  const [open, setOpen] = useState(false)
  const s = offline.info(tid)
  const failed = s.failed.length
  if (!s.offline && !s.pending && !failed && !s.done) return null
  let cls = 'sync-pill'
  let text
  if (failed) { cls += ' bad'; text = `${failed} ${failed === 1 ? 'change' : 'changes'} could not be saved. Tap to see` }
  else if (s.offline && s.server) { cls += ' off'; text = s.pending ? `Offline · ${s.pending} ${s.pending === 1 ? 'change' : 'changes'} saved on this computer, will sync when internet is back` : 'Offline · keep working, changes are saved on this computer' }
  else if (s.offline) { cls += ' off'; text = 'Offline · keep working, everything is saved on this computer' }
  else if (s.pending) { cls += ' busy'; text = `Syncing ${s.pending} ${s.pending === 1 ? 'change' : 'changes'} to the clinic server…` }
  else { cls += ' ok'; text = 'All changes synced to the clinic server ✓' }
  return (
    <div className="sync-wrap" role="status" aria-live="polite">
      <button className={cls} onClick={() => failed && setOpen(!open)}>
        <i className="sync-dot" /> {text}
      </button>
      {open && failed > 0 && (
        <div className="sync-pop card">
          <strong>These changes did not reach the server</strong>
          <ul>
            {s.failed.map((f, i) => (
              <li key={i} className="small">
                {WHAT[f.action] || f.action} {NAMES[f.body?.coll] || f.body?.coll || ''} {f.body?.data?.name || f.body?.id || ''}
                <span className="muted"> · {f.error}</span>
              </li>
            ))}
          </ul>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn sm" onClick={() => { offline.retry(tid); setOpen(false) }}>Try again</button>
            <button className="btn ghost sm" onClick={() => { offline.discard(tid); setOpen(false) }}>Dismiss</button>
          </div>
        </div>
      )}
    </div>
  )
}
