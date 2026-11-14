import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, Pill as PillIcon, Wallet, ClipboardList, HeartPulse, ScanLine, Pencil, Search, Phone } from 'lucide-react'
import { Card, Modal, Textarea, Input, Avatar, useTenant, toast } from './ui'
import { db } from '../lib/store'
import { fmtDate, fmtTime, money, billTotal, today, age } from '../lib/utils'
import { vitalsText } from './visits'
import { ImageGrid, ImageUpload } from './imaging'

// The first screen of a patient: everything the doctor or front desk asks about, in plain words.
export function PatientSummary({ p, staffView, onOpenDoc, onBook, onBill }) {
  const { list, staff } = useTenant()
  const [planEdit, setPlanEdit] = useState(false)
  const [upload, setUpload] = useState(false)
  const mine = (c) => list(c).filter((r) => r.patientId === p.id)
  const T = today()
  const next = mine('appointments').filter((a) => a.status === 'scheduled' && a.date >= T).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0]
  const rx = mine('prescriptions').sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id))[0]
  const bills = mine('bills').sort((a, b) => b.date.localeCompare(a.date))
  const billed = bills.reduce((s, b) => s + billTotal(b), 0)
  const paid = bills.reduce((s, b) => s + Math.min(b.paid, billTotal(b)), 0)
  const visits = mine('visits').sort((a, b) => b.date.localeCompare(a.date))
  const lastVitals = visits.find((v) => vitalsText(v.vitals))
  const seen = new Set([...visits.map((v) => v.date), ...mine('appointments').filter((a) => a.status === 'completed').map((a) => a.date)]).size
  const treatments = [...new Set(bills.flatMap((b) => b.items.map((i) => i.desc)).filter((d) => !/^Consultation/.test(d)))]

  return (
    <div className="stack">
      <div className="grid g3">
        <Card pad className="sum-card">
          <span className="sum-label"><CalendarClock /> Next appointment</span>
          {next ? (
            <>
              <div className="sum-big">{fmtDate(next.date)}, {fmtTime(next.time)}</div>
              <div className="small muted">{staff(next.doctorId)?.name} · {next.reason}</div>
            </>
          ) : <div className="sum-big muted">Not booked</div>}
          {staffView && <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={onBook}>{next ? 'Book another' : 'Book now'}</button>}
        </Card>
        <Card pad className="sum-card">
          <span className="sum-label"><ClipboardList /> Treatment plan</span>
          <div className="sum-big" style={{ whiteSpace: 'pre-wrap', fontSize: p.plan ? '1rem' : undefined }}>{p.plan || <span className="muted">No plan written yet</span>}</div>
          {p.planOn && <div className="small muted">Updated {fmtDate(p.planOn)}{p.planBy ? ` by ${staff(p.planBy)?.name}` : ''}</div>}
          {staffView && <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setPlanEdit(true)}><Pencil /> {p.plan ? 'Update plan' : 'Write plan'}</button>}
        </Card>
        <Card pad className="sum-card">
          <span className="sum-label"><Wallet /> Charges</span>
          <div className="money-row">
            <div><b>{money(billed)}</b><small>Total</small></div>
            <div><b style={{ color: 'var(--ok)' }}>{money(paid)}</b><small>Paid</small></div>
            <div><b style={{ color: billed - paid > 0 ? 'var(--bad)' : undefined }}>{money(billed - paid)}</b><small>Due</small></div>
          </div>
          {treatments.length > 0 && <div className="small muted">Treatments: {treatments.slice(0, 5).join(', ')}{treatments.length > 5 ? '…' : ''}</div>}
          <div className="row" style={{ gap: 6 }}>
            {bills[0] && <button className="btn sm" onClick={() => onOpenDoc({ k: 'bill', v: bills[0] })}>Last bill</button>}
            {staffView && onBill && <button className="btn sm" onClick={onBill}>New bill</button>}
          </div>
        </Card>
      </div>
      <div className="grid g2">
        <Card pad className="sum-card">
          <span className="sum-label"><PillIcon /> Last prescription</span>
          {rx ? (
            <>
              <div><span className="sum-big">{rx.diagnosis}</span> <span className="small muted">· {fmtDate(rx.date)} · {staff(rx.doctorId)?.name}</span></div>
              {rx.items.length > 0 && (
                <table className="rx-mini"><tbody>
                  {rx.items.map((i, k) => <tr key={k}><td>{i.name}</td><td>{i.dose}</td><td>{i.freq}</td><td className="tabular">{i.days} days</td></tr>)}
                </tbody></table>
              )}
              {rx.notes && <div className="small"><strong>Advice:</strong> {rx.notes}</div>}
              <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => onOpenDoc({ k: 'rx', v: rx })}>Open / print</button>
            </>
          ) : <div className="muted">No prescription yet.</div>}
        </Card>
        <Card pad className="sum-card">
          <span className="sum-label"><HeartPulse /> Health at a glance</span>
          <dl className="kv">
            <dt>Visits</dt><dd>{seen || 'First visit'}</dd>
            <dt>Latest vitals</dt><dd>{lastVitals ? <>{vitalsText(lastVitals.vitals)} <span className="muted small">({fmtDate(lastVitals.date)})</span></> : '–'}</dd>
            <dt>Allergies</dt><dd style={{ color: p.allergies ? 'var(--bad)' : undefined }}>{p.allergies || 'None told'}</dd>
            <dt>Conditions</dt><dd>{p.conditions || 'None told'}</dd>
            <dt>Mobile</dt><dd><a href={`tel:+91${p.phone}`}>{p.phone}</a></dd>
            {p.email && <><dt>Email</dt><dd>{p.email}</dd></>}
            <dt>Registered</dt><dd>{fmtDate(p.regDate)}{p.selfRegistered ? ' · by QR' : ''}</dd>
          </dl>
        </Card>
      </div>
      <Card pad className="sum-card">
        <span className="sum-label"><ScanLine /> X-rays and photos</span>
        <ImageGrid p={p} limit={6} onAdd={staffView ? () => setUpload(true) : null} />
      </Card>
      {planEdit && <PlanForm p={p} onClose={() => setPlanEdit(false)} />}
      {upload && <ImageUpload patientId={p.id} onClose={() => setUpload(false)} />}
    </div>
  )
}

