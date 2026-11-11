import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2, CheckCircle2, ArrowLeft } from 'lucide-react'
import { useTenant, Card, Input, Textarea, toast, Pill } from '../components/ui'
import { PatientHeader } from './Patients'
import { db } from '../lib/store'
import { LAB_CATALOG } from '../lib/seed'
import { fmtDate, fmtTime, money, today } from '../lib/utils'

const FREQ = ['Once a day', 'Twice a day', 'Three times a day', 'At night', 'Before breakfast', 'Twice a day after food', 'When needed for pain', 'Once a week']

export default function Consult() {
  const { id } = useParams()
  const { tid, tenant, list, patient, staff, base } = useTenant()
  const nav = useNavigate()
  const appt = list('appointments').find((a) => a.id === id)
  const p = appt && patient(appt.patientId)
  const doc = appt && staff(appt.doctorId)
  const meds = list('medicines')
  const [dx, setDx] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([{ name: '', dose: '1 tab', freq: 'Twice a day', days: 5 }])
  const [tests, setTests] = useState([])
  const [procs, setProcs] = useState([])
  const [err, setErr] = useState('')
  if (!appt || !p) return <div className="empty">Appointment not found.</div>

  const history = list('prescriptions').filter((r) => r.patientId === p.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)
  const reports = list('reports').filter((r) => r.patientId === p.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)
  const upd = (i, k, v) => setLines(lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)))
  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  const allergic = p.allergies && lines.some((l) => l.name && p.allergies.toLowerCase().includes('penicillin') && /amoxi|penicillin/i.test(l.name))

  const finish = () => {
    if (!dx.trim()) return setErr('Add a diagnosis before completing the visit.')
    const items = lines.filter((l) => l.name.trim()).map((l) => {
      const m = meds.find((x) => x.name === l.name)
      const per = /Three/.test(l.freq) ? 3 : /Twice/.test(l.freq) ? 2 : /week/.test(l.freq) ? 1 / 7 : 1
      return { medicineId: m?.id, name: l.name, dose: l.dose, freq: l.freq, days: +l.days, qty: m && ['Tablet', 'Capsule'].includes(m.form) ? Math.ceil(per * l.days) : 1 }
    })
    const rx = db.add(tid, 'prescriptions', { patientId: p.id, doctorId: doc.id, appointmentId: appt.id, date: today(), diagnosis: dx, notes, items, dispensed: false })
    tests.forEach((t) => db.add(tid, 'reports', { patientId: p.id, doctorId: doc.id, date: today(), test: t, category: LAB_CATALOG[t].category, price: LAB_CATALOG[t].price, status: 'ordered', results: [], findings: '', completedDate: '' }))
    const bill = db.add(tid, 'bills', {
      patientId: p.id, date: today(), source: 'OPD', ref: appt.id, discount: 0, paid: 0, mode: 'UPI',
      items: [
        { desc: `Consultation · ${doc.name}`, qty: 1, rate: doc.fee },
        ...procs.map((n) => ({ desc: n, qty: 1, rate: tenant.services.find((s) => s[0] === n)[1] })),
        ...tests.map((t) => ({ desc: t, qty: 1, rate: LAB_CATALOG[t].price })),
      ],
    })
    db.update(tid, 'appointments', appt.id, { status: 'completed', prescriptionId: rx.id })
    toast(`Visit completed. Prescription ${rx.id} and bill ${bill.id} sent to the front desk.`)
    nav(`${base}/patients/${p.id}`)
  }

  return (
    <>
      <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => nav(-1)}><ArrowLeft /> Back</button>
      <PatientHeader p={p}>
        <span className="muted small">{fmtDate(appt.date)} · {fmtTime(appt.time)} · {appt.reason}</span>
      </PatientHeader>
      {allergic && <div className="card pad" style={{ borderColor: 'var(--bad)', color: 'var(--bad)', fontWeight: 600 }}>Allergy alert: {p.name} is allergic to {p.allergies}. Check the antibiotic before you sign.</div>}
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' }}>
        <div className="stack">
          <Card title="Consultation">
            <div className="stack">
              <Input id="cs-dx" label="Diagnosis" list="dx-list" value={dx} onChange={(e) => setDx(e.target.value)} placeholder="Start typing" />
              <datalist id="dx-list">{tenant.diagnoses.map((d) => <option key={d} value={d} />)}</datalist>
              <div className="field"><span>Medicines</span></div>
              {lines.map((l, i) => (
                <div key={i} className="rx-line">
                  <Input id={`cs-m${i}`} list="med-list" value={l.name} onChange={(e) => upd(i, 'name', e.target.value)} placeholder="Medicine" aria-label="Medicine" />
                  <Input id={`cs-d${i}`} value={l.dose} onChange={(e) => upd(i, 'dose', e.target.value)} aria-label="Dose" />
                  <select className="input" value={l.freq} onChange={(e) => upd(i, 'freq', e.target.value)} aria-label="When">{FREQ.map((f) => <option key={f}>{f}</option>)}</select>
                  <Input id={`cs-n${i}`} type="number" min="1" value={l.days} onChange={(e) => upd(i, 'days', e.target.value)} aria-label="Days" />
                  <button className="btn ghost sm" onClick={() => setLines(lines.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 /></button>
                </div>
              ))}
              <datalist id="med-list">{meds.map((m) => <option key={m.id} value={m.name}>{m.stock} in stock</option>)}</datalist>
              <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setLines([...lines, { name: '', dose: '1 tab', freq: 'Twice a day', days: 5 }])}><Plus /> Add medicine</button>
              <Textarea id="cs-notes" label="Advice for the patient" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Review after 1 week" />
            </div>
          </Card>
          <div className="grid g2">
            <Card title="Order tests">
              <div className="stack" style={{ gap: 6 }}>
                {tenant.tests.map((t) => (
                  <label key={t} className="row" style={{ cursor: 'pointer', flexWrap: 'nowrap' }}>
                    <input type="checkbox" checked={tests.includes(t)} onChange={() => toggle(tests, setTests, t)} />
                    <span style={{ flex: 1 }}>{t}</span><span className="muted small tabular">{money(LAB_CATALOG[t].price)}</span>
                  </label>
                ))}
              </div>
            </Card>
            <Card title="Procedures done today">
              <div className="stack" style={{ gap: 6 }}>
                {tenant.services.slice(1).map(([n, r]) => (
                  <label key={n} className="row" style={{ cursor: 'pointer', flexWrap: 'nowrap' }}>
                    <input type="checkbox" checked={procs.includes(n)} onChange={() => toggle(procs, setProcs, n)} />
                    <span style={{ flex: 1 }}>{n}</span><span className="muted small tabular">{money(r)}</span>
                  </label>
                ))}
              </div>
            </Card>
          </div>
          {err && <div style={{ color: 'var(--bad)' }}>{err}</div>}
          <div className="row">
            <button className="btn primary" onClick={finish}><CheckCircle2 /> Complete visit and send bill</button>
            <span className="muted small">Bill: consultation {money(doc.fee)}{procs.length + tests.length ? ` + ${procs.length + tests.length} items` : ''}</span>
          </div>
        </div>
        <div className="stack">
          <Card title="Past prescriptions">
            {history.length ? history.map((r) => (
              <div key={r.id} className="tl-item" style={{ gridTemplateColumns: '1fr' }}>
                <div className="small muted">{fmtDate(r.date)} · {staff(r.doctorId)?.name}</div>
                <div style={{ fontWeight: 600 }}>{r.diagnosis}</div>
                <div className="small">{r.items.map((i) => i.name).join(', ')}</div>
              </div>
            )) : <div className="muted small">First visit, nothing on record.</div>}
          </Card>
          <Card title="Recent reports">
            {reports.length ? reports.map((r) => (
              <div key={r.id} className="row between" style={{ padding: '6px 0' }}>
                <span><strong>{r.test}</strong><div className="small muted">{fmtDate(r.date)}</div></span>
                <Pill status={r.status === 'completed' ? (r.results.some((x) => x.flag) ? 'red' : 'ok') : 'ordered'}>{r.status === 'completed' ? (r.results.some((x) => x.flag) ? 'Abnormal' : 'Normal') : 'In lab'}</Pill>
              </div>
            )) : <div className="muted small">No reports yet.</div>}
          </Card>
        </div>
      </div>
    </>
  )
}
