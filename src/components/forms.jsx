import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Modal, Input, Select, Textarea, useTenant, toast } from './ui'
import { db } from '../lib/store'
import { today, fmtTime, money } from '../lib/utils'

const SLOTS = ['09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30']

export function PatientForm({ onClose, onSaved, initial }) {
  const { tid } = useTenant()
  const [f, setF] = useState(initial || { name: '', gender: 'F', dob: '', phone: '', email: '', blood: 'O+', address: '', allergies: '', conditions: '', emergencyContact: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const [err, setErr] = useState('')
  const save = () => {
    if (!f.name.trim() || !f.dob || !/^\d{10}$/.test(f.phone)) return setErr('Add the patient’s name, date of birth and a 10-digit mobile number.')
    let row
    if (initial?.id) {
      db.update(tid, 'patients', initial.id, f)
      row = { ...initial, ...f }
      toast('Patient details saved')
    } else {
      row = db.add(tid, 'patients', { ...f, regDate: today() })
      toast(`${row.name} registered as ${row.id}`)
    }
    if (onSaved) onSaved(row)
    else onClose()
  }
  return (
    <Modal title={initial?.id ? 'Edit patient' : 'Register new patient'} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>{initial?.id ? 'Save' : 'Register patient'}</button></>}>
      <div className="grid g2">
        <Input id="pf-name" label="Full name" value={f.name} onChange={set('name')} placeholder="e.g. Sneha Kulkarni" />
        <Input id="pf-phone" label="Mobile number" value={f.phone} onChange={set('phone')} placeholder="10 digits" inputMode="numeric" />
        <Input id="pf-dob" label="Date of birth" type="date" value={f.dob} onChange={set('dob')} max={today()} />
        <Select id="pf-gender" label="Sex" value={f.gender} onChange={set('gender')} options={[{ value: 'F', label: 'Female' }, { value: 'M', label: 'Male' }, { value: 'O', label: 'Other' }]} />
        <Select id="pf-blood" label="Blood group" value={f.blood} onChange={set('blood')} options={['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']} />
        <Input id="pf-email" label="Email (optional)" value={f.email} onChange={set('email')} />
        <Input id="pf-allergies" label="Allergies" value={f.allergies} onChange={set('allergies')} placeholder="None known" />
        <Input id="pf-cond" label="Existing conditions" value={f.conditions} onChange={set('conditions')} placeholder="e.g. Diabetes" />
      </div>
      <Input id="pf-address" label="Address" value={f.address} onChange={set('address')} />
      <Input id="pf-ec" label="Emergency contact" value={f.emergencyContact} onChange={set('emergencyContact')} placeholder="Name · phone" />
      {err && <div className="small" style={{ color: 'var(--bad)' }}>{err}</div>}
    </Modal>
  )
}

export function BookAppointment({ onClose, patientId: fixedPatient, doctorId: fixedDoctor }) {
  const { tid, list, doctors, patient } = useTenant()
  const docs = doctors()
  const [f, setF] = useState({ patientId: fixedPatient || '', doctorId: fixedDoctor || docs[0].id, date: today(), time: '', reason: '' })
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')
  const taken = new Set(list('appointments').filter((a) => a.doctorId === f.doctorId && a.date === f.date && a.status !== 'cancelled').map((a) => a.time))
  const nowHM = new Date().toTimeString().slice(0, 5)
  const free = SLOTS.filter((s) => !taken.has(s) && (f.date > today() || s > nowHM))
  const matches = q.length > 1 ? list('patients').filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.phone.includes(q) || p.id.toLowerCase() === q.toLowerCase()).slice(0, 6) : []
  const doc = docs.find((d) => d.id === f.doctorId)
  const save = () => {
    if (!f.patientId || !f.time) return setErr('Choose a patient and a free time slot.')
    const a = db.add(tid, 'appointments', { ...f, reason: f.reason || 'Consultation', status: 'scheduled', type: 'OPD' })
    toast(`Booked ${patient(f.patientId).name} with ${doc.name} at ${fmtTime(f.time)}`)
    onClose(a)
  }
  return (
    <Modal title="Book appointment" onClose={() => onClose()} footer={<><button className="btn" onClick={() => onClose()}>Cancel</button><button className="btn primary" onClick={save}>Confirm booking</button></>}>
      {!fixedPatient && (
        f.patientId ? (
          <div className="row between card pad" style={{ padding: 10 }}>
            <span><strong>{patient(f.patientId).name}</strong> <span className="muted small">{f.patientId} · {patient(f.patientId).phone}</span></span>
            <button className="btn sm" onClick={() => setF({ ...f, patientId: '' })}>Change</button>
          </div>
        ) : (
          <div className="stack" style={{ gap: 6 }}>
            <Input id="ba-search" label="Patient" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, mobile or UHID" autoFocus />
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
