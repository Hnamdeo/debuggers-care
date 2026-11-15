import { slotsOn } from '../lib/slots'
import { QrPanel } from './qrpanel'
import { NotifyButtons } from './reminders'
import { samePerson } from '../lib/patients'
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Modal, Input, Select, Textarea, useTenant, toast, celebrate } from './ui'
import { db } from '../lib/store'
import { today, addDays, fmtTime, fmtDate, money } from '../lib/utils'


export function PatientForm({ onClose, onSaved, initial }) {
  const { tid, list } = useTenant()
  const [dupOk, setDupOk] = useState(false)
  const [f, setF] = useState({ name: '', gender: '', dob: '', phone: '', email: '', blood: '', address: '', allergies: '', conditions: '', emergencyContact: '', ...initial })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const [err, setErr] = useState('')
  const save = () => {
    if (!f.name.trim()) return setErr('Add the patient’s name.')
    if (!/^\d{10}$/.test(f.phone || '') && !(f.noPhone && !f.phone)) return setErr('Add a 10-digit mobile number, or tick “No mobile number”.')
    const twin = !initial?.id && list('patients').find((p) => samePerson(p, f))
    if (twin && !dupOk) { setDupOk(true); return setErr(`${twin.name} (${twin.id}) is already registered with this mobile. Open that record instead, or press Register again to add a new patient.`) }
    if (!f.dob && f.ageYears) { f.dob = `${new Date().getFullYear() - +f.ageYears}-01-01`; f.dobApprox = true }
    else if (f.dob && f.dobApprox && initial?.dob !== f.dob) f.dobApprox = false
    let row
    if (initial?.id) {
      db.update(tid, 'patients', initial.id, f)
      row = { ...initial, ...f }
      toast('Patient details saved')
    } else {
      row = db.add(tid, 'patients', { ...f, regDate: today() })
      celebrate({ name: row.name, id: row.id, sub: 'Saved to the clinic records' })
    }
    if (onSaved) onSaved(row)
    else onClose()
  }
  return (
    <Modal wide={!initial?.id} title={initial?.id ? 'Edit patient' : 'Register new patient'} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>{initial?.id ? 'Save' : 'Register patient'}</button></>}>
      <div className={initial?.id ? '' : 'reg-split'}>
      <div className="stack">
      <div className="grid g2">
        <Input id="pf-name" label="Full name" value={f.name} onChange={set('name')} placeholder="e.g. Sneha Kulkarni" />
        <div className="stack" style={{ gap: 4 }}>
          <Input id="pf-phone" label="Mobile number" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, '').slice(-10), noPhone: false })} placeholder="10 digits" inputMode="numeric" />
          {!initial?.id && /^\d{10}$/.test(f.phone || '') && list('patients').filter((p) => p.phone === f.phone).map((p) => <span key={p.id} className="small" style={{ color: 'var(--warn)' }}>Same mobile: {p.name} ({p.id})</span>)}
          {!f.phone && <label className="small row" style={{ gap: 6, cursor: 'pointer' }}><input type="checkbox" checked={!!f.noPhone} onChange={(e) => setF({ ...f, noPhone: e.target.checked })} /> No mobile number</label>}
        </div>
        <Input id="pf-dob" label="Date of birth (or age below)" type="date" value={f.dobApprox ? '' : f.dob} onChange={set('dob')} max={today()} />
        {(!f.dob || f.dobApprox) && <Input id="pf-age" label="Age in years" value={f.ageYears || ''} onChange={(e) => setF({ ...f, ageYears: e.target.value.replace(/\D/g, '').slice(0, 3), dob: '', dobApprox: false })} inputMode="numeric" placeholder="If date of birth is not known" />}
        <Select id="pf-gender" label="Sex" value={f.gender} onChange={set('gender')} options={[{ value: '', label: 'Not recorded' }, { value: 'F', label: 'Female' }, { value: 'M', label: 'Male' }, { value: 'O', label: 'Other' }]} />
        <Select id="pf-blood" label="Blood group" value={f.blood} onChange={set('blood')} options={[{ value: '', label: 'Not known' }, ...['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']]} />
        <Input id="pf-opd" label="OPD / register no. (optional)" value={f.opdNo || ''} onChange={set('opdNo')} placeholder="From the paper register" />
        <Input id="pf-email" label="Email (optional)" value={f.email} onChange={set('email')} />
        <Input id="pf-allergies" label="Allergies" value={f.allergies} onChange={set('allergies')} placeholder="None known" />
        <Input id="pf-cond" label="Existing conditions" value={f.conditions} onChange={set('conditions')} placeholder="e.g. Diabetes" />
      </div>
      <Input id="pf-address" label="Address" value={f.address} onChange={set('address')} />
      <Input id="pf-ec" label="Emergency contact" value={f.emergencyContact} onChange={set('emergencyContact')} placeholder="Name · phone" />
      {err && <div className="small" style={{ color: 'var(--bad)' }}>{err}</div>}
      </div>
      {!initial?.id && <QrPanel phone={f.phone} />}
      </div>
    </Modal>
  )
}

