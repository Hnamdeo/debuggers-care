import { useState, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeartPulse, Stethoscope, UserPlus } from 'lucide-react'
import { Modal, Input, Select, Textarea, Card, Table, Pill, useTenant, toast } from './ui'
import { db } from '../lib/store'
import { today, nowTime, fmtDate, fmtTime, money, billTotal } from '../lib/utils'

// One visit = one patient on one day: the front desk adds vitals, the doctor sees them in the consultation.
export const VISIT_TONE = { waiting: 'warn', 'with-doctor': 'info', done: 'ok' }
export const VISIT_TEXT = { waiting: 'Waiting', 'with-doctor': 'With doctor', done: 'Seen' }

const FIELDS = [
  ['weight', 'Weight', 'kg'],
  ['height', 'Height', 'cm'],
  ['bp', 'Blood pressure', 'mmHg', '120/80'],
  ['pulse', 'Pulse', '/min'],
  ['temp', 'Temperature', '°F'],
  ['spo2', 'SpO₂', '%'],
  ['sugar', 'Blood sugar', 'mg/dL'],
]

export const bmi = (v = {}) => {
  const w = parseFloat(v.weight)
  const h = parseFloat(v.height) / 100
  return w > 0 && h > 0.5 ? (w / (h * h)).toFixed(1) : ''
}

export function vitalsText(v = {}) {
  const parts = FIELDS.filter(([k]) => v[k]).map(([k, label, unit]) => `${k === 'bp' ? 'BP' : k === 'spo2' ? 'SpO₂' : label} ${v[k]}${unit === '%' || unit === '°F' ? unit : ' ' + unit}`)
  const b = bmi(v)
  if (b) parts.splice(2, 0, `BMI ${b}`)
  return parts.join(' · ')
}

export const todayVisit = (list, patientId) => list('visits').find((v) => v.patientId === patientId && v.date === today())

export function VisitForm({ patientId, onClose }) {
  const { tid, list, patient, doctors } = useTenant()
  const p = patient(patientId)
  const existing = todayVisit(list, patientId)
  const docs = doctors()
  const [v, setV] = useState({ ...(existing?.vitals || {}) })
  const [complaint, setComplaint] = useState(existing?.complaint || '')
  const [doctorId, setDoctorId] = useState(existing?.doctorId || docs[0]?.id || '')
  const [err, setErr] = useState('')
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value.replace(/[^\d./]/g, '') })
  const save = () => {
    if (v.bp && !/^\d{2,3}\/\d{2,3}$/.test(v.bp)) return setErr('Write blood pressure like 120/80.')
    const clean = Object.fromEntries(Object.entries(v).filter(([, x]) => x !== '' && x != null))
    if (existing) db.update(tid, 'visits', existing.id, { vitals: clean, complaint, doctorId })
    else db.add(tid, 'visits', { patientId, date: today(), time: nowTime(), status: 'waiting', source: 'desk', complaint, doctorId, vitals: clean })
    toast(`Vitals saved for ${p?.name} (${fmtDate(today())})`)
    onClose()
  }
  const b = bmi(v)
  return (
    <Modal title={`Today’s visit · ${p?.name || ''}`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save visit</button></>}>
      <div className="small muted">{fmtDate(today())}{existing ? ` · visit ${existing.id}` : ' · new visit'}. Leave anything you did not measure empty.</div>
      <div className="grid g2">
        {FIELDS.map(([k, label, unit, ph]) => (
          <Input key={k} id={`vs-${k}`} label={`${label} (${unit})`} value={v[k] || ''} onChange={set(k)} inputMode="decimal" placeholder={ph || ''} />
        ))}
        <div className="field"><span>BMI</span><div className="input" style={{ display: 'flex', alignItems: 'center' }} aria-live="polite">{b || <span className="muted">From weight and height</span>}</div></div>
      </div>
      <Textarea id="vs-complaint" label="Complaint / reason for visit" rows={2} value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="e.g. Tooth pain, lower left" />
      {docs.length > 1 && <Select id="vs-doc" label="Doctor" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} options={docs.map((d) => ({ value: d.id, label: d.name }))} />}
      {err && <div className="small" style={{ color: 'var(--bad)' }}>{err}</div>}
    </Modal>
  )
}

// Send a waiting patient to the doctor: makes (or reuses) today's appointment so the consultation screen opens.
export function sendToDoctor(tid, list, visit, doctorId) {
  let apptId = visit.appointmentId
  if (!apptId || !list('appointments').some((a) => a.id === apptId)) {
    const a = db.add(tid, 'appointments', { patientId: visit.patientId, doctorId, date: today(), time: visit.time || nowTime(), reason: visit.complaint || 'Consultation', status: 'checked-in', type: 'OPD', walkIn: true })
    apptId = a.id
  }
  db.update(tid, 'visits', visit.id, { status: 'with-doctor', appointmentId: apptId, doctorId })
  return apptId
}

