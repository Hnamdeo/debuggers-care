import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlaskRound, Plus, PackageCheck, CheckCircle2, MessageCircle, Star, Cake, CalendarPlus, Repeat, Boxes, Minus, FileText } from 'lucide-react'
import { useTenant, Card, Table, Modal, Input, Select, Textarea, DocModal, SheetHead, PageHead, Stat, Pill, toast } from './ui'
import { whatsappLink } from './videos'
import { BookAppointment } from './forms'
import { toothName } from './dentalchart'
import { db } from '../lib/store'
import { SITES } from '../lib/sites'
import { today, addDays, fmtDate, money, age, billTotal, daysBetween } from '../lib/utils'

// Extra tools for dental clinics (26 Nov 2026): lab work, case sheet, treatment sittings,
// Google review requests, birthday wishes, gum chart, materials stock and visiting-specialist payouts.

const okPhone = (p) => /^\d{10}$/.test(p?.phone || '')
const clinicName = (t) => SITES[t.slug]?.name || t.name
const first = (p) => (p?.name || '').split(' ')[0]

/* ---------------- Lab work: crowns, bridges, dentures, aligners sent to the dental lab ---------------- */

export const LAB_TYPES = ['PFM crown', 'Zirconia crown', 'E-max crown', 'Metal crown', 'Bridge', 'Complete denture', 'Partial denture (RPD)', 'Flexible denture', 'Clear aligners', 'Night guard', 'Inlay / onlay', 'Veneer', 'Implant crown', 'Other']
const LAB_STATUS = { sent: ['At lab', 'warn'], received: ['Received', 'info'], fitted: ['Fitted', 'ok'], redo: ['Sent back for redo', 'bad'] }

export function labState(w) {
  if (w.status === 'sent' && w.due && w.due < today()) return ['Overdue', 'bad']
  return LAB_STATUS[w.status] || ['At lab', 'warn']
}