// move: an existing appointment to reschedule (same patient, new doctor/date/time).
export function BookAppointment({ onClose, patientId: fixedPatient, doctorId: fixedDoctor, date: initDate, time: initTime, move }) {
  const { tid, tenant, list, doctors, patient } = useTenant()
  const docs = doctors()
  const [f, setF] = useState(move
    ? { patientId: move.patientId, doctorId: move.doctorId, date: move.date < today() ? today() : move.date, time: '', reason: move.reason || '' }
    : { patientId: fixedPatient || '', doctorId: fixedDoctor || docs[0].id, date: initDate || today(), time: initTime || '', reason: '' })
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')
  const [newP, setNewP] = useState(false)
  const [done, setDone] = useState(null)
  const taken = new Set(list('appointments').filter((a) => a.doctorId === f.doctorId && a.date === f.date && !['cancelled', 'no-show'].includes(a.status) && a.id !== move?.id).map((a) => a.time))
  const nowHM = new Date().toTimeString().slice(0, 5)
  const free = slotsOn(tenant, f.date).filter((s) => !taken.has(s) && (f.date > today() || s > nowHM))
  const matches = q.length > 1 ? list('patients').filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.phone.includes(q) || p.id.toLowerCase() === q.toLowerCase()).slice(0, 6) : []
  const doc = docs.find((d) => d.id === f.doctorId)
  const save = () => {
    if (!f.patientId || !f.time) return setErr('Choose a patient and a free time slot.')
    const a = move
      ? db.update(tid, 'appointments', move.id, { doctorId: f.doctorId, date: f.date, time: f.time, reason: f.reason || move.reason, status: 'scheduled', remindedAt: null, movedFrom: `${move.date} ${move.time}` }) || { ...move, ...f, status: 'scheduled' }
      : db.add(tid, 'appointments', { ...f, reason: f.reason || 'Consultation', status: 'scheduled', type: 'OPD' })
    toast(`${move ? 'Moved' : 'Booked'} ${patient(f.patientId).name} with ${doc.name}, ${fmtDate(f.date)} at ${fmtTime(f.time)}`)
    if (/^\d{10}$/.test(patient(f.patientId)?.phone || '')) setDone(a)
    else onClose(a)
  }
  if (done) return (
    <Modal title={move ? 'Appointment moved' : 'Appointment booked'} onClose={() => onClose(done)} footer={<><button className="btn" onClick={() => onClose(done)}>Done</button><NotifyButtons a={done} kind={move ? 'moved' : 'booked'} small={false} wide /></>}>
      <p style={{ margin: 0 }}><strong>{patient(done.patientId).name}</strong> with {doc.name}, {fmtDate(done.date)} at {fmtTime(done.time)}.</p>
      <p className="small muted" style={{ margin: 0 }}>Let the patient know now on WhatsApp, or by SMS if they don’t use WhatsApp. A reminder can be sent the day before from the dashboard.</p>
    </Modal>
  )
  return (
    <Modal title={move ? 'Move appointment' : 'Book appointment'} onClose={() => onClose()} footer={<><button className="btn" onClick={() => onClose()}>Cancel</button><button className="btn primary" onClick={save}>{move ? 'Move to this time' : 'Confirm booking'}</button></>}>
      {move && <div className="small muted">Now: {fmtDate(move.date)} at {fmtTime(move.time)}. Pick the new day and time.</div>}
      {!fixedPatient && !move && (
        f.patientId ? (
          <div className="row between card pad" style={{ padding: 10 }}>
            <span><strong>{patient(f.patientId).name}</strong> <span className="muted small">{f.patientId} · {patient(f.patientId).phone}</span></span>
            <button className="btn sm" onClick={() => setF({ ...f, patientId: '' })}>Change</button>
          </div>
        ) : (
          <div className="stack" style={{ gap: 6 }}>
            <Input id="ba-search" label="Patient" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, mobile or UHID" autoFocus />
            {q.length > 1 && !matches.length && <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setNewP(true)}>No match. Register a new patient</button>}
            {matches.map((p) => (
              <button key={p.id} className="role-btn" style={{ padding: '7px 10px' }} onClick={() => setF({ ...f, patientId: p.id })}>
                <span><strong>{p.name}</strong> <span className="muted small">{p.id} · {p.phone}</span></span>
              </button>
            ))}
          </div>
        )
      )}
      <div className="grid g2">
        <Select id="ba-doc" label="Doctor" value={f.doctorId} onChange={(e) => setF({ ...f, doctorId: e.target.value, time: '' })} disabled={!!fixedDoctor} options={docs.map((d) => ({ value: d.id, label: `${d.name} · ${d.dept}` }))} />
        <Input id="ba-date" label="Date" type="date" min={today()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value, time: '' })} />
      </div>
      <div className="row" style={{ gap: 6 }}>
        {[['Today', 0], ['Tomorrow', 1], ['In 3 days', 3], ['1 week', 7], ['2 weeks', 14], ['1 month', 30]].map(([l, n]) => {
          const d = addDays(today(), n)
          return <button key={l} className={`btn sm ${f.date === d ? 'primary' : ''}`} onClick={() => setF({ ...f, date: d, time: '' })}>{l}</button>
        })}
      </div>
      <div className="field">
        <span>Free slots ({free.length}) · consultation fee {money(doc.fee)}</span>
        <div className="row" style={{ gap: 6 }}>
          {free.length ? free.map((s) => (
            <button key={s} className={`btn sm ${f.time === s ? 'primary' : ''}`} onClick={() => setF({ ...f, time: s })}>{fmtTime(s)}</button>
          )) : <span className="muted small">No free slots left on this day. Pick another date.</span>}
        </div>
      </div>
      <Input id="ba-reason" label="Reason for visit" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="e.g. Tooth pain" />
      {err && <div className="small" style={{ color: 'var(--bad)' }}>{err}</div>}
      {newP && <PatientForm initial={/^\d{10}$/.test(q) ? { phone: q } : { name: q }} onClose={() => setNewP(false)} onSaved={(row) => { setNewP(false); setF((x) => ({ ...x, patientId: row.id })) }} />}
    </Modal>
  )
}

