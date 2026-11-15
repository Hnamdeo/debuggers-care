import { tenantHost } from '../lib/plans'
import { useEffect, useRef, useState } from 'react'
import { Check, Lock, Download, Upload, ImagePlus, Trash2, Palette, Phone, MessageCircle, BadgePercent } from 'lucide-react'
import { useTenant, PageHead, Card, toast, BrandMark, PasswordInput, Input, Select } from '../components/ui'
import { db, server } from '../lib/store'
import { PLANS, PLAN_ORDER, MODULES, SALES_PHONE, salesWhatsApp } from '../lib/plans'

export default function Settings() {
  const { tenant, tid } = useTenant()
  const switchTo = (p) => {
    db.updateTenant(tid, { plan: p })
    toast(`${tenant.name} is now on the ${PLANS[p].name} plan`)
  }
  return (
    <>
      <PageHead title="Plan & settings" sub={tenant.live ? `Plans are monthly subscriptions. To buy or change a plan, call or WhatsApp ${SALES_PHONE}. Records are never moved or lost.` : 'Switch plans any time. Records are never moved or lost.'} />
      <div className="grid g3">
        {PLAN_ORDER.map((p) => {
          const P = PLANS[p]
          const current = tenant.plan === p
          return (
            <div key={p} className={`plan-col ${current ? 'current' : ''}`}>
              <div className="row between"><h3>{P.name}</h3>{current && <span className="pill brand plain">Current plan</span>}</div>
              {P.offer && <span className="offer-tag"><BadgePercent size={13} /> {P.offerLabel}</span>}
              <div><span className="price">{P.offer && <span className="was">₹{P.price.toLocaleString('en-IN')}</span>}₹{(P.offer || P.price).toLocaleString('en-IN')}</span> <span className="muted small">/ month{P.offer ? ' subscription' : ''}</span></div>
              <p className="muted small" style={{ margin: 0 }}>{P.blurb}</p>
              <div className="stack" style={{ gap: 4 }}>
                {Object.keys(MODULES).filter((m) => m !== 'dashboard').map((m) => (
                  <span key={m} className="small row" style={{ gap: 6, color: P.modules.includes(m) ? 'var(--fg)' : 'var(--faint)' }}>
                    {P.modules.includes(m) ? <Check size={13} color="var(--ok)" /> : <Lock size={12} />} {MODULES[m].label}
                  </span>
                ))}
                <span className="small muted">{P.maxDoctors === Infinity ? 'Unlimited doctors' : `Up to ${P.maxDoctors} doctors`}</span>
              </div>
              {tenant.live ? (
                <div className="buy-box">
                  <span className="small"><strong>{current ? 'To subscribe or renew' : `To ${PLAN_ORDER.indexOf(p) > PLAN_ORDER.indexOf(tenant.plan) ? 'upgrade' : 'switch'} to ${P.name}`}</strong>, call or WhatsApp Debuggers Space on {SALES_PHONE}.</span>
                  <div className="row" style={{ gap: 6 }}>
                    <a className="btn sm primary" href={`tel:+91${SALES_PHONE}`}><Phone /> Call</a>
                    <a className="btn sm" href={salesWhatsApp(`Hello, I am from ${tenant.name}. I would like the ${P.name} plan at ₹${(P.offer || P.price).toLocaleString('en-IN')} per month.`)} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a>
                  </div>
                </div>
              ) : !current && <button className="btn primary" style={{ alignSelf: 'flex-start' }} onClick={() => switchTo(p)}>{PLAN_ORDER.indexOf(p) > PLAN_ORDER.indexOf(tenant.plan) ? 'Upgrade' : 'Switch'} to {P.name}</button>}
            </div>
          )
        })}
      </div>
      <ThemeCard tenant={tenant} tid={tid} />
      <BackupCard tenant={tenant} tid={tid} />
      {db.onServer(tid) && <WhatsAppCard tid={tid} tenant={tenant} />}
      {db.onServer(tid) && <PasswordCard tid={tid} />}
      <Card title="Clinic details">
        <dl className="kv">
          <dt>Name</dt><dd>{tenant.name}</dd>
          <dt>Type</dt><dd>{tenant.kind}</dd>
          <dt>Web address</dt><dd>{tenantHost(tenant)}</dd>
          <dt>Address</dt><dd>{tenant.address}</dd>
          <dt>Phone</dt><dd>{tenant.phone}</dd>
          <dt>GSTIN</dt><dd>{tenant.gstin}</dd>
          <dt>Registration</dt><dd>{tenant.regNo}</dd>
          <dt>Tenant ID</dt><dd className="tabular">{tenant.id}</dd>
        </dl>
      </Card>
    </>
  )
}

