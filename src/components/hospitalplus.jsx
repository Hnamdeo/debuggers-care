import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Wallet, ClipboardPen, Pill as PillIcon, Check, FileText, Scissors, ShieldCheck } from 'lucide-react'
import { useTenant, Card, Table, Modal, Input, Select, Textarea, DocModal, SheetHead, PageHead, Stat, toast } from './ui'
import { db } from '../lib/store'
import { today, fmtDate, fmtTime, money, age, daysBetween, nowTime } from '../lib/utils'

// Hospital extras (26 Nov 2026): running bill with advance deposits, doctor's daily notes and the
// medicine chart for admitted patients, discharge summary, OT schedule and insurance / Ayushman claims.

/* ---------------- Running bill and advance deposits ---------------- */

export function ipdLines(adm, bed, upto = today()) {
  const days = Math.max(1, daysBetween(adm.admitDate, upto))
  return [
    { desc: `${bed.ward} bed charges (${bed.number})`, qty: days, rate: bed.rate },
    { desc: 'Doctor visits', qty: days, rate: bed.ward === 'ICU' ? 1500 : 800 },
    { desc: 'Nursing care', qty: days, rate: bed.ward === 'ICU' ? 1200 : 600 },
    ...(adm.extras || []),
  ]
}
export const linesTotal = (lines) => lines.reduce((s, l) => s + l.qty * l.rate, 0)
export const depositsFor = (list, adm) => list('deposits').filter((d) => d.admissionId === adm.id)

export function RunningBill({ adm, bed }) {
  const { tid, list } = useTenant()
  const [f, setF] = useState({ amount: '', mode: 'UPI' })
  const [x, setX] = useState({ desc: '', amount: '' })
  const lines = ipdLines(adm, bed)
  const total = linesTotal(lines)
  const deps = depositsFor(list, adm)
  const paid = deps.reduce((s, d) => s + d.amount, 0)
  const collect = () => {
    const amount = +f.amount
    if (!(amount > 0)) return toast('Enter the amount')
    db.add(tid, 'deposits', { admissionId: adm.id, patientId: adm.patientId, date: today(), time: nowTime(), amount, mode: f.mode })
    setF({ amount: '', mode: f.mode })
    toast(`Advance of ${money(amount)} received`)
  }
  const addCharge = () => {
    if (!x.desc.trim() || !(+x.amount > 0)) return toast('Enter what it is and the amount')
    db.update(tid, 'admissions', adm.id, { extras: [...(adm.extras || []), { desc: x.desc.trim(), qty: 1, rate: +x.amount, date: today() }] })
    setX({ desc: '', amount: '' })
  }
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="grid g3">
        <Stat label="Bill so far" value={money(total)} sub={`${lines[0].qty} day${lines[0].qty > 1 ? 's' : ''}`} />
        <Stat label="Advance received" value={money(paid)} sub={`${deps.length} payment${deps.length === 1 ? '' : 's'}`} />
        <Stat label={paid >= total ? 'Advance left' : 'Balance to collect'} value={money(Math.abs(total - paid))} sub={paid >= total ? 'Refund or adjust at discharge' : 'Ask the family to top up'} />
      </div>
      <table className="mini-table">
        <tbody>
          {lines.map((l, i) => <tr key={i}><td>{l.desc}{l.qty > 1 ? ` × ${l.qty}` : ''}</td><td className="num">{money(l.qty * l.rate)}</td></tr>)}
          {deps.map((d) => <tr key={d.id} className="muted"><td>Advance {fmtDate(d.date)} · {d.mode}</td><td className="num">− {money(d.amount)}</td></tr>)}
        </tbody>
      </table>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div style={{ width: 150 }}><Input label="Collect advance (₹)" inputMode="numeric" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
        <div style={{ width: 120 }}><Select label="Mode" value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })} options={['UPI', 'Cash', 'Card', 'Bank transfer']} /></div>
        <button className="btn primary" onClick={collect}><Wallet /> Receive</button>
      </div>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 180 }}><Input label="Add a charge (procedure, OT, implant…)" value={x.desc} onChange={(e) => setX({ ...x, desc: e.target.value })} placeholder="e.g. OT charges" /></div>
        <div style={{ width: 130 }}><Input label="Amount (₹)" inputMode="numeric" value={x.amount} onChange={(e) => setX({ ...x, amount: e.target.value })} /></div>
        <button className="btn" onClick={addCharge}><Plus /> Add</button>
      </div>
    </div>
  )
}