// Dashboard card: everyone who came in today, newest registrations flagged, vitals one tap away.
export function TodayVisits() {
  const { tid, list, patient, staff, user, base, doctors } = useTenant()
  const nav = useNavigate()
  const [edit, setEdit] = useState(null)
  const T = today()
  const rows = list('visits').filter((v) => v.date === T).sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  const isDoc = user.role === 'doctor' || user.role === 'admin'
  const defaultDoc = user.role === 'doctor' ? user.refId : doctors()[0]?.id
  const go = (v, e) => {
    e.stopPropagation()
    const docId = v.doctorId || defaultDoc
    const apptId = sendToDoctor(tid, list, v, docId)
    if (isDoc) nav(`${base}/consult/${apptId}`)
    else toast(`${patient(v.patientId)?.name} sent to ${staff(docId)?.name || 'the doctor'}`)
  }
  return (
    <Card title={`Today’s visits (${rows.length})`} actions={<button className="btn sm" onClick={() => nav(`${base}/patients`)}><UserPlus /> Find patient</button>}>
      <Table
        rows={rows}
        onRow={(v) => nav(`${base}/patients/${v.patientId}`)}
        empty="No one has come in yet today. Patients who scan the clinic QR code appear here."
        cols={[
          { label: 'Time', render: (v) => <span className="tabular">{fmtTime(v.time)}</span> },
          { label: 'Patient', render: (v) => { const p = patient(v.patientId); return <><div className="cell-main">{p?.name || v.patientId}{p?.regDate === T && <span className="pill info" style={{ marginLeft: 6 }}>New</span>}</div><div className="cell-sub">{p?.phone}{v.complaint ? ` · ${v.complaint}` : ''}</div></> } },
          { label: 'Vitals', render: (v) => <span className="small">{vitalsText(v.vitals) || <span className="muted">Not taken yet</span>}</span> },
          { label: 'Status', render: (v) => <Pill tone={VISIT_TONE[v.status]}>{VISIT_TEXT[v.status] || v.status}</Pill> },
          { label: '', render: (v) => (
            <div className="row" style={{ gap: 6, flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
              <button className="btn sm" onClick={(e) => { e.stopPropagation(); setEdit(v.patientId) }}><HeartPulse /> Vitals</button>
              {v.status !== 'done' && (isDoc || v.status === 'waiting') && <button className="btn sm primary" onClick={(e) => go(v, e)}><Stethoscope /> {isDoc ? 'Consult' : 'Send to doctor'}</button>}
            </div>
          ) },
        ]}
      />
      {edit && <VisitForm patientId={edit} onClose={() => setEdit(null)} />}
    </Card>
  )
}

// The patient's history, one card per day: vitals, what the doctor found, medicines, tests and the bill.
export function VisitDays({ p }) {
  const { list, staff } = useTenant()
  const mine = (c) => list(c).filter((r) => r.patientId === p.id)
  const days = {}
  const day = (d) => (days[d] ||= { visits: [], appts: [], rxs: [], reps: [], bills: [] })
  mine('visits').forEach((v) => day(v.date).visits.push(v))
  mine('appointments').filter((a) => a.status !== 'cancelled' && a.date <= today()).forEach((a) => day(a.date).appts.push(a))
  mine('prescriptions').forEach((r) => day(r.date).rxs.push(r))
  mine('reports').forEach((r) => day(r.date).reps.push(r))
  mine('bills').forEach((b) => day(b.date).bills.push(b))
  const dates = Object.keys(days).sort().reverse()
  if (!dates.length) return <Card><div className="empty">No visits yet. Use “Today’s visit” to add vitals.</div></Card>
  return (
    <div className="stack">
      {dates.map((d) => {
        const x = days[d]
        const v = x.visits[0]
        const docId = x.rxs[0]?.doctorId || x.appts[0]?.doctorId || v?.doctorId
        return (
          <Card key={d} title={fmtDate(d)} actions={v ? <Pill tone={VISIT_TONE[v.status]}>{VISIT_TEXT[v.status]}</Pill> : x.appts[0] && <Pill status={x.appts[0].status} />}>
            <dl className="kv">
              {docId && <><dt>Doctor</dt><dd>{staff(docId)?.name}</dd></>}
              {(v?.complaint || x.appts[0]?.reason) && <><dt>Complaint</dt><dd>{v?.complaint || x.appts[0].reason}</dd></>}
              {v && vitalsText(v.vitals) && <><dt>Vitals</dt><dd>{vitalsText(v.vitals)}</dd></>}
              {x.rxs.map((r) => <Fragment key={r.id}><dt>Diagnosis</dt><dd>{r.diagnosis}{r.items.length ? <div className="small muted">{r.items.map((i) => `${i.name} (${i.freq}, ${i.days} d)`).join(' · ')}</div> : null}{r.notes ? <div className="small muted">{r.notes}</div> : null}</dd></Fragment>)}
              {x.reps.length > 0 && <><dt>Tests</dt><dd>{x.reps.map((r) => `${r.test}${r.status === 'completed' ? '' : ' (in lab)'}`).join(', ')}</dd></>}
              {x.bills.length > 0 && <><dt>Bill</dt><dd>{x.bills.map((b) => `${b.id} · ${money(billTotal(b))}${b.paid >= billTotal(b) ? ' paid' : ` (${money(billTotal(b) - b.paid)} due)`}`).join(', ')}</dd></>}
            </dl>
          </Card>
        )
      })}
    </div>
  )
}