export function LabForm({ patientId, onClose }) {
  const { tid, list } = useTenant()
  const labs = [...new Set(list('labwork').map((w) => w.lab).filter(Boolean))]
  const [f, setF] = useState({ patientId: patientId || '', type: LAB_TYPES[1], teeth: '', shade: '', lab: labs[0] || '', sent: today(), due: addDays(today(), 7), charge: '', note: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const save = () => {
    if (!f.patientId) return toast('Pick the patient')
    if (!f.lab.trim()) return toast('Enter the lab name')
    const w = db.add(tid, 'labwork', { ...f, lab: f.lab.trim(), charge: +f.charge || 0, status: 'sent' })
    toast(`${w.type} sent to ${w.lab}. Due ${fmtDate(w.due)}.`)
    onClose(w)
  }
  return (
    <Modal title="Send work to the lab" onClose={() => onClose()} footer={<><button className="btn" onClick={() => onClose()}>Cancel</button><button className="btn primary" onClick={save}><FlaskRound /> Save</button></>}>
      {!patientId && <Select label="Patient" value={f.patientId} onChange={set('patientId')} options={[{ value: '', label: 'Pick a patient' }, ...list('patients').map((p) => ({ value: p.id, label: `${p.name} · ${p.id}` }))]} />}
      <div className="grid g2">
        <Select label="Work" value={f.type} onChange={set('type')} options={LAB_TYPES} />
        <Input label="Tooth / teeth (FDI)" value={f.teeth} onChange={set('teeth')} placeholder="e.g. 36 or 14-16" />
        <Input label="Shade" value={f.shade} onChange={set('shade')} placeholder="e.g. A2" />
        <Input label="Lab" value={f.lab} onChange={set('lab')} list="lab-names" placeholder="e.g. Raipur Dental Lab" />
        <Input label="Sent on" type="date" value={f.sent} onChange={set('sent')} />
        <Input label="Due back" type="date" value={f.due} onChange={set('due')} />
        <Input label="Lab charge (₹)" inputMode="numeric" value={f.charge} onChange={set('charge')} placeholder="What the lab bills you" />
      </div>
      <datalist id="lab-names">{labs.map((l) => <option key={l} value={l} />)}</datalist>
      <Textarea label="Instructions for the lab" rows={2} value={f.note} onChange={set('note')} placeholder="e.g. Shoulder margin, light occlusion" />
    </Modal>
  )
}

function LabActions({ w }) {
  const { tid } = useTenant()
  const mark = (status, extra = {}) => { db.update(tid, 'labwork', w.id, { status, ...extra }); toast(`${w.type}: ${LAB_STATUS[status][0].toLowerCase()}`) }
  return (
    <div className="row" style={{ gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
      {w.status === 'sent' && <button className="btn sm" onClick={() => mark('received', { receivedOn: today() })}><PackageCheck /> Received</button>}
      {w.status === 'received' && <button className="btn sm primary" onClick={() => mark('fitted', { fittedOn: today() })}><CheckCircle2 /> Fitted</button>}
      {w.status === 'received' && <button className="btn sm ghost" onClick={() => mark('redo', { redoOn: today() })}><Repeat /> Redo</button>}
      {w.status === 'redo' && <button className="btn sm" onClick={() => mark('received', { receivedOn: today() })}><PackageCheck /> Received</button>}
    </div>
  )
}

const labCols = (patient, nav, base) => [
  ...(patient ? [{ label: 'Patient', render: (w) => <><a href="#" className="cell-main" onClick={(e) => { e.preventDefault(); nav(`${base}/patients/${w.patientId}`) }}>{patient(w.patientId)?.name}</a><div className="cell-sub">{w.patientId}</div></> }] : []),
  { label: 'Work', render: (w) => <><div className="cell-main">{w.type}</div><div className="cell-sub">{w.teeth ? `Tooth ${w.teeth}` : ''}{w.shade ? ` · Shade ${w.shade}` : ''}</div></> },
  { label: 'Lab', render: (w) => <><div>{w.lab}</div><div className="cell-sub">Sent {fmtDate(w.sent)}</div></> },
  { label: 'Due', render: (w) => <>{fmtDate(w.due)}{w.status === 'sent' && w.due && <div className="cell-sub">{w.due < today() ? `${daysBetween(w.due, today())} days late` : w.due === today() ? 'today' : `in ${daysBetween(today(), w.due)} days`}</div>}</> },
  { label: 'Lab charge', num: true, render: (w) => (w.charge ? money(w.charge) : '–') },
  { label: 'Status', render: (w) => { const [l, t] = labState(w); return <span className={`pill ${t}`}>{l}</span> } },
  { label: '', render: (w) => <LabActions w={w} /> },
]

export function LabWorkTab({ p }) {
  const { list } = useTenant()
  const [add, setAdd] = useState(false)
  const rows = list('labwork').filter((w) => w.patientId === p.id).sort((a, b) => b.sent.localeCompare(a.sent))
  return (
    <Card title="Lab work" actions={<button className="btn sm primary" onClick={() => setAdd(true)}><Plus /> Send to lab</button>}>
      <Table rows={rows} cols={labCols()} empty="Nothing sent to a lab for this patient yet." />
      {add && <LabForm patientId={p.id} onClose={() => setAdd(false)} />}
    </Card>
  )
}

export function LabWorkPage() {
  const { list, patient, base } = useTenant()
  const nav = useNavigate()
  const [tab, setTab] = useState('open')
  const [add, setAdd] = useState(false)
  const all = list('labwork').sort((a, b) => (a.due || '').localeCompare(b.due || ''))
  const open = all.filter((w) => w.status !== 'fitted')
  const late = open.filter((w) => w.status === 'sent' && w.due < today())
  const month = today().slice(0, 7)
  const cost = all.filter((w) => (w.sent || '').startsWith(month)).reduce((s, w) => s + (+w.charge || 0), 0)
  const rows = tab === 'open' ? open : tab === 'late' ? late : all.filter((w) => w.status === 'fitted').reverse()
  return (
    <>
      <PageHead title="Lab work" sub="Crowns, bridges, dentures and aligners at the dental lab">
        <button className="btn primary" onClick={() => setAdd(true)}><Plus /> Send to lab</button>
      </PageHead>
      <div className="grid g4">
        <Stat label="At the lab" value={open.filter((w) => w.status === 'sent').length} sub="Waiting to come back" />
        <Stat label="Overdue" value={late.length} sub="Past the due date: call the lab" />
        <Stat label="Ready to fit" value={open.filter((w) => w.status === 'received').length} sub="Book the patient" />
        <Stat label="Lab bills this month" value={money(cost)} sub="What the labs charge you" />
      </div>
      <div className="seg" style={{ alignSelf: 'flex-start' }}>
        {[['open', `Open (${open.length})`], ['late', `Overdue (${late.length})`], ['done', 'Fitted']].map(([v, l]) => <button key={v} className={tab === v ? 'on' : ''} onClick={() => setTab(v)}>{l}</button>)}
      </div>
      <Card><Table rows={rows} cols={labCols(patient, nav, base)} empty="Nothing here. Use “Send to lab” when a crown, bridge or denture goes out." /></Card>
      {add && <LabForm onClose={() => setAdd(false)} />}
    </>
  )
}

/* ---------------- Treatment sittings: "RCT on 36, sitting 2 of 3" ---------------- */

export function SittingsCard({ p }) {
  const { tid, tenant } = useTenant()
  const [add, setAdd] = useState(false)
  const [book, setBook] = useState(null)
  const [f, setF] = useState({ name: 'Root canal treatment', tooth: '', total: 3 })
  const courses = p.courses || []
  const save = (next) => db.update(tid, 'patients', p.id, { courses: next })
  const names = [...new Set([...(tenant.services || []).map((s) => s[0]), 'Root canal treatment', 'Braces / orthodontic adjustment', 'Implant', 'Denture', 'Crown and bridge', 'Gum treatment'])]
  const create = () => {
    save([...courses, { id: `C${Date.now()}`, name: f.name, tooth: f.tooth, total: Math.max(1, +f.total || 1), sittings: [], started: today() }])
    setAdd(false)
    toast(`${f.name} added: ${f.total} sittings`)
  }
  const sit = (c) => {
    const s = [...c.sittings, today()]
    save(courses.map((x) => (x.id === c.id ? { ...x, sittings: s, done: s.length >= x.total ? today() : '' } : x)))
    toast(s.length >= c.total ? `${c.name} complete` : `Sitting ${s.length} of ${c.total} recorded`)
    if (s.length < c.total) setBook(c)
  }
  if (!courses.length && !add) {
    return <Card title="Treatment sittings" actions={<button className="btn sm" onClick={() => setAdd(true)}><Plus /> Add treatment</button>}><p className="small muted" style={{ margin: '0 16px 14px' }}>Track treatments that take more than one visit, like RCT in 3 sittings or braces adjustments.</p></Card>
  }
  return (
    <Card title="Treatment sittings" actions={<button className="btn sm" onClick={() => setAdd(true)}><Plus /> Add treatment</button>}>
      <div className="stack" style={{ padding: '0 16px 14px', gap: 10 }}>
        {add && (
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div style={{ flex: 2, minWidth: 180 }}><Input label="Treatment" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} list="course-names" /></div>
            <div style={{ width: 110 }}><Input label="Tooth" value={f.tooth} onChange={(e) => setF({ ...f, tooth: e.target.value })} placeholder="36" /></div>
            <div style={{ width: 110 }}><Input label="Sittings" type="number" min="1" value={f.total} onChange={(e) => setF({ ...f, total: e.target.value })} /></div>
            <button className="btn primary" onClick={create}>Add</button>
            <button className="btn ghost" onClick={() => setAdd(false)}>Cancel</button>
            <datalist id="course-names">{names.map((n) => <option key={n} value={n} />)}</datalist>
          </div>
        )}
        {courses.map((c) => (
          <div key={c.id} className="course">
            <div className="course-top">
              <b>{c.name}{c.tooth ? ` · ${c.tooth}` : ''}</b>
              <span className={`pill ${c.done ? 'ok' : 'info'}`}>{c.done ? `Done ${fmtDate(c.done)}` : `Sitting ${c.sittings.length} of ${c.total}`}</span>
            </div>
            <div className="course-dots">{Array.from({ length: c.total }, (_, i) => <i key={i} className={i < c.sittings.length ? 'on' : ''} title={c.sittings[i] ? fmtDate(c.sittings[i]) : `Sitting ${i + 1}`} />)}</div>
            {!c.done && (
              <div className="row" style={{ gap: 6 }}>
                <button className="btn sm primary" onClick={() => sit(c)}><CheckCircle2 /> Record today’s sitting</button>
                <button className="btn sm" onClick={() => setBook(c)}><CalendarPlus /> Book next sitting</button>
              </div>
            )}
          </div>
        ))}
      </div>
      {book && <BookAppointment patientId={p.id} onClose={() => setBook(null)} />}
    </Card>
  )
}

/* ---------------- Google review request ---------------- */

export function reviewLink(tenant) { return tenant.reviewUrl || SITES[tenant.slug]?.reviewUrl || '' }

export function ReviewButton({ p, small }) {
  const { tenant, tid } = useTenant()
  const url = reviewLink(tenant)
  if (!okPhone(p)) return null
  const text = `Hello ${first(p)}, thank you for visiting ${clinicName(tenant)}. If you were happy with your treatment, a short Google review helps other patients find us:\n${url || '(review link)'}\n\nआपके भरोसे के लिए धन्यवाद। अगर इलाज अच्छा लगा हो तो कृपया Google पर एक छोटा सा रिव्यू दें।`
  if (!url) return <button className={`btn ${small ? 'sm' : ''}`} onClick={() => toast('Add your Google review link in Plan & settings first')}><Star /> Ask for review</button>
  return (
    <a className={`btn ${small ? 'sm' : ''}`} href={whatsappLink(p.phone, text)} target="_blank" rel="noreferrer" onClick={() => db.update(tid, 'patients', p.id, { reviewAskedAt: today() })} title={p.reviewAskedAt ? `Asked on ${fmtDate(p.reviewAskedAt)}` : 'Send the Google review link on WhatsApp'}>
      <Star /> {p.reviewAskedAt ? 'Review asked' : 'Ask for review'}
    </a>
  )
}

/* ---------------- Birthday wishes (dashboard) ---------------- */

export function BirthdaysCard() {
  const { list, tenant, tid } = useTenant()
  const md = today().slice(5)
  const rows = list('patients').filter((p) => p.dob && p.dob.slice(5) === md)
  if (!rows.length) return null
  const text = (p) => `Happy birthday, ${first(p)}! 🎂 Wishing you good health and a bright smile from all of us at ${clinicName(tenant)}.\nजन्मदिन की हार्दिक शुभकामनाएँ! 🎉`
  return (
    <Card title={<span className="row" style={{ gap: 8 }}><Cake size={18} /> Birthdays today</span>}>
      <div className="stack" style={{ padding: '0 16px 14px', gap: 8 }}>
        {rows.map((p) => (
          <div key={p.id} className="row between">
            <span><b>{p.name}</b> <span className="muted small">turns {age(p.dob)}</span></span>
            {okPhone(p) && <a className="btn sm" href={whatsappLink(p.phone, text(p))} target="_blank" rel="noreferrer" onClick={() => db.update(tid, 'patients', p.id, { wishedOn: today() })}><MessageCircle /> {p.wishedOn === today() ? 'Wished' : 'Send wishes'}</a>}
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ---------------- Gum (periodontal) chart ---------------- */

const PERIO_TEETH = [[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28], [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]]

export function GumChart({ p }) {
  const { tid } = useTenant()
  const [g, setG] = useState(p.perio || {})
  const put = (n, k, v) => setG((x) => ({ ...x, [n]: { ...(x[n] || {}), [k]: v } }))
  const deep = Object.entries(g).filter(([, v]) => +v.pd >= 5)
  const bleed = Object.values(g).filter((v) => v.bop).length
  const save = () => { db.update(tid, 'patients', p.id, { perio: g, perioOn: today() }); toast('Gum chart saved') }
  return (
    <Card title="Gum chart (pocket depth in mm)" actions={<button className="btn sm primary" onClick={save}>Save</button>}>
      <p className="small muted" style={{ margin: '0 16px 10px' }}>
        Deepest pocket per tooth, bleeding on probing and mobility. {p.perioOn ? `Last saved ${fmtDate(p.perioOn)}. ` : ''}
        {deep.length ? <b style={{ color: 'var(--bad)' }}>{deep.length} teeth with pockets of 5 mm or more.</b> : 'No deep pockets recorded.'} {bleed ? `${bleed} teeth bleed on probing.` : ''}
      </p>
      <div className="perio-wrap">
        {PERIO_TEETH.map((row, r) => (
          <div key={r} className="perio-row">
            {row.map((n) => {
              const v = g[n] || {}
              return (
                <div key={n} className={`perio-t ${+v.pd >= 5 ? 'deep' : +v.pd >= 4 ? 'mid' : ''}`} title={toothName(n)}>
                  <b>{n}</b>
                  <input inputMode="numeric" maxLength={2} value={v.pd || ''} onChange={(e) => put(n, 'pd', e.target.value.replace(/\D/g, ''))} aria-label={`Pocket depth ${n}`} placeholder="–" />
                  <button className={v.bop ? 'on' : ''} onClick={() => put(n, 'bop', !v.bop)} title="Bleeding on probing">B</button>
                  <select value={v.mob || ''} onChange={(e) => put(n, 'mob', e.target.value)} aria-label={`Mobility ${n}`}><option value="">M0</option><option value="1">M1</option><option value="2">M2</option><option value="3">M3</option></select>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ---------------- Printable case sheet ---------------- */

export function CaseSheet({ p, onClose }) {
  const { tenant, list, staff } = useTenant()
  const mine = (c) => list(c).filter((r) => r.patientId === p.id)
  const visits = mine('appointments').filter((a) => a.status === 'completed').sort((a, b) => a.date.localeCompare(b.date))
  const rxs = mine('prescriptions')
  const bills = mine('bills')
  const billed = bills.reduce((s, b) => s + billTotal(b), 0)
  const paid = bills.reduce((s, b) => s + Math.min(+b.paid || 0, billTotal(b)), 0)
  const teeth = Object.entries(p.teeth || {}).sort(([a], [b]) => +a - +b)
  const labs = mine('labwork')
  const hist = Object.entries(p.history || {}).filter(([, v]) => v === true || (v && v !== 'no')).map(([k]) => k)
  return (
    <DocModal title={`Case sheet · ${p.name}`} onClose={onClose}>
      <div className="sheet">
        <SheetHead tenant={tenant} title="Dental case sheet" sub={`${p.id} · printed ${fmtDate(today())}`} />
        <div className="meta">
          <div><span className="muted">Patient:</span> <strong>{p.name}</strong></div>
          <div><span className="muted">UHID:</span> {p.id}{p.opdNo ? ` · OPD ${p.opdNo}` : ''}</div>
          <div><span className="muted">Age / Sex:</span> {p.dob ? `${age(p.dob)} y` : '–'} / {p.gender || '–'}</div>
          <div><span className="muted">Mobile:</span> {p.phone || '–'}</div>
          <div><span className="muted">Registered:</span> {fmtDate(p.regDate)}</div>
          <div><span className="muted">Allergies:</span> {p.allergies || 'None told'}</div>
        </div>
        <h4 className="sheet-h">Medical history</h4>
        <p>{[p.conditions, ...hist].filter(Boolean).join(', ') || 'Nothing significant told.'}{p.historyNote ? ` ${p.historyNote}` : ''}</p>
        <h4 className="sheet-h">Dental findings and plan (FDI)</h4>
        {teeth.length ? (
          <table><thead><tr><th>Tooth</th><th>Found</th><th>Planned</th><th>Done</th></tr></thead>
            <tbody>{teeth.map(([n, t]) => <tr key={n}><td>{n} <span className="muted">{toothName(+n)}</span></td><td>{(t.c || []).join(', ') || '–'}</td><td>{t.plan || '–'}</td><td>{t.done ? fmtDate(t.done) : '–'}</td></tr>)}</tbody>
          </table>
        ) : <p className="muted">No teeth marked on the chart.</p>}
        {p.plan && <><h4 className="sheet-h">Treatment plan</h4><p style={{ whiteSpace: 'pre-line' }}>{p.plan}</p></>}
        {(p.courses || []).length > 0 && <><h4 className="sheet-h">Treatment sittings</h4><p>{p.courses.map((c) => `${c.name}${c.tooth ? ` (${c.tooth})` : ''}: ${c.sittings.length} of ${c.total}${c.done ? ', done' : ''}`).join(' · ')}</p></>}
        <h4 className="sheet-h">Visits</h4>
        {visits.length ? (
          <table><thead><tr><th>Date</th><th>Doctor</th><th>Complaint / treatment</th><th>Diagnosis</th></tr></thead>
            <tbody>{visits.map((a) => { const rx = rxs.find((r) => r.appointmentId === a.id); return <tr key={a.id}><td>{fmtDate(a.date)}</td><td>{staff(a.doctorId)?.name}</td><td>{a.procedure && a.procedure !== 'Consultation' ? a.procedure : a.reason}</td><td>{rx?.diagnosis || '–'}</td></tr> })}</tbody>
          </table>
        ) : <p className="muted">No completed visits yet.</p>}
        {labs.length > 0 && <><h4 className="sheet-h">Lab work</h4><p>{labs.map((w) => `${w.type}${w.teeth ? ` (${w.teeth})` : ''}, ${w.lab}, ${labState(w)[0].toLowerCase()}`).join(' · ')}</p></>}
        <h4 className="sheet-h">Payments</h4>
        <p>Billed {money(billed)} · Paid {money(paid)} · Due {money(billed - paid)}</p>
        <div className="sign-row"><span>Patient’s signature</span><span>Doctor’s signature</span></div>
      </div>
    </DocModal>
  )
}

export function CaseSheetButton({ p }) {
  const [open, setOpen] = useState(false)
  return <><button className="btn" onClick={() => setOpen(true)}><FileText /> Case sheet</button>{open && <CaseSheet p={p} onClose={() => setOpen(false)} />}</>
}

/* ---------------- Materials stock ---------------- */

const STARTER = [['Composite (A2)', 'syringe', 6, 3], ['GIC restorative', 'pack', 2, 1], ['Bonding agent', 'bottle', 2, 1], ['Gutta-percha points', 'box', 4, 2], ['K-files (assorted)', 'box', 6, 3], ['Local anaesthetic (lignocaine)', 'cartridge', 60, 30], ['Impression material (alginate)', 'pack', 3, 2], ['Gloves (M)', 'box', 8, 4], ['Masks', 'box', 6, 3], ['Cotton rolls', 'pack', 10, 4]]

export function MaterialsPage() {
  const { tid, list } = useTenant()
  const items = list('materials').sort((a, b) => a.name.localeCompare(b.name))
  const [f, setF] = useState({ name: '', unit: 'box', qty: '', min: '' })
  const low = items.filter((m) => +m.qty <= +m.min)
  const add = () => {
    if (!f.name.trim()) return toast('Enter the item name')
    db.add(tid, 'materials', { name: f.name.trim(), unit: f.unit || 'piece', qty: +f.qty || 0, min: +f.min || 0, updated: today() })
    setF({ name: '', unit: 'box', qty: '', min: '' })
  }
  const step = (m, d) => db.update(tid, 'materials', m.id, { qty: Math.max(0, (+m.qty || 0) + d), updated: today() })
  const starter = () => { STARTER.forEach(([name, unit, qty, min]) => db.add(tid, 'materials', { name, unit, qty, min, updated: today() })); toast('Common dental materials added. Change the numbers to match your shelf.') }
  return (
    <>
      <PageHead title="Materials stock" sub="Composites, files, anaesthetic, gloves… and what to reorder" />
      <div className="grid g3">
        <Stat label="Items tracked" value={items.length} />
        <Stat label="To reorder" value={low.length} sub={low.slice(0, 3).map((m) => m.name).join(', ') || 'All stocked'} />
        <Stat label="Last updated" value={items.length ? fmtDate(items.map((m) => m.updated).sort().pop()) : '–'} />
      </div>
      <Card title="Add an item">
        <div className="row" style={{ padding: '0 16px 14px', alignItems: 'flex-end' }}>
          <div style={{ flex: 2, minWidth: 200 }}><Input label="Item" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Composite A3" /></div>
          <div style={{ width: 110 }}><Input label="Unit" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></div>
          <div style={{ width: 110 }}><Input label="In stock" inputMode="numeric" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} /></div>
          <div style={{ width: 130 }}><Input label="Reorder at" inputMode="numeric" value={f.min} onChange={(e) => setF({ ...f, min: e.target.value })} /></div>
          <button className="btn primary" onClick={add}><Plus /> Add</button>
          {!items.length && <button className="btn" onClick={starter}><Boxes /> Add common items</button>}
        </div>
      </Card>
      <Card>
        <Table rows={items} empty="No items yet. Add your materials, or use “Add common items” to start with a typical dental list."
          cols={[
            { label: 'Item', render: (m) => <span className="cell-main">{m.name}</span> },
            { label: 'In stock', num: true, render: (m) => <span className="tabular">{m.qty} {m.unit}</span> },
            { label: 'Reorder at', num: true, render: (m) => m.min },
            { label: 'Status', render: (m) => (+m.qty <= +m.min ? <span className="pill bad">Reorder</span> : <span className="pill ok">OK</span>) },
            { label: '', render: (m) => <div className="row" style={{ gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap' }}><button className="btn sm" onClick={() => step(m, -1)} aria-label="Used one"><Minus /></button><button className="btn sm" onClick={() => step(m, 1)} aria-label="Added one"><Plus /></button></div> },
          ]} />
      </Card>
    </>
  )
}

/* ---------------- Doctor / visiting specialist payouts (analytics) ---------------- */

export function PayoutsCard() {
  const { tid, list } = useTenant()
  const docs = list('staff').filter((s) => s.role === 'doctor')
  const [month, setMonth] = useState(today().slice(0, 7))
  const appts = list('appointments')
  const rows = useMemo(() => {
    const bills = list('bills').filter((b) => b.date.startsWith(month) && b.source !== 'Pharmacy')
    return docs.map((d) => {
      const mine = bills.filter((b) => (b.ref && appts.find((a) => a.id === b.ref)?.doctorId === d.id) || (!b.ref && b.items.some((i) => (i.desc || '').includes(d.name))))
      const billed = mine.reduce((s, b) => s + billTotal(b), 0)
      const share = +d.share || 0
      return { d, n: mine.length, billed, share, pay: Math.round((billed * share) / 100) }
    })
  }, [list, docs, appts, month])
  const setShare = (d, v) => db.update(tid, 'staff', d.id, { share: Math.max(0, Math.min(100, +v || 0)) })
  if (!docs.length) return null
  return (
    <Card title="Doctor payouts" actions={<input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: 160 }} />}>
      <p className="small muted" style={{ margin: '0 16px 10px' }}>For visiting specialists (orthodontist, endodontist, implantologist) paid a share of what they bill. Set each doctor’s share once.</p>
      <Table rows={rows} cols={[
        { label: 'Doctor', render: (r) => <><div className="cell-main">{r.d.name}</div><div className="cell-sub">{r.d.dept}</div></> },
        { label: 'Bills', num: true, render: (r) => r.n },
        { label: 'Billed', num: true, render: (r) => money(r.billed) },
        { label: 'Share %', num: true, render: (r) => <input className="input" style={{ width: 70, textAlign: 'right' }} inputMode="numeric" defaultValue={r.share || ''} placeholder="0" onBlur={(e) => setShare(r.d, e.target.value)} /> },
        { label: 'Payout', num: true, render: (r) => <b>{money(r.pay)}</b> },
      ]} />
    </Card>
  )
}