/* ---------------- Daily notes and medicine chart ---------------- */

export function NotesAndMeds({ adm }) {
  const { tid, list, me, user } = useTenant()
  const [note, setNote] = useState('')
  const [m, setM] = useState({ name: '', dose: '', freq: 'Twice a day', route: 'Oral' })
  const notes = list('ipdnotes').filter((n) => n.admissionId === adm.id).sort((a, b) => b.at.localeCompare(a.at))
  const meds = adm.meds || []
  const by = me?.name || user.role
  const addNote = () => {
    if (!note.trim()) return
    db.add(tid, 'ipdnotes', { admissionId: adm.id, patientId: adm.patientId, at: new Date().toISOString(), kind: 'note', text: note.trim(), by })
    setNote('')
    toast('Note added')
  }
  const addMed = () => {
    if (!m.name.trim()) return toast('Enter the medicine')
    db.update(tid, 'admissions', adm.id, { meds: [...meds, { ...m, name: m.name.trim(), from: today() }] })
    setM({ name: '', dose: '', freq: m.freq, route: m.route })
  }
  const stop = (i) => db.update(tid, 'admissions', adm.id, { meds: meds.map((x, j) => (j === i ? { ...x, stopped: today() } : x)) })
  const give = (x) => {
    db.add(tid, 'ipdnotes', { admissionId: adm.id, patientId: adm.patientId, at: new Date().toISOString(), kind: 'given', text: `${x.name} ${x.dose} (${x.route})`, med: x.name, by })
    toast(`${x.name} marked as given`)
  }
  const givenToday = (name) => notes.filter((n) => n.kind === 'given' && n.med === name && n.at.slice(0, 10) === today())
  const t = (iso) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div>
        <h3 style={{ marginBottom: 8 }}>Medicine chart</h3>
        {meds.length ? (
          <table className="mini-table">
            <thead><tr><th>Medicine</th><th>Dose · route</th><th>How often</th><th>Given today</th><th /></tr></thead>
            <tbody>
              {meds.map((x, i) => {
                const g = givenToday(x.name)
                return (
                  <tr key={i} className={x.stopped ? 'muted' : ''}>
                    <td><b>{x.name}</b>{x.stopped && <div className="small">Stopped {fmtDate(x.stopped)}</div>}</td>
                    <td>{x.dose} · {x.route}</td>
                    <td>{x.freq}</td>
                    <td className="small">{g.length ? g.map((n) => t(n.at)).join(', ') : '–'}</td>
                    <td className="num">{!x.stopped && <><button className="btn sm primary" onClick={() => give(x)}><Check /> Given</button> <button className="btn sm ghost" onClick={() => stop(i)}>Stop</button></>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : <p className="small muted">No medicines charted yet.</p>}
        <div className="row" style={{ alignItems: 'flex-end', marginTop: 8 }}>
          <div style={{ flex: 2, minWidth: 160 }}><Input label="Medicine" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} placeholder="e.g. Inj. Ceftriaxone" /></div>
          <div style={{ width: 100 }}><Input label="Dose" value={m.dose} onChange={(e) => setM({ ...m, dose: e.target.value })} placeholder="1 g" /></div>
          <div style={{ width: 120 }}><Select label="Route" value={m.route} onChange={(e) => setM({ ...m, route: e.target.value })} options={['Oral', 'IV', 'IM', 'SC', 'Nebulisation', 'Topical']} /></div>
          <div style={{ width: 150 }}><Select label="How often" value={m.freq} onChange={(e) => setM({ ...m, freq: e.target.value })} options={['Once a day', 'Twice a day', 'Three times a day', 'Every 6 hours', 'Every 8 hours', 'When needed (SOS)', 'Once only (STAT)']} /></div>
          <button className="btn" onClick={addMed}><PillIcon /> Add</button>
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: 8 }}>Doctor’s and nurses’ notes</h3>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}><Textarea label="Today’s note (rounds, progress, plan)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Afebrile, chest clear, continue IV antibiotics, plan discharge tomorrow" /></div>
          <button className="btn primary" onClick={addNote}><ClipboardPen /> Add note</button>
        </div>
        <div className="ipd-notes">
          {notes.length ? notes.slice(0, 30).map((n) => (
            <div key={n.id} className={`ipd-note ${n.kind}`}>
              <span className="small muted">{fmtDate(n.at.slice(0, 10))} {t(n.at)} · {n.by}</span>
              <div>{n.kind === 'given' ? `💊 Given: ${n.text}` : n.text}</div>
            </div>
          )) : <p className="small muted">No notes yet.</p>}
        </div>
      </div>
    </div>
  )
}

/* ---------------- Discharge summary ---------------- */

export function DischargeForm({ adm, onDone, onCancel, lines, paid }) {
  const { tid, list } = useTenant()
  const meds = (adm.meds || []).filter((x) => !x.stopped).map((x) => `${x.name} ${x.dose} · ${x.freq}`).join('\n')
  const lastNote = list('ipdnotes').filter((n) => n.admissionId === adm.id && n.kind === 'note').sort((a, b) => b.at.localeCompare(a.at))[0]
  const [f, setF] = useState({ diagnosis: adm.reason || '', course: lastNote?.text || '', condition: 'Stable', medicines: meds, advice: '', followUp: '', ...adm.summary })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const total = linesTotal(lines)
  const discharge = () => {
    if (!f.diagnosis.trim()) return toast('Write the final diagnosis')
    db.update(tid, 'admissions', adm.id, { status: 'discharged', dischargeDate: today(), summary: f })
    const b = db.add(tid, 'bills', { patientId: adm.patientId, date: today(), source: 'IPD', ref: adm.id, items: lines.map(({ desc, qty, rate }) => ({ desc, qty, rate })), discount: 0, paid: Math.min(paid, total), mode: 'Advance', note: paid ? `Advance ${money(paid)} adjusted` : '' })
    if (f.followUp) {
      db.add(tid, 'appointments', { patientId: adm.patientId, doctorId: adm.doctorId, date: f.followUp, time: '11:00', reason: 'Follow-up after discharge', status: 'scheduled', type: 'OPD' })
    }
    toast(`Discharged. Final bill ${b.id}: ${money(total)}${paid ? `, advance ${money(Math.min(paid, total))} adjusted` : ''}.`)
    onDone({ ...adm, status: 'discharged', dischargeDate: today(), summary: f })
  }
  return (
    <div className="stack" style={{ gap: 10 }}>
      <h3>Discharge summary</h3>
      <Input label="Final diagnosis" value={f.diagnosis} onChange={set('diagnosis')} />
      <Textarea label="Treatment given and course in hospital" rows={3} value={f.course} onChange={set('course')} placeholder="Procedures done, response to treatment, key investigations" />
      <div className="grid g2">
        <Select label="Condition at discharge" value={f.condition} onChange={set('condition')} options={['Stable', 'Improved', 'Recovered', 'Referred to higher centre', 'Discharged against medical advice (DAMA)', 'Expired']} />
        <Input label="Follow-up visit" type="date" value={f.followUp} onChange={set('followUp')} />
      </div>
      <Textarea label="Medicines to continue at home" rows={3} value={f.medicines} onChange={set('medicines')} />
      <Textarea label="Advice (diet, activity, warning signs)" rows={2} value={f.advice} onChange={set('advice')} placeholder="e.g. Soft diet, no heavy lifting for 2 weeks, come back if fever or bleeding" />
      <div className="row between" style={{ fontWeight: 700 }}><span>Final bill {paid ? `(advance ${money(paid)} adjusted)` : ''}</span><span className="tabular">{money(total)}{paid ? ` · balance ${money(Math.max(0, total - paid))}` : ''}</span></div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onCancel}>Back</button>
        <button className="btn primary" onClick={discharge}><FileText /> Discharge and print summary</button>
      </div>
    </div>
  )
}