export function NewBill({ onClose, patientId: fixedPatient, source = 'OPD' }) {
  const { tid, tenant, list, patient } = useTenant()
  const [pid, setPid] = useState(fixedPatient || '')
  const [q, setQ] = useState('')
  const [items, setItems] = useState([{ desc: tenant.services[0][0], qty: 1, rate: tenant.services[0][1] }])
  const [discount, setDiscount] = useState(0)
  const [pay, setPay] = useState('now')
  const [mode, setMode] = useState('UPI')
  const total = Math.max(0, items.reduce((s, i) => s + i.qty * i.rate, 0) - discount)
  const matches = q.length > 1 ? list('patients').filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.phone.includes(q)).slice(0, 5) : []
  const upd = (i, k, v) => setItems(items.map((it, j) => (j === i ? { ...it, [k]: v } : it)))
  const save = () => {
    if (!pid || !items.length) return
    const b = db.add(tid, 'bills', { patientId: pid, date: today(), source, items: items.map((i) => ({ ...i, qty: +i.qty, rate: +i.rate })), discount: +discount, paid: pay === 'now' ? total : 0, mode })
    toast(`Invoice ${b.id} created for ${money(total)}`)
    onClose(b)
  }
  return (
    <Modal wide title="New bill" onClose={() => onClose()} footer={<><span className="muted" style={{ marginRight: 'auto' }}>Total <strong className="tabular" style={{ color: 'var(--fg)', fontSize: 16 }}>{money(total)}</strong></span><button className="btn" onClick={() => onClose()}>Cancel</button><button className="btn primary" disabled={!pid} onClick={save}>Create invoice</button></>}>
      {!fixedPatient && (pid ? (
        <div className="row between"><span><strong>{patient(pid).name}</strong> <span className="muted small">{pid}</span></span><button className="btn sm" onClick={() => setPid('')}>Change</button></div>
      ) : (
        <div className="stack" style={{ gap: 6 }}>
          <Input id="nb-q" label="Patient" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or mobile" />
          {matches.map((p) => <button key={p.id} className="role-btn" style={{ padding: '7px 10px' }} onClick={() => setPid(p.id)}><strong>{p.name}</strong> <span className="muted small">{p.id}</span></button>)}
        </div>
      ))}
      <div className="stack" style={{ gap: 8 }}>
        {items.map((it, i) => (
          <div key={i} className="rx-line">
            <Input id={`nb-d${i}`} label={i === 0 ? 'Service' : undefined} list="svc" value={it.desc} onChange={(e) => {
              const svc = tenant.services.find((s) => s[0] === e.target.value)
              setItems(items.map((x, j) => (j === i ? { ...x, desc: e.target.value, rate: svc ? svc[1] : x.rate } : x)))
            }} />
            <Input id={`nb-q${i}`} label={i === 0 ? 'Qty' : undefined} type="number" min="1" value={it.qty} onChange={(e) => upd(i, 'qty', e.target.value)} />
            <Input id={`nb-r${i}`} label={i === 0 ? 'Rate (₹)' : undefined} type="number" min="0" value={it.rate} onChange={(e) => upd(i, 'rate', e.target.value)} />
            <span className="tabular" style={{ paddingBottom: 8 }}>{money(it.qty * it.rate)}</span>
            <button className="btn ghost sm" aria-label="Remove line" onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 /></button>
          </div>
        ))}
        <datalist id="svc">{tenant.services.map(([n]) => <option key={n} value={n} />)}</datalist>
        <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setItems([...items, { desc: '', qty: 1, rate: 0 }])}><Plus /> Add line</button>
      </div>
      <div className="grid g3">
        <Input id="nb-disc" label="Discount (₹)" type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        <Select id="nb-pay" label="Payment" value={pay} onChange={(e) => setPay(e.target.value)} options={[{ value: 'now', label: 'Paid now' }, { value: 'later', label: 'Pay later' }]} />
        <Select id="nb-mode" label="Mode" value={mode} onChange={(e) => setMode(e.target.value)} options={['UPI', 'Cash', 'Card', 'Insurance']} />
      </div>
    </Modal>
  )
}