// Download the whole clinic as one file, and restore it on this or another computer.
function BackupCard({ tenant, tid }) {
  const file = useRef(null)
  const onServer = db.onServer(tid)
  const download = async () => {
    let data
    try { data = onServer ? await server.exportTenant(tid) : db.exportTenant(tid) } catch (err) { return toast(err.message || 'Could not reach the server') }
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${tenant.slug}-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    toast('Backup downloaded. Keep it somewhere safe, such as Google Drive.')
  }
  const restore = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      db.importTenant(tid, JSON.parse(await f.text()))
      toast('Backup restored')
    } catch (err) {
      toast(err.message || 'Could not read that file')
    }
  }
  return (
    <Card title="Backup">
      <p className="muted small" style={{ margin: 0 }}>
        {onServer
          ? 'All records are saved in the clinic’s own database on the server, so every computer and phone that signs in sees the same patients. You can still download a copy of everything for your own safekeeping.'
          : tenant.live
          ? 'Until your clinic moves to the secure online server, records are saved only in this browser on this computer. Download a backup at the end of every day. If the browser is cleared or the computer changes, restore the latest backup here.'
          : 'Download everything in this clinic as one file, or restore from a file you saved earlier.'}
      </p>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn primary" onClick={download}><Download /> Download backup</button>
        <button className="btn" onClick={() => file.current?.click()}><Upload /> Restore from backup</button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={restore} />
      </div>
    </Card>
  )
}