export function DischargeSummaryDoc({ adm, onClose }) {
  const { tenant, patient, staff, list } = useTenant()
  const p = patient(adm.patientId)
  const bed = list('beds').find((b) => b.id === adm.bedId)
  const s = adm.summary || {}
  const d = staff(adm.doctorId)
  return (
    <DocModal title={`Discharge summary · ${p?.name}`} onClose={onClose}>
      <div className="sheet">
        <SheetHead tenant={tenant} title="Discharge summary" sub={`${adm.id} · ${fmtDate(adm.dischargeDate || today())}`} />
        <div className="meta">
          <div><span className="muted">Patient:</span> <strong>{p?.name}</strong></div>
          <div><span className="muted">UHID:</span> {p?.id}</div>
          <div><span className="muted">Age / Sex:</span> {p?.dob ? `${age(p.dob)} y` : '–'} / {p?.gender || '–'}</div>
          <div><span className="muted">Ward / bed:</span> {bed ? `${bed.ward} · ${bed.number}` : '–'}</div>
          <div><span className="muted">Admitted:</span> {fmtDate(adm.admitDate)}</div>
          <div><span className="muted">Discharged:</span> {fmtDate(adm.dischargeDate)}</div>
          <div><span className="muted">Consultant:</span> {d?.name}{d?.dept ? ` · ${d.dept}` : ''}</div>
          <div><span className="muted">Allergies:</span> {p?.allergies || 'None known'}</div>
        </div>
        <h4 className="sheet-h">Reason for admission</h4><p>{adm.reason}</p>
        <h4 className="sheet-h">Final diagnosis</h4><p>{s.diagnosis || '–'}</p>
        <h4 className="sheet-h">Treatment and course in hospital</h4><p style={{ whiteSpace: 'pre-line' }}>{s.course || '–'}</p>
        <h4 className="sheet-h">Condition at discharge</h4><p>{s.condition || '–'}</p>
        <h4 className="sheet-h">Medicines to continue</h4><p style={{ whiteSpace: 'pre-line' }}>{s.medicines || '–'}</p>
        {s.advice && <><h4 className="sheet-h">Advice</h4><p style={{ whiteSpace: 'pre-line' }}>{s.advice}</p></>}
        {s.followUp && <><h4 className="sheet-h">Follow-up</h4><p>{fmtDate(s.followUp)} with {d?.name}</p></>}
        <p className="small muted">In an emergency, come to the hospital at once or call {tenant.phone}.</p>
        <div className="sign-row"><span>Patient / attendant</span><span>{d?.name || 'Consultant'}</span></div>
      </div>
    </DocModal>
  )
}

