import { useState } from 'react'
import { Siren } from 'lucide-react'
import { useTenant, PageHead, Modal, Input, Select, Textarea, Pill, toast, Stat } from '../components/ui'
import { AdmitForm } from '../components/forms'
import { db } from '../lib/store'
import { today, nowTime, fmtTime } from '../lib/utils'

const LANES = [
  ['red', 'Critical', 'See immediately'],
  ['yellow', 'Urgent', 'See within 30 minutes'],
  ['green', 'Stable', 'Can wait'],
]

export default function Emergency() {
  const { tid, list, staff, doctors } = useTenant()
  const [reg, setReg] = useState(false)
  const [admitFor, setAdmitFor] = useState(null)
  const cases = list('emergencies')
  const active = cases.filter((c) => ['waiting', 'in-treatment'].includes(c.status))
  const closed = cases.filter((c) => !['waiting', 'in-treatment'].includes(c.status))
  const erDocs = doctors()
  const update = (c, patch, msg) => { db.update(tid, 'emergencies', c.id, patch); toast(msg) }

  const startAdmit = (c) => {
    // Create (or find) the patient record so the admission links to a UHID
    let p = list('patients').find((x) => x.phone === c.phone)
    if (!p) p = db.add(tid, 'patients', { name: c.name, gender: c.gender, dob: `${new Date().getFullYear() - c.age}-01-01`, phone: c.phone, email: '', blood: 'O+', address: '', allergies: '', conditions: '', emergencyContact: '', regDate: today() })
    setAdmitFor({ c, p })
  }

  return (
    <>
      <PageHead title="Emergency" sub="Triage board for walk-ins and ambulance arrivals">
        <button className="btn primary" onClick={() => setReg(true)}><Siren /> Register arrival</button>
      </PageHead>
      <div className="grid g4">
        <Stat label="In department" value={active.length} sub={`${active.filter((c) => c.status === 'waiting').length} waiting for a doctor`} />
        <Stat label="Critical" value={active.filter((c) => c.triage === 'red').length} sub="Red triage" />
        <Stat label="Admitted today" value={cases.filter((c) => c.status === 'admitted').length} sub="Moved to IPD / ICU" />
        <Stat label="Treated and sent home" value={cases.filter((c) => c.status === 'discharged').length} sub="Today" />
      </div>
      <div className="triage">
        {LANES.map(([k, label, hint]) => {
          const lane = active.filter((c) => c.triage === k).sort((a, b) => a.time.localeCompare(b.time))
          return (
            <div key={k} className="lane">
              <div className="lane-head"><span><Pill status={k}>{label}</Pill> <span className="small muted" style={{ fontWeight: 500 }}>{hint}</span></span><span>{lane.length}</span></div>
              {lane.map((c) => (
                <div key={c.id} className={`case ${k}`}>
                  <div className="row between"><strong>{c.name}</strong><span className="small muted tabular">{fmtTime(c.time)}</span></div>
                  <div className="small">{c.complaint}</div>
                  <div className="small muted">{c.age} y · {c.gender} · {c.broughtBy}{c.doctorId ? ` · ${staff(c.doctorId)?.name}` : ''}</div>
                  <div className="row" style={{ gap: 6 }}>
                    <Pill status={c.status} />
                    {c.status === 'waiting' && (
                      <select className="input" style={{ width: 'auto', padding: '3px 6px', fontSize: 12 }} value="" aria-label="Assign doctor" onChange={(e) => update(c, { doctorId: e.target.value, status: 'in-treatment' }, `${c.name} assigned to ${staff(e.target.value).name}`)}>
                        <option value="">Assign doctor</option>
                        {erDocs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    )}
                    {c.status === 'in-treatment' && <>
                      <button className="btn sm" onClick={() => startAdmit(c)}>Admit</button>
                      <button className="btn sm" onClick={() => update(c, { status: 'discharged' }, `${c.name} treated and sent home`)}>Send home</button>
                    </>}
                    {k !== 'red' && <button className="btn sm ghost" onClick={() => update(c, { triage: k === 'green' ? 'yellow' : 'red' }, `${c.name} moved up to ${k === 'green' ? 'Urgent' : 'Critical'}`)}>Escalate</button>}
                  </div>
                </div>
              ))}
              {!lane.length && <div className="small muted" style={{ padding: 6 }}>No patients</div>}
            </div>
          )
        })}
      </div>
      {closed.length > 0 && <p className="small muted">Earlier today: {closed.map((c) => `${c.name} (${c.status})`).join(', ')}</p>}
      {reg && <RegisterArrival onClose={() => setReg(false)} />}
      {admitFor && <AdmitForm patientId={admitFor.p.id} reason={admitFor.c.complaint} onClose={(a) => { if (a) update(admitFor.c, { status: 'admitted' }, `${admitFor.c.name} admitted`); setAdmitFor(null) }} />}
    </>
  )
}

function RegisterArrival({ onClose }) {
  const { tid } = useTenant()
  const [f, setF] = useState({ name: '', age: '', gender: 'M', phone: '', complaint: '', triage: 'yellow', broughtBy: 'Family' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const save = () => {
    if (!f.complaint.trim()) return
    db.add(tid, 'emergencies', { ...f, name: f.name || 'Unknown patient', age: +f.age || 0, date: today(), time: nowTime(), status: 'waiting', doctorId: '' })
    toast('Arrival registered on the triage board')
    onClose()
  }
  return (
    <Modal title="Register emergency arrival" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Add to triage board</button></>}>
      <div className="grid g2">
        <Input id="er-name" label="Name (leave blank if unknown)" value={f.name} onChange={set('name')} />
        <Input id="er-phone" label="Mobile" value={f.phone} onChange={set('phone')} />
        <Input id="er-age" label="Approx. age" type="number" value={f.age} onChange={set('age')} />
        <Select id="er-g" label="Sex" value={f.gender} onChange={set('gender')} options={[{ value: 'M', label: 'Male' }, { value: 'F', label: 'Female' }]} />
        <Select id="er-tri" label="Triage" value={f.triage} onChange={set('triage')} options={[{ value: 'red', label: 'Critical (red)' }, { value: 'yellow', label: 'Urgent (yellow)' }, { value: 'green', label: 'Stable (green)' }]} />
        <Select id="er-by" label="Brought by" value={f.broughtBy} onChange={set('broughtBy')} options={['Ambulance', 'Family', 'Self', 'Police']} />
      </div>
      <Textarea id="er-c" label="Chief complaint" value={f.complaint} onChange={set('complaint')} placeholder="e.g. Chest pain for 30 minutes" />
    </Modal>
  )
}