export function AdmitForm({ onClose, patientId: fixedPatient, bedId: fixedBed, reason: initReason = '' }) {
  const { tid, list, doctors, patient } = useTenant()
  const occupied = new Set(list('admissions').filter((a) => a.status === 'admitted').map((a) => a.bedId))
  const freeBeds = list('beds').filter((b) => !occupied.has(b.id))
  const [f, setF] = useState({ patientId: fixedPatient || '', bedId: fixedBed || freeBeds[0]?.id, doctorId: doctors()[0].id, reason: initReason })
  const [q, setQ] = useState('')
  const matches = q.length > 1 ? list('patients').filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.phone.includes(q)).slice(0, 5) : []
  const save = () => {
    if (!f.patientId || !f.bedId) return
    const a = db.add(tid, 'admissions', { ...f, admitDate: today(), status: 'admitted', vitals: {}, notes: '' })
    toast(`${patient(f.patientId).name} admitted to ${list('beds').find((b) => b.id === f.bedId).number}`)
    onClose(a)
  }
  return (
    <Modal title="Admit patient" onClose={() => onClose()} footer={<><button className="btn" onClick={() => onClose()}>Cancel</button><button className="btn primary" disabled={!f.patientId || !f.bedId} onClick={save}>Admit</button></>}>
      {!fixedPatient && (f.patientId ? (
        <div className="row between"><strong>{patient(f.patientId).name}</strong><button className="btn sm" onClick={() => setF({ ...f, patientId: '' })}>Change</button></div>
      ) : (
        <div className="stack" style={{ gap: 6 }}>
          <Input id="ad-q" label="Patient" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or mobile" />
          {matches.map((p) => <button key={p.id} className="role-btn" style={{ padding: '7px 10px' }} onClick={() => setF({ ...f, patientId: p.id })}><strong>{p.name}</strong> <span className="muted small">{p.id}</span></button>)}
        </div>
      ))}
      <div className="grid g2">
        <Select id="ad-bed" label="Bed" value={f.bedId} onChange={(e) => setF({ ...f, bedId: e.target.value })} options={freeBeds.map((b) => ({ value: b.id, label: `${b.number} · ${b.ward} · ${money(b.rate)}/day` }))} />
        <Select id="ad-doc" label="Consultant" value={f.doctorId} onChange={(e) => setF({ ...f, doctorId: e.target.value })} options={doctors().map((d) => ({ value: d.id, label: `${d.name} · ${d.dept}` }))} />
      </div>
      <Textarea id="ad-reason" label="Reason for admission" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} />
    </Modal>
  )
}