/* ---------------- OT schedule ---------------- */

const OT_STATUS = { scheduled: ['Scheduled', 'info'], 'in-progress': ['In OT', 'warn'], done: ['Done', 'ok'], cancelled: ['Cancelled', 'bad'] }

function OTForm({ onClose }) {
  const { tid, list, doctors } = useTenant()
  const [f, setF] = useState({ patientId: '', surgery: '', surgeonId: doctors()[0]?.id || '', anaesthetist: '', room: 'OT-1', date: today(), time: '09:00', mins: 60, anaesthesia: 'General', note: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const clash = list('ot').find((o) => o.status !== 'cancelled' && o.room === f.room && o.date === f.date && o.time === f.time)
  const save = () => {
    if (!f.patientId || !f.surgery.trim()) return toast('Pick the patient and write the surgery')
    db.add(tid, 'ot', { ...f, surgery: f.surgery.trim(), mins: +f.mins || 60, status: 'scheduled' })
    toast(`Surgery booked in ${f.room} on ${fmtDate(f.date)} at ${fmtTime(f.time)}`)
    onClose()
  }
  return (
    <Modal title="Book the OT" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}><Scissors /> Book</button></>}>
      <Select label="Patient" value={f.patientId} onChange={set('patientId')} options={[{ value: '', label: 'Pick a patient' }, ...list('patients').map((p) => ({ value: p.id, label: `${p.name} · ${p.id}` }))]} />
      <Input label="Surgery" value={f.surgery} onChange={set('surgery')} placeholder="e.g. Laparoscopic cholecystectomy" />
      <div className="grid g2">
        <Select label="Surgeon" value={f.surgeonId} onChange={set('surgeonId')} options={doctors().map((d) => ({ value: d.id, label: `${d.name} · ${d.dept || ''}` }))} />
        <Input label="Anaesthetist" value={f.anaesthetist} onChange={set('anaesthetist')} placeholder="Name" />
        <Select label="Theatre" value={f.room} onChange={set('room')} options={['OT-1', 'OT-2', 'Minor OT', 'Cath lab', 'Labour room']} />
        <Select label="Anaesthesia" value={f.anaesthesia} onChange={set('anaesthesia')} options={['General', 'Spinal', 'Epidural', 'Regional block', 'Local', 'Sedation']} />
        <Input label="Date" type="date" value={f.date} onChange={set('date')} />
        <Input label="Start time" type="time" value={f.time} onChange={set('time')} />
        <Input label="Expected time (minutes)" type="number" value={f.mins} onChange={set('mins')} />
      </div>
      {clash && <p className="small" style={{ color: 'var(--bad)', margin: 0 }}>{f.room} already has a surgery booked at this time.</p>}
      <Textarea label="Notes (consent, blood arranged, implants)" rows={2} value={f.note} onChange={set('note')} />
    </Modal>
  )
}