// Automatic WhatsApp reminders through the clinic's own WhatsApp Business number (Meta Cloud API).
// The server sends the approved template; the access token is write-only and never shown again.
const WA_TEMPLATE = 'Hello {{1}}, this is a reminder of your appointment at {{2}} {{3}} at {{4}} with {{5}}. Please come 10 minutes early. Reply to this message if you need to change the time.'
function WhatsAppCard({ tid, tenant }) {
  const [st, setSt] = useState(null)
  const [f, setF] = useState(null)
  const [busy, setBusy] = useState(false)
  const [testTo, setTestTo] = useState('')
  const load = (r) => { setSt(r); setF({ ...r.wa, clinicName: r.wa.clinicName || tenant.name, token: '' }) }
  useEffect(() => { server.whatsapp(tid).then(load).catch(() => setSt({ error: true })) }, [tid])
  if (!st) return <Card title="Automatic WhatsApp reminders"><div className="small muted">Loading…</div></Card>
  if (st.error || !f) return null
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const save = async (patch) => {
    setBusy(true)
    try { load(await server.whatsapp(tid, patch)); toast('WhatsApp settings saved') } catch (err) { toast(err.message || 'Could not save') } finally { setBusy(false) }
  }
  const test = async () => {
    setBusy(true)
    try { await server.whatsappTest(tid, testTo); toast('Test message sent. Check WhatsApp on that phone.') } catch (err) { toast(err.message || 'Test failed') } finally { setBusy(false) }
  }
  const on = st.wa.enabled
  const cronOk = st.lastRun && Date.now() / 1000 - st.lastRun < 900
  return (
    <Card title="Automatic WhatsApp reminders" actions={<span className={`pill ${on ? 'ok' : 'plain'}`}>{on ? 'On' : 'Off'}</span>}>
      <div className="stack" style={{ gap: 10 }}>
        <p className="small muted" style={{ margin: 0 }}>
          Patients get a WhatsApp message from the clinic’s own WhatsApp Business number {f.minutesBefore} minutes before their appointment{f.dayBefore ? ', and the evening before' : ''}, with nobody tapping Send.
          Needs the clinic’s WhatsApp Business account (Meta) and an approved message template. Debuggers Space sets this up for you.
        </p>
        <div className="grid g2">
          <Input id="wa-name" label="Clinic name in the message" value={f.clinicName} onChange={set('clinicName')} />
          <Input id="wa-pnid" label="WhatsApp phone number ID" value={f.phoneNumberId} onChange={set('phoneNumberId')} placeholder="From Meta WhatsApp Manager" />
          <PasswordInput id="wa-token" label={st.wa.hasToken ? 'Access token (saved, type to replace)' : 'Access token'} value={f.token} onChange={set('token')} autoComplete="off" />
          <Input id="wa-tpl" label="Template name" value={f.template} onChange={set('template')} />
          <Select id="wa-lang" label="Template language" value={f.lang} onChange={set('lang')} options={[{ value: 'en', label: 'English' }, { value: 'en_US', label: 'English (US)' }, { value: 'hi', label: 'Hindi' }]} />
          <Select id="wa-min" label="Send before the appointment" value={String(f.minutesBefore)} onChange={set('minutesBefore')} options={[15, 30, 45, 60, 120].map((m) => ({ value: String(m), label: m < 60 ? `${m} minutes` : `${m / 60} hour${m > 60 ? 's' : ''}` }))} />
        </div>
        <label className="row small" style={{ gap: 8 }}><input type="checkbox" checked={!!f.dayBefore} onChange={set('dayBefore')} /> Also send the evening before, at
          <select className="input" style={{ width: 100 }} value={String(f.dayBeforeHour)} onChange={set('dayBeforeHour')}>{[17, 18, 19, 20].map((h) => <option key={h} value={h}>{h - 12}:00 PM</option>)}</select>
        </label>
        <details className="small"><summary>Template to submit in Meta (category: Utility)</summary><pre style={{ whiteSpace: 'pre-wrap', margin: '6px 0 0' }}>{WA_TEMPLATE}</pre><div className="muted">Example values: Asha · {f.clinicName} · today, 16 Nov · 4:30 PM · Dr. Deepak</div></details>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn" disabled={busy} onClick={() => save({ ...f, enabled: on })}>Save</button>
          {on
            ? <button className="btn danger" disabled={busy} onClick={() => save({ enabled: false })}>Switch off</button>
            : <button className="btn primary" disabled={busy || !(st.wa.hasToken || f.token) || !f.phoneNumberId} onClick={() => save({ ...f, enabled: true })}>Save and switch on</button>}
        </div>
        {st.wa.hasToken && (
          <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
            <Input id="wa-test" label="Send a test to (mobile)" value={testTo} onChange={(e) => setTestTo(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit number" style={{ width: 180 }} />
            <button className="btn" disabled={busy || testTo.length !== 10} onClick={test}>Send test</button>
          </div>
        )}
        <div className="small muted">
          Sender {st.lastRun ? `last checked ${new Date(st.lastRun * 1000).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}` : 'not running yet'}{st.lastRun && !cronOk ? ' (not running: the server timer needs a look)' : ''}.
        </div>
        {st.log?.length > 0 && (
          <div className="stack" style={{ gap: 2 }}>
            <strong className="small">Recent messages</strong>
            {st.log.slice(0, 8).map((l, i) => <div key={i} className="small" style={{ color: l.ok ? undefined : 'var(--bad)' }}>{new Date(l.at * 1000).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} · {l.patient} · {l.kind} · {l.ok ? 'sent' : `failed: ${l.error}`}</div>)}
          </div>
        )}
      </div>
    </Card>
  )
}

// The one staff password for the clinic. Changing it signs every other computer out.
function PasswordCard({ tid }) {
  const [f, setF] = useState({ cur: '', next: '', again: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const save = async (e) => {
    e.preventDefault()
    if (f.next.trim().length < 6) return setMsg('Use at least 6 characters.')
    if (f.next.trim() !== f.again.trim()) return setMsg('The two new passwords do not match.')
    setBusy(true)
    try {
      await server.changePassword(tid, f.cur.trim(), f.next.trim())
      setF({ cur: '', next: '', again: '' })
      setMsg('')
      toast('Password changed. Other computers will need the new password.')
    } catch (err) {
      setMsg(err.message || 'Could not reach the server.')
    } finally { setBusy(false) }
  }
  return (
    <Card title="Staff password">
      <form className="stack" style={{ gap: 10, maxWidth: 380 }} onSubmit={save}>
        <PasswordInput id="cp-cur" label="Current password" autoComplete="current-password" value={f.cur} onChange={set('cur')} />
        <PasswordInput id="cp-new" label="New password" autoComplete="new-password" value={f.next} onChange={set('next')} />
        <PasswordInput id="cp-again" label="Type the new password again" autoComplete="new-password" value={f.again} onChange={set('again')} />
        {msg && <div className="small" style={{ color: 'var(--bad)' }}>{msg}</div>}
        <button className="btn primary" type="submit" disabled={busy} style={{ alignSelf: 'flex-start' }}>{busy ? 'Saving…' : 'Change password'}</button>
      </form>
    </Card>
  )
}

// Colour combinations a clinic can pick in one tap: main colour + highlight.
const PRESETS = [
  ['Ocean', '#2459d6', '#9fe7ff'],
  ['Teal', '#0f8f86', '#b9f3d8'],
  ['Sky', '#0e7490', '#a5f3fc'],
  ['Royal', '#7c3aed', '#f0abfc'],
  ['Rose', '#be185d', '#fecdd3'],
  ['Sunset', '#c2410c', '#fde68a'],
  ['Forest', '#15803d', '#d9f99d'],
  ['Slate', '#334155', '#93c5fd'],
]

// Shrink an uploaded logo to a small square PNG so it stays light to save and print.
function readLogo(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\//.test(file.type)) return reject(new Error('Please choose an image file (PNG, JPG or SVG).'))
    const img = new Image()
    img.onload = () => {
      const max = 256
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k) || max
      c.height = Math.round(img.height * k) || max
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(img.src)
      resolve(c.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('That image could not be opened.'))
    img.src = URL.createObjectURL(file)
  })
}

function ThemeCard({ tenant, tid }) {
  const file = useRef(null)
  const [busy, setBusy] = useState(false)
  const set = (patch, msg) => { db.updateTenant(tid, patch); if (msg) toast(msg) }
  const upload = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy(true)
    try { set({ logo: await readLogo(f) }, 'Logo updated') } catch (err) { toast(err.message) }
    setBusy(false)
  }
  const accent = tenant.accent || '#9fe7ff'
  return (
    <Card title="Logo & colours">
      <p className="muted small" style={{ margin: 0 }}>Your logo and colours appear on the sidebar, sign-in page, patient registration chat, prescriptions, reports and bills.</p>
      <div className="row" style={{ gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <BrandMark tenant={tenant} size={64} />
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" disabled={busy} onClick={() => file.current?.click()}><ImagePlus /> {tenant.logo ? 'Change logo' : 'Upload logo'}</button>
          {tenant.logo && <button className="btn ghost" onClick={() => set({ logo: '' }, 'Logo removed')}><Trash2 /> Remove</button>}
          <input ref={file} type="file" accept="image/*" hidden onChange={upload} />
        </div>
      </div>
      <span className="eyebrow"><Palette size={12} style={{ verticalAlign: '-1px' }} /> Colour combination</span>
      <div className="swatch-row">
        {PRESETS.map(([name, c, a]) => (
          <button key={name} className={`swatch ${tenant.color === c && accent === a ? 'on' : ''}`} onClick={() => set({ color: c, accent: a }, `${name} colours applied`)}>
            <i style={{ background: `linear-gradient(135deg, ${c} 55%, ${a} 55%)` }} />{name}
          </button>
        ))}
      </div>
      <div className="row" style={{ gap: 18, flexWrap: 'wrap' }}>
        <label className="color-field small"><input type="color" value={tenant.color} onChange={(e) => set({ color: e.target.value })} /> Main colour</label>
        <label className="color-field small"><input type="color" value={accent} onChange={(e) => set({ accent: e.target.value })} /> Highlight</label>
      </div>
      <div className="hero-band" style={{ padding: 16, gap: 8 }}>
        <strong style={{ position: 'relative', zIndex: 1 }}>Preview · {tenant.name}</strong>
        <span className="small" style={{ position: 'relative', zIndex: 1, opacity: 0.85 }}>This is how your dashboard welcome band will look.</span>
      </div>
    </Card>
  )
}
