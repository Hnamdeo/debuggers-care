import { useState, useRef } from 'react'
import { ImagePlus, Camera, MonitorPlay, MessageCircle, ScanLine } from 'lucide-react'
import { Modal, Input, Select, Textarea, Card, useTenant, toast } from './ui'
import { db, server } from '../lib/store'
import { today, fmtDate } from '../lib/utils'
import { VideoPlayer, whatsappLink } from './videos'

export const KINDS = ['X-ray', 'Intraoral photo', 'Smile photo', 'Report scan', 'Other']

// Phones take 4000px photos; 1600px is plenty to read an X-ray and keeps uploads quick.
function shrink(file, max, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k)
      c.height = Math.round(img.height * k)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(img.src)
      resolve(c.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => reject(new Error('That file is not a picture we can open.'))
    img.src = URL.createObjectURL(file)
  })
}

export const imgSrc = (tid, im) => (im.fileId ? server.fileUrl(tid, im.fileId) : im.dataUrl)

// Treatments the doctor can tag on an X-ray: every video in the library plus the clinic's own services.
export function useTreatments() {
  const { list, tenant } = useTenant()
  return [...new Set([...list('videos').map((v) => v.procedure), ...(tenant.services || []).slice(1).map((s) => s[0])])].filter(Boolean).sort()
}
export const videoFor = (list, treatment) => treatment && list('videos').find((v) => v.procedure === treatment || v.title.toLowerCase().includes(treatment.toLowerCase()))

export function ImageUpload({ patientId, onClose, kind: initKind = 'X-ray' }) {
  const { tid, patient, user } = useTenant()
  const treatments = useTreatments()
  const p = patient(patientId)
  const pick = useRef(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [f, setF] = useState({ kind: initKind, area: '', treatment: '', note: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const choose = (e) => {
    const x = e.target.files?.[0]
    if (!x) return
    setFile(x)
    setPreview(URL.createObjectURL(x))
    setErr('')
  }
  const save = async () => {
    if (!file) return setErr('Take a photo or choose a picture first.')
    setBusy(true)
    try {
      const rec = { patientId, date: today(), kind: f.kind, area: f.area.trim(), treatment: f.treatment, note: f.note.trim(), by: user.refId }
      if (db.onServer(tid)) {
        rec.fileId = await server.upload(tid, await shrink(file, 1600, 0.85))
      } else {
        // Without the server the picture lives in this browser, so keep it small.
        rec.dataUrl = await shrink(file, 900, 0.7)
      }
      db.add(tid, 'images', rec)
      toast(`${f.kind} saved to ${p?.name}’s record`)
      onClose()
    } catch (e) {
      setErr(e.message || 'Could not save the picture. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title={`Add X-ray or photo · ${p?.name || ''}`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save to record'}</button></>}>
      <input ref={pick} type="file" accept="image/*" hidden onChange={choose} />
      <button type="button" className="img-drop" onClick={() => pick.current?.click()}>
        {preview ? <img src={preview} alt="Chosen picture" /> : <><Camera size={28} /><strong>Take a photo or choose a picture</strong><span className="small muted">On a phone this opens the camera. You can also photograph an X-ray film on a light box.</span></>}
      </button>
      <div className="grid g2">
        <Select id="im-kind" label="What is it?" value={f.kind} onChange={set('kind')} options={KINDS} />
        <Input id="im-area" label="Tooth or area (optional)" value={f.area} onChange={set('area')} placeholder="e.g. 36, lower left" />
      </div>
      <Select id="im-treat" label="Treatment needed (links the explainer video)" value={f.treatment} onChange={set('treatment')} options={[{ value: '', label: 'Not decided yet' }, ...treatments.map((t) => ({ value: t, label: t }))]} />
      <Textarea id="im-note" label="Doctor’s note (optional)" rows={2} value={f.note} onChange={set('note')} placeholder="e.g. Deep caries reaching the pulp, RCT advised" />
      {err && <div className="small" style={{ color: 'var(--bad)' }}>{err}</div>}
    </Modal>
  )
}

// One picture full size, with the matching treatment video one tap away.
export function ImageViewer({ im, onClose }) {
  const { tid, list, patient, staff, user } = useTenant()
  const [play, setPlay] = useState(null)
  const p = patient(im.patientId)
  const v = videoFor(list, im.treatment)
  return (
    <>
      <Modal wide title={`${im.kind}${im.area ? ` · ${im.area}` : ''} · ${fmtDate(im.date)}`} onClose={onClose} footer={<>
        {v && <button className="btn primary" onClick={() => setPlay(v)}><MonitorPlay /> Explain: {v.title}</button>}
        {v && user.role !== 'patient' && <a className="btn" href={whatsappLink(p.phone, `Hello ${p.name.split(' ')[0]}, here is the video about your treatment (${im.treatment}): ${v.url}`)} target="_blank" rel="noreferrer"><MessageCircle /> Send video on WhatsApp</a>}
        <button className="btn" onClick={onClose}>Close</button>
      </>}>
        <div className="img-full"><img src={imgSrc(tid, im)} alt={`${im.kind} of ${p?.name}`} /></div>
        <div className="small">
          {im.treatment && <div><strong>Treatment needed:</strong> {im.treatment}</div>}
          {im.note && <div><strong>Note:</strong> {im.note}</div>}
          <div className="muted">Added by {staff(im.by)?.name || 'clinic'} on {fmtDate(im.date)}</div>
          {im.treatment && !v && <div className="muted">No video for “{im.treatment}” yet. Add one on the Patient education page and it will show here.</div>}
        </div>
      </Modal>
      {play && <VideoPlayer video={play} patientId={im.patientId} onClose={() => setPlay(null)} />}
    </>
  )
}

export function ImageGrid({ p, limit, onAdd }) {
  const { tid, list } = useTenant()
  const [open, setOpen] = useState(null)
  const all = list('images').filter((i) => i.patientId === p.id).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  const items = limit ? all.slice(0, limit) : all
  return (
    <>
      {items.length ? (
        <div className="img-grid">
          {items.map((im) => (
            <button key={im.id} className="img-tile" onClick={() => setOpen(im)}>
              <img src={imgSrc(tid, im)} alt={im.kind} loading="lazy" />
              <span><strong>{im.kind}{im.area ? ` · ${im.area}` : ''}</strong><small>{fmtDate(im.date)}{im.treatment ? ` · ${im.treatment}` : ''}</small></span>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty small" style={{ padding: 12 }}><ScanLine size={22} /><div>No X-rays or photos yet.</div></div>
      )}
      {onAdd && <button className="btn sm" style={{ marginTop: 8, alignSelf: 'flex-start' }} onClick={onAdd}><ImagePlus /> Add X-ray or photo</button>}
      {open && <ImageViewer im={open} onClose={() => setOpen(null)} />}
    </>
  )
}

export function ImagesTab({ p, staffView }) {
  const [add, setAdd] = useState(false)
  return (
    <Card title="X-rays and photos">
      <ImageGrid p={p} onAdd={staffView ? () => setAdd(true) : null} />
      {add && <ImageUpload patientId={p.id} onClose={() => setAdd(false)} />}
    </Card>
  )
}