export function OTPage() {
  const { tid, list, patient, staff, base } = useTenant()
  const nav = useNavigate()
  const [date, setDate] = useState(today())
  const [add, setAdd] = useState(false)
  const all = list('ot')
  const rows = all.filter((o) => o.date === date).sort((a, b) => (a.room + a.time).localeCompare(b.room + b.time))
  const week = all.filter((o) => o.date >= today() && daysBetween(today(), o.date) < 7 && o.status !== 'cancelled')
  const mark = (o, status) => db.update(tid, 'ot', o.id, { status, [`${status}At`]: new Date().toISOString() })
  return (
    <>
      <PageHead title="OT schedule" sub="Operation theatre bookings by day and theatre">
        <button className="btn primary" onClick={() => setAdd(true)}><Plus /> Book the OT</button>
      </PageHead>
      <div className="grid g4">
        <Stat label="Surgeries this day" value={rows.filter((o) => o.status !== 'cancelled').length} />
        <Stat label="In OT now" value={all.filter((o) => o.status === 'in-progress').length} />
        <Stat label="Done this day" value={rows.filter((o) => o.status === 'done').length} />
        <Stat label="Next 7 days" value={week.length} sub="Booked surgeries" />
      </div>
      <div className="row"><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 170 }} />{date !== today() && <button className="btn sm" onClick={() => setDate(today())}>Today</button>}</div>
      <Card>
        <Table rows={rows} empty="No surgeries booked on this day."
          cols={[
            { label: 'Time', render: (o) => <><div className="cell-main tabular">{fmtTime(o.time)}</div><div className="cell-sub">{o.mins} min · {o.room}</div></> },
            { label: 'Patient', render: (o) => <><a href="#" className="cell-main" onClick={(e) => { e.preventDefault(); nav(`${base}/patients/${o.patientId}`) }}>{patient(o.patientId)?.name}</a><div className="cell-sub">{o.patientId}</div></> },
            { label: 'Surgery', render: (o) => <><div>{o.surgery}</div><div className="cell-sub">{o.anaesthesia} anaesthesia</div></> },
            { label: 'Team', render: (o) => <><div>{staff(o.surgeonId)?.name}</div><div className="cell-sub">{o.anaesthetist ? `Anaesthetist: ${o.anaesthetist}` : ''}</div></> },
            { label: 'Status', render: (o) => { const [l, t] = OT_STATUS[o.status]; return <span className={`pill ${t}`}>{l}</span> } },
            { label: '', render: (o) => (
              <div className="row" style={{ gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                {o.status === 'scheduled' && <><button className="btn sm primary" onClick={() => mark(o, 'in-progress')}>Start</button><button className="btn sm ghost" onClick={() => mark(o, 'cancelled')}>Cancel</button></>}
                {o.status === 'in-progress' && <button className="btn sm primary" onClick={() => mark(o, 'done')}><Check /> Done</button>}
              </div>
            ) },
          ]} />
      </Card>
      {add && <OTForm onClose={() => setAdd(false)} />}
    </>
  )
}

/* ---------------- Insurance and Ayushman Bharat claims ---------------- */

const CLAIM_STEPS = [['preauth', 'Pre-auth sent', 'warn'], ['approved', 'Pre-auth approved', 'info'], ['submitted', 'Claim submitted', 'info'], ['query', 'Query raised', 'bad'], ['settled', 'Settled', 'ok'], ['rejected', 'Rejected', 'bad']]
const CLAIM = Object.fromEntries(CLAIM_STEPS.map(([k, l, t]) => [k, [l, t]]))