export function PlanForm({ p, onClose }) {
  const { tid, user } = useTenant()
  const [plan, setPlan] = useState(p.plan || '')
  const save = () => {
    db.update(tid, 'patients', p.id, { plan: plan.trim(), planOn: today(), planBy: user.refId })
    toast('Treatment plan saved')
    onClose()
  }
  return (
    <Modal title={`Treatment plan · ${p.name}`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save plan</button></>}>
      <Textarea id="plan-text" label="What happens next, step by step" rows={5} value={plan} onChange={(e) => setPlan(e.target.value)} placeholder={'e.g.\n1. RCT on 36, two sittings\n2. Crown on 36 after RCT\n3. Scaling in 6 months'} autoFocus />
    </Modal>
  )
}

// Type a mobile number or name; the patient opens in one tap.
export function PatientFinder({ autoFocus }) {
  const { list, base } = useTenant()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const digits = q.replace(/\D/g, '')
  const term = q.trim().toLowerCase()
  const hits = term.length < 2 ? [] : list('patients').filter((p) => (digits.length >= 3 && p.phone.includes(digits)) || p.name.toLowerCase().includes(term) || p.id.toLowerCase() === term).slice(0, 6)
  const open = (p) => { setQ(''); nav(`${base}/patients/${p.id}`) }
  return (
    <div className="finder">
      <Search />
      <Input id="finder" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && hits[0]) open(hits[0]) }} placeholder="Find patient: type mobile number or name" aria-label="Find patient by mobile number or name" inputMode="search" autoComplete="off" autoFocus={autoFocus} />
      {term.length >= 2 && (
        <div className="finder-list" role="listbox">
          {hits.length ? hits.map((p) => (
            <button key={p.id} role="option" onClick={() => open(p)}>
              <Avatar name={p.name} />
              <span style={{ flex: 1, minWidth: 0 }}><strong>{p.name}</strong><div className="small muted">{p.id} · {p.dob ? `${age(p.dob)} y · ` : ''}<Phone size={11} style={{ verticalAlign: '-1px' }} /> {p.phone}</div></span>
            </button>
          )) : <div className="small muted" style={{ padding: 12 }}>No patient with that mobile or name. Register them from Patients, or share the QR code.</div>}
        </div>
      )}
    </div>
  )
}
