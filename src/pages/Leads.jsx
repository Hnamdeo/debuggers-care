import { useEffect, useState } from 'react'
import { Download, MessageCircle, Phone, RefreshCw } from 'lucide-react'

// Private list of "Get a free demo" enquiries (care.debuggersspace.com/#/leads).
// Opened with the leads key; the key is kept only in this browser tab.
const API = (a) => `${import.meta.env.BASE_URL}api/leads.php?a=${a}`
const STATUS = ['new', 'contacted', 'demo', 'trial', 'won', 'lost']
const when = (t) => new Date(t * 1000).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

export default function Leads() {
  const [key, setKey] = useState(() => { try { return sessionStorage.getItem('leadsKey') || '' } catch { return '' } })
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const call = async (a, body = {}) => {
    const r = await fetch(API(a), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, ...body }) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j.error || 'Could not reach the server.')
    return j
  }
  const load = async () => {
    setBusy(true); setErr('')
    try {
      const j = await call('list')
      setRows(j.leads)
      try { sessionStorage.setItem('leadsKey', key) } catch { /* private window */ }
    } catch (e) { setErr(e.message); setRows(null) }
    setBusy(false)
  }
  useEffect(() => { if (key) load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const mark = async (l, status) => {
    setRows(rows.map((x) => (x.id === l.id ? { ...x, status } : x)))
    try { await call('mark', { id: l.id, status, followup: l.followup || '' }) } catch (e) { setErr(e.message) }
  }
  const csv = () => {
    const head = ['id', 'date', 'name', 'clinic', 'city', 'phone', 'type', 'source', 'status']
    const body = rows.map((l) => [l.id, when(l.at), l.name, l.clinic, l.city, l.phone, l.kind, l.source, l.status].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([[head.join(','), ...body].join('\n')], { type: 'text/csv' }))
    a.download = `clinic-leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  if (!rows) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
        <form className="card" style={{ maxWidth: 380, width: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }} onSubmit={(e) => { e.preventDefault(); load() }}>
          <h2 style={{ margin: 0 }}>Clinic app leads</h2>
          <p className="small muted" style={{ margin: 0 }}>Enquiries from the "Get a free demo" form. Enter the leads key.</p>
          <input className="input" type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Leads key" autoFocus />
          {err && <span className="small" style={{ color: 'var(--danger)' }}>{err}</span>}
          <button className="btn primary" disabled={busy || !key}>{busy ? 'Opening…' : 'Open leads'}</button>
        </form>
      </div>
    )
  }

  const counts = STATUS.map((s) => [s, rows.filter((l) => l.status === s).length])
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
      <div className="row between" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0 }}>Clinic app leads</h1>
          <p className="small muted" style={{ margin: '4px 0 0' }}>{rows.length} total · {counts.map(([s, n]) => `${n} ${s}`).join(' · ')}</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn" onClick={load} disabled={busy}><RefreshCw /> Refresh</button>
          <button className="btn" onClick={csv} disabled={!rows.length}><Download /> Excel (CSV)</button>
        </div>
      </div>
      {err && <p className="small" style={{ color: 'var(--danger)' }}>{err}</p>}
      {!rows.length && <div className="card" style={{ padding: 24, marginTop: 16 }}>No enquiries yet. They appear here as soon as someone fills the form.</div>}
      <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
        {rows.map((l) => (
          <div key={l.id} className="card" style={{ padding: 14, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ minWidth: 220, flex: 1 }}>
              <strong>{l.name}</strong>{l.clinic && <> · {l.clinic}</>}
              <div className="small muted">{[l.kind, l.city, `+91 ${l.phone}`, when(l.at), l.source && `from ${l.source}`].filter(Boolean).join(' · ')}</div>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <a className="btn sm" href={`tel:+91${l.phone}`}><Phone /> Call</a>
              <a className="btn sm" target="_blank" rel="noreferrer" href={`https://wa.me/91${l.phone}?text=${encodeURIComponent(`Hello ${l.name.split(' ')[0]}, thank you for asking about our clinic app. When is a good time for a 10-minute demo call?`)}`}><MessageCircle /> WhatsApp</a>
              <select className="input" style={{ width: 'auto' }} value={l.status} onChange={(e) => mark(l, e.target.value)}>
                {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
