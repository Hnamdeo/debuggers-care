import { tenantHost } from '../lib/plans'
import { useRef, useState } from 'react'
import { Check, Lock, Download, Upload, ImagePlus, Trash2, Palette } from 'lucide-react'
import { useTenant, PageHead, Card, toast, BrandMark } from '../components/ui'
import { db } from '../lib/store'
import { PLANS, PLAN_ORDER, MODULES } from '../lib/plans'

export default function Settings() {
  const { tenant, tid } = useTenant()
  const switchTo = (p) => {
    db.updateTenant(tid, { plan: p })
    toast(`${tenant.name} is now on the ${PLANS[p].name} plan`)
  }
  return (
    <>
      <PageHead title="Plan & settings" sub="Switch plans any time. Records are never moved or lost." />
      <div className="grid g3">
        {PLAN_ORDER.map((p) => {
          const P = PLANS[p]
          const current = tenant.plan === p
          return (
            <div key={p} className={`plan-col ${current ? 'current' : ''}`}>
              <div className="row between"><h3>{P.name}</h3>{current && <span className="pill brand plain">Current plan</span>}</div>
              <div><span className="price">₹{P.price.toLocaleString('en-IN')}</span> <span className="muted small">/ month, indicative</span></div>
              <p className="muted small" style={{ margin: 0 }}>{P.blurb}</p>
              <div className="stack" style={{ gap: 4 }}>
                {Object.keys(MODULES).filter((m) => m !== 'dashboard').map((m) => (
                  <span key={m} className="small row" style={{ gap: 6, color: P.modules.includes(m) ? 'var(--fg)' : 'var(--faint)' }}>
                    {P.modules.includes(m) ? <Check size={13} color="var(--ok)" /> : <Lock size={12} />} {MODULES[m].label}
                  </span>
                ))}
                <span className="small muted">{P.maxDoctors === Infinity ? 'Unlimited doctors' : `Up to ${P.maxDoctors} doctors`}</span>
              </div>
              {!current && <button className="btn primary" style={{ alignSelf: 'flex-start' }} onClick={() => switchTo(p)}>{PLAN_ORDER.indexOf(p) > PLAN_ORDER.indexOf(tenant.plan) ? 'Upgrade' : 'Switch'} to {P.name}</button>}
            </div>
          )
        })}
      </div>
      <ThemeCard tenant={tenant} tid={tid} />
      <BackupCard tenant={tenant} tid={tid} />
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
  const download = () => {
    const blob = new Blob([JSON.stringify(db.exportTenant(tid))], { type: 'application/json' })
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
        {tenant.live
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