function ClaimForm({ onClose }) {
  const { tid, list } = useTenant()
  const [f, setF] = useState({ patientId: '', admissionId: '', scheme: 'Ayushman Bharat (PM-JAY)', payer: '', cardNo: '', claimed: '', note: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const adms = list('admissions').filter((a) => a.patientId === f.patientId)
  const save = () => {
    if (!f.patientId || !(+f.claimed > 0)) return toast('Pick the patient and enter the amount')
    db.add(tid, 'claims', { ...f, claimed: +f.claimed, approved: 0, status: 'preauth', date: today(), history: [{ status: 'preauth', date: today() }] })
    toast('Claim added')
    onClose()
  }
  return (
    <Modal title="New insurance claim" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}><ShieldCheck /> Save</button></>}>
      <Select label="Patient" value={f.patientId} onChange={set('patientId')} options={[{ value: '', label: 'Pick a patient' }, ...list('patients').map((p) => ({ value: p.id, label: `${p.name} · ${p.id}` }))]} />
      {adms.length > 0 && <Select label="Admission" value={f.admissionId} onChange={set('admissionId')} options={[{ value: '', label: 'Not linked' }, ...adms.map((a) => ({ value: a.id, label: `${fmtDate(a.admitDate)} · ${a.reason}` }))]} />}
      <div className="grid g2">
        <Select label="Scheme" value={f.scheme} onChange={set('scheme')} options={['Ayushman Bharat (PM-JAY)', 'State health scheme', 'CGHS', 'ECHS', 'Private insurance (TPA)', 'Corporate']} />
        <Input label="Insurer / TPA" value={f.payer} onChange={set('payer')} placeholder="e.g. Star Health, Medi Assist" />
        <Input label="Card / policy number" value={f.cardNo} onChange={set('cardNo')} />
        <Input label="Amount claimed (₹)" inputMode="numeric" value={f.claimed} onChange={set('claimed')} />
      </div>
      <Textarea label="Notes (package code, documents sent)" rows={2} value={f.note} onChange={set('note')} />
    </Modal>
  )
}

export function ClaimsPage() {
  const { tid, list, patient, base } = useTenant()
  const nav = useNavigate()
  const [add, setAdd] = useState(false)
  const claims = list('claims').sort((a, b) => b.date.localeCompare(a.date))
  const open = claims.filter((c) => !['settled', 'rejected'].includes(c.status))
  const move = (c, status) => {
    const approved = (status === 'settled' || status === 'approved') && !c.approved ? c.claimed : c.approved
    db.update(tid, 'claims', c.id, { status, approved, history: [...(c.history || []), { status, date: today() }] })
  }
  const next = { preauth: ['approved', 'rejected'], approved: ['submitted'], submitted: ['settled', 'query', 'rejected'], query: ['submitted'] }
  return (
    <>
      <PageHead title="Insurance claims" sub="Ayushman Bharat, state schemes, CGHS and private insurance (TPA)">
        <button className="btn primary" onClick={() => setAdd(true)}><Plus /> New claim</button>
      </PageHead>
      <div className="grid g4">
        <Stat label="Open claims" value={open.length} />
        <Stat label="Amount pending" value={money(open.reduce((s, c) => s + c.claimed, 0))} />
        <Stat label="Settled" value={money(claims.filter((c) => c.status === 'settled').reduce((s, c) => s + (c.approved || 0), 0))} />
        <Stat label="Queries to answer" value={claims.filter((c) => c.status === 'query').length} />
      </div>
      <Card>
        <Table rows={claims} empty="No claims yet. Add one when a patient is admitted under a scheme or insurance."
          cols={[
            { label: 'Patient', render: (c) => <><a href="#" className="cell-main" onClick={(e) => { e.preventDefault(); nav(`${base}/patients/${c.patientId}`) }}>{patient(c.patientId)?.name}</a><div className="cell-sub">{c.cardNo || c.patientId}</div></> },
            { label: 'Scheme', render: (c) => <><div>{c.scheme}</div><div className="cell-sub">{c.payer}</div></> },
            { label: 'Claimed', num: true, render: (c) => money(c.claimed) },
            { label: 'Approved (₹)', num: true, render: (c) => (['approved', 'submitted', 'query', 'settled'].includes(c.status) ? <input className="input" style={{ width: 110, textAlign: 'right' }} inputMode="numeric" defaultValue={c.approved || ''} onBlur={(e) => db.update(tid, 'claims', c.id, { approved: +e.target.value || 0 })} /> : '–') },
            { label: 'Status', render: (c) => { const [l, t] = CLAIM[c.status]; return <><span className={`pill ${t}`}>{l}</span><div className="cell-sub">since {fmtDate((c.history || []).slice(-1)[0]?.date || c.date)}</div></> } },
            { label: '', render: (c) => <div className="row" style={{ gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>{(next[c.status] || []).map((s) => <button key={s} className={`btn sm ${s === 'rejected' ? 'ghost' : ''}`} onClick={() => move(c, s)}>{CLAIM[s][0]}</button>)}</div> },
          ]} />
      </Card>
      {add && <ClaimForm onClose={() => setAdd(false)} />}
    </>
  )
}
